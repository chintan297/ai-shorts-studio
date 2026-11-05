import type { ChannelTemplate } from "@/lib/content/compose";
import { LANGUAGE, TARGET_COUNTRY, commentPins } from "./shared";

export const galaxySpaceTemplate: ChannelTemplate = {
  channel: {
    id: "galaxy-space",
    name: "Galaxy, Space & Universe",
    shortName: "Galaxy & Space",
    niche: "Cinematic galaxies, black holes, planets & cosmic facts",
    description:
      "Cinematic 8-second journeys through galaxies, black holes, nebulae and planets. Science-based Shorts cite a named source. Fictional alien worlds are always labelled fictional.",
    icon: "Orbit",
    accent: "violet",
    categories: [
      "Galaxies",
      "Black holes",
      "Nebulas",
      "Planets",
      "Solar systems",
      "Space exploration",
      "Cosmic mysteries",
      "Astronomical phenomena",
      "Universe facts",
      "Space discoveries",
      "Fictional alien worlds",
    ],
    visualStyle: [
      "Cinematic cosmic environments",
      "Realistic planetary textures",
      "Deep-space atmosphere",
      "Beautiful volumetric lighting",
      "Smooth majestic camera movement",
    ],
    targetAudience: "Space and science enthusiasts aged 13–45 in India",
    language: LANGUAGE,
    targetCountry: TARGET_COUNTRY,
    madeForKids: false,
    syntheticDisclosure: "required",
    defaultSlots: ["13:00", "21:00"],
    narrator: "Calm, deep Indian male documentary narrator with a subtle cinematic reverb",
    identities: [
      {
        title: "Visual identity",
        summary:
          "Scientifically grounded, awe-inspiring space cinematography. Science videos show the fact and its source. Fictional worlds are clearly labelled.",
        traits: [
          { label: "Palette", value: "Deep space black, violet and teal nebula glow, gold starlight" },
          { label: "Science rule", value: "Real phenomena follow the cited source; artistic scale is noted in the description" },
          { label: "Fiction rule", value: "Alien worlds carry a ‘fictional’ label in the voice-over or description" },
          { label: "Narration", value: "Calm documentary Hindi voice-over" },
        ],
      },
    ],
  },
  genre: "space cinematic short",
  imageStyle: "Photorealistic cinematic space visualization, scientifically inspired, giant-screen detail.",
  videoStyle:
    "Cinematic deep-space realism: scientifically grounded visuals, realistic planetary textures, volumetric nebula light, smooth majestic camera motion.",
  trendLook: "giant-screen space cinematography, deep blacks, luminous nebula colors, gentle lens bloom and an awe-inspiring scale reveal",
  consistencyRules:
    "Celestial bodies keep the same size, color, texture and relative positions throughout. Background stars stay fixed and steady, with no twinkling flicker. The sense of scale stays vast and consistent.",
  motionRules:
    "Camera and celestial motion are slow, smooth and majestic. Orbits, gas flows and particles follow believable physics.",
  imageNegatives: ["cartoon planets", "spaceship clutter", "excessive lens flare", "fake text labels"],
  thumbnailPalette: "deep space black, violet nebula glow and bright gold starlight",
  thumbnailFont: "bold geometric sans-serif (Montserrat Black style) in white with a soft violet glow",
  defaultVoice: "Calm, deep Indian male documentary narrator with a subtle cinematic reverb",
  defaultTone: "awe-struck, calm and mysterious",
  baseTags: ["space facts hindi", "universe in hindi", "galaxy", "astronomy hindi", "brahmand", "space video"],
  baseHashtags: ["#Space", "#Universe"],
  disclosureLine:
    "🤖 Visuals & audio AI-generated with Google Flow (Veo). The visuals are artistic illustrations, not telescope images. Scientific facts are summarized from the named source.",
  ctaLines: [
    "ब्रह्मांड के ऐसे ही रहस्यों के लिए subscribe करें 🌌",
    "रोज़ 2 नए space Shorts — notification on करें 🔭",
    "ये fact किसी space lover के साथ share करें ✨",
  ],
  pinnedTemplates: [commentPins.answer, (q) => `📌 Space quiz: ${q}`, commentPins.suggest],
  requiresFact: (seed) => !seed.isFictional,
};
