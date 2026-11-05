# Thumbnail headlines

One file per channel (`<channel>.ts`) exporting `string[]` with exactly 180 entries, in the same order as the
seeds (day 1 video 1, day 1 video 2, …). The build injects each one as the seed's `thumbnail.overlay`, and the
thumbnail prompt asks the image model to render it inside the image.

Rules (checked by the build, check T1):
- 1–4 words, at most 28 characters.
- Latin script only: English or Roman Hinglish ("2050 Ki Mumbai"). Image models misspell Devanagari.
- No emoji. Allowed characters: letters, digits, spaces and ' ’ ! ? & : + , . % # -
- Truthful, catchy and specific to that video. No violent or scary words.
