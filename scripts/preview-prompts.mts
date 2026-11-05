import { TEMPLATES } from "../content-src/templates";
import { composePackage } from "../src/lib/content/compose";
const chans = ["future-ai", "ai-fashion", "galaxy-space", "kids-learning", "ai-facts", "ai-animals"] as const;
const show = process.argv[2]; const showIdx = Number(process.argv[3] ?? 0);
for (const ch of chans) {
  const all: Array<{ n: number; duo: boolean }> = []; let idx = 0;
  // Same as the build: inject the Latin-script thumbnail headlines if the channel has them.
  let headlines: string[] = [];
  try {
    headlines = (await import(`../content-src/thumbnail-text/${ch}.ts`)).default;
  } catch {
    headlines = [];
  }
  for (const f of ["001-015", "016-030", "031-045", "046-060", "061-075", "076-090"]) {
    const m = await import(`../content-src/seeds/${ch}/days-${f}.ts`);
    for (const raw of m.default) {
      const s = headlines[idx] ? { ...raw, thumbnail: { ...raw.thumbnail, overlay: headlines[idx] } } : raw;
      const p = composePackage(TEMPLATES[ch], s, idx);
      if (show === ch && idx === showIdx) console.log(`\n===== ${p.id} FLOW (${p.flowPrompt.prompt.length} chars) =====\n${p.flowPrompt.prompt}\n\n===== THUMBNAIL =====\n${p.thumbnail.prompt}\n`);
      all.push({ n: p.flowPrompt.prompt.length, duo: (s.characters?.length ?? 0) > 1 }); idx++;
    }
  }
  const ns = all.map((a) => a.n).sort((a, b) => a - b);
  console.log(`${ch.padEnd(13)} flow chars: min ${ns[0]} median ${ns[Math.floor(ns.length / 2)]} max ${ns.at(-1)} | duo max ${Math.max(0, ...all.filter((a) => a.duo).map((a) => a.n))}`);
}
