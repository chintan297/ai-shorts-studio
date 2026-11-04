# Shorts Studio: AI YouTube multi-channel content manager

One simple web app to run six YouTube Shorts channels from a **prepared 90-day library**
(6 channels × 90 days × 2 videos = 1,080 packages). Every video already has its storyboard, image
prompt, a single **Google Flow video + audio prompt**, thumbnail prompt and complete YouTube SEO.
You copy, generate externally, upload manually, and record the result here. Progress syncs across
your devices through Supabase. There's no login, and devices are paired with one-time codes.

> The app never uploads, schedules or edits anything on YouTube. It prepares content and tracks what you do.

## Daily workflow

Dashboard → open a channel's **next available video** →
**Copy Image Prompt** → generate the image (any image AI) →
**Copy Google Flow Prompt** → generate the 8-second video in Flow (Veo 3.x, 9:16, Frames-to-Video with your image) →
generate the thumbnail from the **Thumbnail Prompt** → tick the **checklist** →
copy **title / description / tags** → upload in YouTube Studio →
**Upload Details → Mark Uploaded…** (paste the URL and confirm) → the next video unlocks.

Rules the app enforces (in the database, not just the UI):

- Each channel has its own sequence. A video unlocks only when every earlier one is **Uploaded** or **Skipped**.
  Failed uploads, drafts, copied prompts and generated videos never unlock anything.
- A URL alone never marks a video uploaded; that needs the explicit confirmation dialog.
- Skipping never deletes content, and skipped videos never count as uploaded or completed.
  **Restore** brings back the previous status.
- One YouTube video can only be recorded against one planned video.

## Quick start (local-only mock mode)

```bash
nvm use 22          # Node 22+ (works on 24)
npm install
npm run dev         # http://localhost:3000
```

Without Supabase env vars the app runs in **local-only mode**. Progress is stored in this browser's
IndexedDB, and pairing and cloud sync are disabled (a banner says so). This is handy for trying the UI.

## Connecting Supabase (multi-device sync)

1. Create a free project at [supabase.com](https://supabase.com).
2. **Authentication → Sign In / Providers → enable “Allow anonymous sign-ins”.** Each device gets an anonymous identity.
   - Optional: add CAPTCHA protection (Auth → Attack Protection) if you deploy publicly.
3. Copy `.env.example` to `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (from Project Settings → API; the publishable key works too).
4. Push the database schema and deploy the pairing function:
   ```bash
   npx supabase login                       # once, opens the browser
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push                     # applies supabase/migrations/*
   npx supabase secrets set PAIRING_PEPPER=$(openssl rand -hex 32)
   npx supabase functions deploy pairing --no-verify-jwt   # the function verifies the JWT itself
   ```
5. `npm run test:db` checks RLS isolation, pairing, revocation, idempotency and the sequence guard against your project.
   It uses throwaway anonymous users. Pairing is rate-limited per IP, so wait 15 minutes before pairing real devices or re-running it.
6. `npm run build && npm start`, then open the app on your first device. A private workspace is created automatically.

**Connect another device:** on a connected device open **Settings → Generate Pairing Code**. On the new device open
**Settings (or the first-run banner) → Connect Existing Workspace** and type the code. The code expires in 15 minutes and works once.

To use the app from your phone, deploy it to any Node host, for example Vercel (`vercel deploy`). Then add the two env vars there.

## Shared workspace mode (no pairing code)

Set `NEXT_PUBLIC_SHARED_WORKSPACE=true` (and apply migration `20261104010000_shared_workspace.sql`). Every device that opens
the site then joins the one shared workspace automatically and sees the same up-to-date progress. Trade-off: anyone who
has the site address can read and change that progress, so don't share the address. Without the variable, the secure
pairing-code flow described above is used (the acceptance tests in `tests/e2e` run in that mode).

## Architecture

```
Static content (content-src seeds + templates → data/*.json at build time)
  → Next.js 16 App Router, statically prerendered pages
  → Sync engine (in-memory state + IndexedDB snapshot + IndexedDB outbox)
  → Supabase: anonymous auth per device · Postgres + RLS · apply_ops RPC (state machine) · Realtime · Edge Function "pairing"
```

| Path | What |
|---|---|
| `content-src/templates/*.ts` | Per-channel prompt templates, character identity bibles, negatives, SEO rules |
| `content-src/seeds/<channel>/days-*.ts` | 180 hand-written video seeds per channel (see `content-src/seeds/AUTHORING.md`) |
| `scripts/build-content.mts` | Composes, validates, de-duplicates and quality-scores everything → `data/` |
| `data/` | The static library (`content/<channel>.json`, `index.json`, `channels.json`, `category-recommendations.json`) |
| `src/lib/progress/transitions.ts` | Client copy of the state machine (optimistic UI and mock mode) |
| `supabase/migrations/*_init.sql` | Tables, RLS, the authoritative state machine `_apply_op`, pairing, import and reset |
| `supabase/functions/pairing` | One-time pairing codes (HMAC-hashed, 15-minute TTL, single use, rate-limited) |
| `src/lib/sync/engine.ts` | Offline queue, ordered flush with backoff, realtime merge by version, revocation handling |

**Sync guarantees:**
- Every change is applied instantly on screen, saved to an IndexedDB outbox, and sent in order to `apply_ops`.
- Ops are idempotent (each has an `op_id`), so retries never duplicate history.
- Concurrent edits merge per field (last writer wins by timestamp), and the state-machine guards stop an old offline
  "skip" from overriding an upload.
- The status chip shows **Synced** only after the server confirms. Refused ops appear under **Settings → Sync** and are never silently dropped.

**Security:**
- Clients can only read their own workspace (RLS via `current_workspace_id()`), and all writes go through SECURITY DEFINER RPCs.
- Pairing tables aren't accessible to clients at all, and the service-role key exists only inside the Edge Function.
- Removing a device revokes its membership. RLS then denies it immediately, and the device wipes its local copy.

## Editing content

Each video is one seed. The channel template turns the seed into the full package, so improving a template after your
Flow tests improves all 180 videos of that channel at once.

```bash
npm run content:build                 # rebuild data/ (fails on schema, duplicate or quality errors)
npm run content:build -- --channel ai-facts --check --warnings
```

The build enforces a set of quality gates:
- Unique titles, and concept overlap of 60% or less within a channel.
- Voice-over of 20 words or fewer and 3 words/s or fewer, inside 0–8 s.
- Copyright-safe music wording and named sources for facts.
- Correct made-for-kids and AI-disclosure settings.
- A quality score of 70 or more with every mandatory check passing.

Custom prompt edits made in the app are stored per video (versioned, with testing status, feedback and approval). The static library is never overwritten.

## Testing

```bash
npm test               # unit: state machine, sequence, stats, backup, library integrity, offline engine
npm run typecheck && npm run lint
npm run test:db        # cloud security checks (needs .env.local)
npm run build && npm run test:e2e   # acceptance tests 1–8 with two browser "devices" (uses installed Google Chrome)
```

## Honest limitations

- **The prompts are untested in Google Flow until you run them.** They are marked template v1 and "Untested". Record results
  in each prompt's testing panel, and edit the templates when a pattern fails.
- **Google Flow / Veo:** clips are about 8 s, so 10 s needs Extend. Generated Hindi speech and lip-sync quality aren't guaranteed,
  which is why most voice-overs are off-screen. Some Flow modes may output silent video.
- **Audio licensing** of generated music can't be verified by this app. The upload confirmation asks you to check it.
- **Facts** cite a named source but should still be verified before publishing (the Overview tab shows the fact and source).
- No views, subscribers or monetization are guaranteed. Analytics are only what you enter by hand.
# ai-shorts-studio
