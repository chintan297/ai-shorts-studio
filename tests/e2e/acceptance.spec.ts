/**
 * Final acceptance tests 1–8 from the project brief, run end-to-end against Supabase.
 * "Laptop" and "mobile" are separate browser contexts, i.e. separate devices with their own
 * storage, anonymous identity and IndexedDB.
 */
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";

const CH = "future-ai";
const vid = (day: number, n: number) => `${CH}-d${String(day).padStart(3, "0")}-v${n}`;
const videoUrl = (day: number, n: number) => `/channels/${CH}/videos/${vid(day, n)}`;

async function waitSynced(page: Page) {
  await expect(page.getByTestId("sync-status").first()).toHaveAttribute("data-state", "synced", { timeout: 30_000 });
}

async function newDevice(browser: Browser, kind: "laptop" | "mobile", storageState?: Awaited<ReturnType<BrowserContext["storageState"]>>) {
  const ctx = await browser.newContext({
    ...(kind === "mobile"
      ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" }
      : { viewport: { width: 1280, height: 900 } }),
    permissions: ["clipboard-read", "clipboard-write"],
    storageState,
  });
  return ctx;
}

async function confirmDialog(page: Page, button: string, reason?: string) {
  const dialog = page.getByRole("alertdialog");
  if (reason) await dialog.getByLabel(/reason/i).fill(reason);
  await dialog.getByRole("button", { name: button }).click();
  await expect(dialog).toBeHidden();
}

async function recordUpload(page: Page, url: string) {
  await page.getByRole("tab", { name: "Upload Details" }).click();
  await page.getByTestId("mark-uploaded").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByTestId("dialog-youtube-url").fill(url);
  for (const key of ["uploaded", "settings", "audio"]) await dialog.getByTestId(`confirm-${key}`).click();
  await dialog.getByTestId("confirm-upload-button").click();
  await expect(dialog).toBeHidden();
}

async function pair(laptop: Page, other: Page) {
  await laptop.goto("/settings");
  await waitSynced(laptop);
  await laptop.getByTestId("generate-pairing-code").click();
  const code = (await laptop.getByTestId("pairing-code").textContent())!.trim();
  await other.goto("/settings");
  await waitSynced(other);
  await other.getByRole("button", { name: "Connect Existing Workspace" }).first().click();
  const dialog = other.getByRole("dialog");
  await dialog.getByLabel("Pairing code").fill(code);
  await dialog.getByRole("button", { name: "Connect device" }).click();
  await expect(dialog).toBeHidden({ timeout: 30_000 });
  await waitSynced(other);
}

test.describe.serial("acceptance", () => {
  let laptopCtx: BrowserContext;
  let mobileCtx: BrowserContext;
  let laptop: Page;
  let mobile: Page;

  test.afterAll(async () => {
    await laptopCtx?.close();
    await mobileCtx?.close();
  });

  test("1. first device: workspace is created automatically, no login", async ({ browser }) => {
    laptopCtx = await newDevice(browser, "laptop");
    laptop = await laptopCtx.newPage();
    await laptop.goto("/");
    await expect(laptop.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(laptop.getByText(/sign in|log in|password/i)).toHaveCount(0);
    await waitSynced(laptop);

    // Complete Day 1 Video 1: upload confirmation.
    await laptop.goto(videoUrl(1, 1));
    await waitSynced(laptop);
    await recordUpload(laptop, "https://youtube.com/shorts/E2eTest0001");
    await expect(laptop.getByTestId("video-badges")).toContainText("Uploaded");

    // Skip Day 1 Video 2.
    await laptop.goto(videoUrl(1, 2));
    await laptop.getByTestId("skip-video").click();
    await confirmDialog(laptop, "Skip video", "acceptance test 1");
    await expect(laptop.getByTestId("video-badges")).toContainText("Skipped");
    await waitSynced(laptop); // "Synced" only appears after the cloud confirmed

    // Saved in the cloud: a fresh load shows the same state.
    await laptop.reload();
    await waitSynced(laptop);
    await expect(laptop.getByTestId("video-badges")).toContainText("Skipped");
  });

  test("2. second device connects with a pairing code and sees cloud progress", async ({ browser }) => {
    mobileCtx = await newDevice(browser, "mobile");
    mobile = await mobileCtx.newPage();
    await pair(laptop, mobile);

    await mobile.goto(`/channels/${CH}`);
    await waitSynced(mobile);
    await expect(mobile.getByTestId(`video-row-${vid(1, 1)}`)).toHaveAttribute("data-lock", "uploaded");
    await expect(mobile.getByTestId(`video-row-${vid(1, 2)}`)).toHaveAttribute("data-lock", "skipped");
    await expect(mobile.getByTestId(`video-row-${vid(2, 1)}`)).toHaveAttribute("data-lock", "current");
  });

  test("3. realtime: skipping Day 2 on mobile appears on the laptop", async () => {
    await laptop.goto(`/channels/${CH}`);
    await waitSynced(laptop);
    await mobile.goto(`/channels/${CH}`);
    await mobile.getByTestId("skip-day-2").first().click();
    await confirmDialog(mobile, "Skip day", "realtime test");
    await waitSynced(mobile);
    // No reload on the laptop.
    await expect(laptop.getByTestId("day-status-2")).toHaveText("Skipped", { timeout: 20_000 });
    await expect(laptop.getByTestId(`video-row-${vid(3, 1)}`)).toHaveAttribute("data-lock", "current");
  });

  test("4. offline: a change made offline is queued and synced on reconnect", async () => {
    await mobile.goto(videoUrl(3, 1));
    await waitSynced(mobile);
    await mobileCtx.setOffline(true);
    await mobile.getByTestId("skip-video").click();
    await confirmDialog(mobile, "Skip video", "offline test");
    await expect(mobile.getByTestId("sync-status").first()).toHaveAttribute("data-state", "offline");
    await expect(mobile.getByTestId("sync-status").first()).toContainText("1");
    await expect(mobile.getByTestId("video-badges")).toContainText("Skipped");

    await mobileCtx.setOffline(false);
    await mobile.evaluate(() => window.dispatchEvent(new Event("online")));
    await waitSynced(mobile);
    await laptop.goto(`/channels/${CH}`);
    await expect(laptop.getByTestId(`video-row-${vid(3, 1)}`)).toHaveAttribute("data-lock", "skipped");
  });

  test("5. manual upload: copy details, paste URL, confirm, next video unlocks", async () => {
    await laptop.goto(videoUrl(3, 2));
    await waitSynced(laptop);
    await laptop.getByRole("button", { name: "Copy YouTube Title" }).click();
    const title = await laptop.evaluate(() => navigator.clipboard.readText());
    await expect(laptop.getByTestId("video-title")).toHaveText(title);
    await laptop.getByRole("button", { name: "Copy Description" }).click();
    await laptop.getByRole("button", { name: "Copy Tags" }).click();

    // A URL alone doesn't mark it uploaded.
    await laptop.getByRole("tab", { name: "Upload Details" }).click();
    await laptop.getByTestId("youtube-url").fill("https://youtube.com/shorts/E2eTest0002");
    await laptop.getByRole("button", { name: "Save details" }).click();
    await waitSynced(laptop);
    await expect(laptop.getByTestId("video-badges")).toContainText("Not Uploaded");

    await recordUpload(laptop, "https://youtube.com/shorts/E2eTest0002");
    await expect(laptop.getByTestId("video-badges")).toContainText("Uploaded");
    await waitSynced(laptop);
    await laptop.goto(`/channels/${CH}`);
    await expect(laptop.getByTestId(`video-row-${vid(4, 1)}`)).toHaveAttribute("data-lock", "current");
  });

  test("6. failed upload keeps the next video locked", async () => {
    await laptop.goto(videoUrl(4, 1));
    await waitSynced(laptop);
    await laptop.getByRole("tab", { name: "Upload Details" }).click();
    await laptop.getByTestId("mark-upload-failed").click();
    await confirmDialog(laptop, "Mark failed", "network error during upload");
    await expect(laptop.getByTestId("video-badges")).toContainText("Upload Failed");
    await waitSynced(laptop);
    await laptop.goto(`/channels/${CH}`);
    await expect(laptop.getByTestId(`video-row-${vid(4, 1)}`)).toHaveAttribute("data-lock", "current");
    await expect(laptop.getByTestId(`video-row-${vid(4, 2)}`)).toHaveAttribute("data-lock", "locked");
  });

  test("7. refresh and browser restart keep progress", async ({ browser }) => {
    await laptop.reload();
    await waitSynced(laptop);
    await expect(laptop.getByTestId("stat-uploaded")).toContainText("2");
    const state = await laptopCtx.storageState({ indexedDB: true });
    await laptopCtx.close();
    laptopCtx = await newDevice(browser, "laptop", state);
    laptop = await laptopCtx.newPage();
    await laptop.goto(`/channels/${CH}`);
    await waitSynced(laptop);
    await expect(laptop.getByTestId("stat-uploaded")).toContainText("2");
    await expect(laptop.getByTestId("stat-skipped")).toContainText("4");
    await expect(laptop.getByTestId(`video-row-${vid(4, 1)}`)).toHaveAttribute("data-lock", "current");
  });

  test("8. security: a revoked device is denied", async ({ browser }) => {
    test.setTimeout(240_000);
    const tabletCtx = await newDevice(browser, "laptop");
    const tablet = await tabletCtx.newPage();
    await pair(laptop, tablet);
    await tablet.goto("/settings");
    await tablet.getByLabel("This device’s name").fill("Tablet E2E");
    await tablet.getByRole("button", { name: "Save" }).nth(1).click();
    await expect(tablet.getByText("Device renamed")).toBeVisible();

    await laptop.goto("/settings");
    await waitSynced(laptop);
    const row = laptop.locator('[data-testid^="device-"]', { hasText: "Tablet E2E" });
    await row.getByRole("button", { name: "Remove" }).click();
    await confirmDialog(laptop, "Remove device");

    await tablet.reload();
    await expect(tablet.getByTestId("revoked-screen")).toBeVisible({ timeout: 30_000 });
    await expect(tablet.getByText(/Day 1 · Video 1/)).toHaveCount(0);
    await tabletCtx.close();
  });
});
