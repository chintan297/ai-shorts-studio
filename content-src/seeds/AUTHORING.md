# Seed authoring guide

Every video in the 90-day library comes from one **seed**: a hand-written object in
`content-src/seeds/<channel>/days-XXX-YYY.ts`. `npm run content:build` combines each seed with the
channel template (`content-src/templates/<channel>.ts`) to make the full package: storyboard,
image prompt, Google Flow video + audio prompt, thumbnail prompt and SEO. Then it validates,
de-duplicates and quality-scores every package.

Schema: `seedSchema` in `src/lib/content/schema.ts`. Quality checks: `src/lib/quality/score.ts`.
Reference examples: the first 3 seeds in each channel's `days-001-015.ts`.

## Files and ordering

- 6 files per channel: `days-001-015.ts`, `days-016-030.ts`, `days-031-045.ts`, `days-046-060.ts`,
  `days-061-075.ts`, `days-076-090.ts`.
- **Exactly 30 seeds per file.** The array order is day 1 video 1, day 1 video 2, day 2 video 1, and so on.
- Format: `import type { VideoSeed } from "@/lib/content/schema"; const seeds: VideoSeed[] = [ … ]; export default seeds;`
- Validate after each file: `npm run content:build -- --channel <id> --check --allow-partial`.
  When all 180 are done, run it again **without** `--allow-partial`. It must report 0 errors.

## Language

- Visual fields (concept, hook, subject, environment, action, payoff, camera, lighting, colorGrade, vfx,
  look, thumbnail.concept) are in **English**. Google Flow follows English best.
- Voice-over and dialogue `audio.lines[].text` are in **Hindi (Devanagari)**. Common English words
  (Hinglish: building, robot, planet, look, AI) are fine in Latin script.
- `seo.title`: Hinglish/Hindi, catchy but truthful, 15–70 characters including emoji. Use at most 1–2 emoji.
- `seo.altTitles`: 3 options that differ from the title and from each other. Mix one English, one Hindi
  and one Hinglish.
- `seo.summaryHi`: 1–2 natural Hindi sentences. `seo.summaryEn`: 1 English sentence that naturally
  contains the words of one primary keyword.
- `seo.engagementQuestion`: a Hinglish question (omit it only on the kids channel).

## The 8-second rule (Google Flow / Veo)

- One subject, one primary action, **one continuous shot**. No multi-scene stories, cuts or montages.
  It must be achievable in a single 8-second generation.
- `hook` = the first 2 s, a concrete striking visual that starts instantly (never "fade in" / "from black").
- `action` = 2–6 s. `payoff` = 6–8 s, ending in a clear final frame.
- Camera movement must be smooth: dolly, push-in, pull-back, orbit, crane, tracking, drone rise.
  Never handheld, shaky or whip-pan.
- **Voice limits:** at most 20 words in total; each line at most **3 words per second** of its window
  (aim for 2–2.5); lines don't overlap; first line starts at about 1.0–1.6 s; last line ends ≤ 7.5 s.
  Words are counted by spaces, so "…" and punctuation don't count.
- `audio.mode`: `voiceover` (off-screen narrator, preferred), `dialogue` (on-screen speech, use rarely)
  or `music-only` (lines = []).
- `audio.sfx`: 2–4 timed cues, one of them at ≤ 1.5 s.
- `audio.music`: mood + instruments only, e.g. "uplifting synth pads with a soft arpeggio".
  **Never** name songs, artists, films, games, "remix", "lyrics", "in the style of",
  "Bollywood song" or "trending audio". The template already adds "original, no vocals, no lyrics".
- Never ask for on-screen text, captions, logos or brand names. The kids channel may show the single
  letter, number or shape it is teaching.

## Variety and originality

The build fails if any two seeds in a channel share more than 60% of the content words in
concept + subject + environment + action, or if any title repeats. So:

- Rotate through the channel's categories evenly. No two consecutive videos share a category.
- Vary environments (Indian and international), times of day, weather, color grades, lenses,
  camera moves, music moods and hook styles (macro reveal, question, contrast, motion burst, sound hit).
- Vary title structures: don't start many titles with the same words.

## Truthfulness and policy

- No real people, celebrities, brands, logos, trademarks, copyrighted characters or film/game references.
- No misleading clickbait. Never use "guarantee", "100% real", "real footage" or "proof".
- **Facts:** use only well-established facts you are confident about, from named authoritative
  sources (NASA, ESA, ISRO, NOAA, WHO, NIH/MedlinePlus, Encyclopaedia Britannica, Smithsonian,
  Guinness World Records, IUCN, Zoological Survey of India, Royal Society, etc.).
  - `fact.statement` is precise English with honest rounding ("about").
  - `fact.sourceName` is the organization plus the page topic. **No URLs.**
  - If you are not sure about a fact, pick another one. Avoid myths and contested numbers.
  - The voice-over must say exactly what the fact says, with no exaggeration.
- `isFictional: true` for anything imaginary (alien worlds, fantasy creatures, mascot stories, invented
  scenarios). The template then labels it fictional in the description.
- `thumbnail.text` is 5 words or fewer (an emoji counts as a word).
- `seo.hashtags`: 1–3 topic hashtags, CamelCase, no spaces. Don't repeat the channel's base hashtags.
- `seo.primaryKeywords`: 2 lowercase search phrases. `secondaryKeywords`: 2–3. Only relevant ones.
- `seo.playlist`: reuse a consistent set of 6–10 playlist names per channel.
