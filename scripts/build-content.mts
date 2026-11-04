/**
 * Builds the static 90-day content library.
 *
 *   npm run content:build                      # all channels, requires 180 seeds each, writes data/
 *   npm run content:build -- --channel ai-facts --check --allow-partial
 *
 * Flags:
 *   --channel <id>    only this channel (index.json is merged with existing entries)
 *   --check           validate only, write nothing
 *   --allow-partial   allow fewer than 180 seeds (pilot / work-in-progress)
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { TEMPLATES } from "../content-src/templates";
import { composePackage, withQuality, type UnscoredPackage } from "../src/lib/content/compose";
import {
  CHANNEL_IDS,
  VIDEOS_PER_CHANNEL,
  channelSchema,
  seedSchema,
  videoPackageSchema,
  type ChannelId,
  type VideoIndexEntry,
  type VideoPackage,
  type VideoSeed,
} from "../src/lib/content/schema";
import { MAX_SIMILARITY, scorePackage } from "../src/lib/quality/score";

const ROOT = path.resolve(import.meta.dirname, "..");
const SEEDS_DIR = path.join(ROOT, "content-src", "seeds");
const DATA_DIR = path.join(ROOT, "data");
const CONTENT_DIR = path.join(DATA_DIR, "content");

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const option = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const onlyChannel = option("--channel") as ChannelId | undefined;
const checkOnly = flag("--check");
const allowPartial = flag("--allow-partial");
if (onlyChannel && !CHANNEL_IDS.includes(onlyChannel)) {
  console.error(`Unknown channel "${onlyChannel}". Use one of: ${CHANNEL_IDS.join(", ")}`);
  process.exit(1);
}

const STOPWORDS = new Set(
  "a an the of in on at to and with for from by into over under is are its it this that as up down out off its their his her one two very slowly slow gently soft softly camera frame shot".split(
    " ",
  ),
);

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

async function loadSeeds(channelId: ChannelId): Promise<{ seeds: VideoSeed[]; errors: string[] }> {
  const dir = path.join(SEEDS_DIR, channelId);
  const errors: string[] = [];
  if (!existsSync(dir)) return { seeds: [], errors: [`No seed directory: ${dir}`] };
  const files = readdirSync(dir)
    .filter((f) => /^days-\d{3}-\d{3}\.ts$/.test(f))
    .sort();
  const seeds: VideoSeed[] = [];
  for (const file of files) {
    const [, fromDay] = /^days-(\d{3})-\d{3}\.ts$/.exec(file) ?? [];
    const expectedStart = (Number(fromDay) - 1) * 2;
    if (seeds.length !== expectedStart) {
      errors.push(`${channelId}/${file}: expected to start at seed #${expectedStart + 1}, but ${seeds.length} seeds came before it (each earlier file must contain exactly 30 seeds).`);
    }
    const mod = (await import(pathToFileURL(path.join(dir, file)).href)) as { default: unknown };
    const parsed = z.array(z.unknown()).safeParse(mod.default);
    if (!parsed.success) {
      errors.push(`${channelId}/${file}: default export must be an array of seeds`);
      continue;
    }
    parsed.data.forEach((raw, i) => {
      const result = seedSchema.safeParse(raw);
      if (!result.success) {
        const issues = result.error.issues.map((iss) => `${iss.path.join(".")}: ${iss.message}`).join("; ");
        errors.push(`${channelId}/${file} seed[${i}] (#${seeds.length + 1}): ${issues}`);
        seeds.push(raw as VideoSeed); // keep numbering stable
      } else {
        seeds.push(result.data);
      }
    });
  }
  return { seeds, errors };
}

interface ChannelResult {
  channelId: ChannelId;
  packages: VideoPackage[];
  errors: string[];
  warnings: string[];
}

async function buildChannel(channelId: ChannelId, allTitles: Map<string, string>): Promise<ChannelResult> {
  const tpl = TEMPLATES[channelId];
  const { seeds, errors } = await loadSeeds(channelId);
  const warnings: string[] = [];
  if (errors.length) return { channelId, packages: [], errors, warnings };

  if (seeds.length > VIDEOS_PER_CHANNEL) errors.push(`${channelId}: ${seeds.length} seeds, the maximum is ${VIDEOS_PER_CHANNEL}`);
  if (seeds.length < VIDEOS_PER_CHANNEL && !allowPartial) {
    errors.push(`${channelId}: only ${seeds.length}/${VIDEOS_PER_CHANNEL} seeds (use --allow-partial while authoring)`);
  }

  seeds.forEach((seed, i) => {
    if (tpl.requiresCharacters && !seed.characters?.length) errors.push(`${channelId} seed #${i + 1}: must reference a cast member in "characters"`);
    if (seed.characters && seed.characters.length > 2) errors.push(`${channelId} seed #${i + 1}: at most 2 characters per video`);
    if (tpl.forbiddenTerms?.length) {
      const text = JSON.stringify({ ...seed, audio: { ...seed.audio, music: "", sfx: [] } });
      for (const re of tpl.forbiddenTerms) {
        const hit = re.exec(text);
        if (hit) errors.push(`${channelId} seed #${i + 1}: content-policy term "${hit[0]}" is not allowed`);
      }
    }
  });
  if (errors.length) return { channelId, packages: [], errors, warnings };

  const unscored: UnscoredPackage[] = [];
  seeds.forEach((seed, i) => {
    try {
      unscored.push(composePackage(tpl, seed, i));
    } catch (err) {
      errors.push(`${channelId} seed #${i + 1}: ${(err as Error).message}`);
    }
  });
  if (errors.length) return { channelId, packages: [], errors, warnings };

  const tokenSets = seeds.map((s) => tokens(`${s.concept} ${s.subject} ${s.environment} ${s.action}`));
  const packages = unscored.map((pkg, i) => {
    const seed = seeds[i]!;
    let maxSimilarity = 0;
    let closest = -1;
    tokenSets.forEach((other, j) => {
      if (j === i) return;
      const sim = jaccard(tokenSets[i]!, other);
      if (sim > maxSimilarity) {
        maxSimilarity = sim;
        closest = j;
      }
    });
    if (maxSimilarity >= MAX_SIMILARITY) {
      errors.push(`${pkg.id}: too similar (${maxSimilarity.toFixed(2)}) to ${unscored[closest]?.id} — "${seed.concept}"`);
    }

    const titleKey = pkg.seo.title.trim().toLowerCase();
    const duplicateOf = allTitles.get(titleKey);
    if (duplicateOf) errors.push(`${pkg.id}: duplicate title "${pkg.seo.title}" (also ${duplicateOf})`);
    else allTitles.set(titleKey, pkg.id);

    const quality = scorePackage(pkg, {
      maxSimilarity,
      duplicateTitle: Boolean(duplicateOf),
      requiresFact: tpl.requiresFact(seed),
      hasCharacters: Boolean(tpl.permanentIdentity || seed.characters?.length),
    });
    for (const check of quality.checks) {
      if (check.passed) continue;
      const line = `${pkg.id} [${check.id}] ${check.label}${check.suggestion ? ` → ${check.suggestion}` : ""}`;
      if (check.mandatory) errors.push(line);
      else warnings.push(line);
    }
    if (!quality.approved && !quality.checks.some((c) => c.mandatory && !c.passed)) {
      errors.push(`${pkg.id}: quality score ${quality.score} is below the approval threshold`);
    }
    const full = withQuality(pkg, quality);
    const valid = videoPackageSchema.safeParse(full);
    if (!valid.success) {
      errors.push(`${pkg.id}: package schema — ${valid.error.issues.map((iss) => `${iss.path.join(".")}: ${iss.message}`).join("; ")}`);
    }
    return full;
  });

  return { channelId, packages, errors, warnings };
}

function indexEntry(pkg: VideoPackage): VideoIndexEntry {
  return {
    id: pkg.id,
    channelId: pkg.channelId,
    dayNumber: pkg.dayNumber,
    videoNumber: pkg.videoNumber,
    sequence: pkg.sequence,
    title: pkg.seo.title,
    concept: pkg.concept,
    category: pkg.category,
    plannedSlot: pkg.plannedSlot,
    qualityScore: pkg.quality.score,
  };
}

async function main() {
  const channelIds = onlyChannel ? [onlyChannel] : [...CHANNEL_IDS];
  const allTitles = new Map<string, string>();

  // When building one channel, seed the title registry from the other channels' committed output.
  if (onlyChannel && existsSync(path.join(CONTENT_DIR, "index.json"))) {
    const existing = JSON.parse(readFileSync(path.join(CONTENT_DIR, "index.json"), "utf8")) as VideoIndexEntry[];
    for (const entry of existing) {
      if (entry.channelId !== onlyChannel) allTitles.set(entry.title.trim().toLowerCase(), entry.id);
    }
  }

  const results: ChannelResult[] = [];
  for (const id of channelIds) results.push(await buildChannel(id, allTitles));

  let totalErrors = 0;
  for (const r of results) {
    const scores = r.packages.map((p) => p.quality.score);
    const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : "-";
    const min = scores.length ? Math.min(...scores) : "-";
    console.log(`\n■ ${r.channelId}: ${r.packages.length} packages · avg quality ${avg} · min ${min} · ${r.errors.length} errors · ${r.warnings.length} warnings`);
    for (const e of r.errors.slice(0, 60)) console.log(`  ✗ ${e}`);
    if (r.errors.length > 60) console.log(`  … ${r.errors.length - 60} more errors`);
    if (flag("--warnings")) for (const w of r.warnings) console.log(`  ! ${w}`);
    totalErrors += r.errors.length;
  }

  if (totalErrors > 0) {
    console.error(`\n✗ ${totalErrors} error(s). Nothing was written.`);
    process.exit(1);
  }
  if (checkOnly) {
    console.log("\n✓ Check passed (no files written).");
    return;
  }

  mkdirSync(CONTENT_DIR, { recursive: true });
  const channels = Object.values(TEMPLATES).map((t) => channelSchema.parse(t.channel));
  writeFileSync(path.join(DATA_DIR, "channels.json"), JSON.stringify(channels, null, 2) + "\n");

  const indexPath = path.join(CONTENT_DIR, "index.json");
  let index: VideoIndexEntry[] = [];
  if (onlyChannel && existsSync(indexPath)) {
    index = (JSON.parse(readFileSync(indexPath, "utf8")) as VideoIndexEntry[]).filter((e) => e.channelId !== onlyChannel);
  }
  for (const r of results) {
    writeFileSync(path.join(CONTENT_DIR, `${r.channelId}.json`), JSON.stringify(r.packages, null, 1) + "\n");
    index.push(...r.packages.map(indexEntry));
  }
  index.sort((a, b) => CHANNEL_IDS.indexOf(a.channelId) - CHANNEL_IDS.indexOf(b.channelId) || a.sequence - b.sequence);
  writeFileSync(indexPath, JSON.stringify(index) + "\n");

  // Make sure every channel has a (possibly empty) content file so the app can import it.
  for (const id of CHANNEL_IDS) {
    const file = path.join(CONTENT_DIR, `${id}.json`);
    if (!existsSync(file)) writeFileSync(file, "[]\n");
  }
  console.log(`\n✓ Wrote ${index.length} index entries and ${results.length} channel file(s) to data/.`);
}

await main();
