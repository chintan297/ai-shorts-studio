import type { ChannelTemplate } from "@/lib/content/compose";
import { LANGUAGE, TARGET_COUNTRY, commentPins } from "./shared";

export const futureAiTemplate: ChannelTemplate = {
  channel: {
    id: "future-ai",
    name: "Future AI & Technology",
    shortName: "Future AI",
    niche: "Futuristic tech, AI inventions & cities of tomorrow",
    description:
      "Each 8-second Short shows one clear futuristic concept: AI inventions, humanoid robots, flying transport, smart homes, space tech and the cities of tomorrow.",
    icon: "Cpu",
    accent: "cyan",
    categories: [
      "Future technology",
      "Futuristic cities",
      "AI innovations",
      "Robots and humanoids",
      "Advanced transportation",
      "Future lifestyle",
      "Space technology",
      "Smart homes",
      "Future architecture",
      "Futuristic inventions",
      "AI-generated concepts",
    ],
    visualStyle: [
      "Ultra-realistic",
      "Cinematic environments",
      "Futuristic lighting",
      "Advanced technology",
      "Professional camera angles",
      "High-quality visual effects",
    ],
    targetAudience: "Tech-curious Hindi-speaking viewers aged 16–40 in India",
    language: LANGUAGE,
    targetCountry: TARGET_COUNTRY,
    madeForKids: false,
    syntheticDisclosure: "required",
    defaultSlots: ["12:30", "19:30"],
    narrator: "Confident Indian male narrator with a clear, slightly deep voice",
    identities: [
      {
        title: "Visual identity",
        summary:
          "Believable near-future realism: premium, clean, optimistic technology. No dystopian horror, no toy-like sci-fi.",
        traits: [
          { label: "Palette", value: "Electric cyan, deep navy, warm amber accents" },
          { label: "Lighting", value: "Clean volumetric light, neon edge lighting, golden-hour skylines" },
          { label: "Camera", value: "Smooth drone, dolly and orbit moves; 24–35 mm wides, 50–85 mm product close-ups" },
          { label: "Narration", value: "Hindi voice-over that names the concept in the first 2 seconds" },
        ],
      },
    ],
  },
  genre: "futuristic tech short",
  imageStyle: "Ultra-realistic cinematic concept photograph of the near future, premium commercial look.",
  videoStyle:
    "Ultra-realistic cinematic sci-fi realism with a premium commercial look: believable near-future technology, clean futuristic lighting, high-end visual effects.",
  trendLook: "sleek premium sci-fi commercial look, glowing holographic accents, crisp HDR detail and a satisfying reveal moment",
  music: {
    feel: "modern, hopeful and cinematic, with a steady pulse that builds a sense of wonder",
    arc: "A soft pulse starts on the first frame, builds steadily through the action, opens into a wide shimmering lift at the 6-second reveal, and resolves on a clean final note by 8 seconds.",
  },
  consistencyRules:
    "Keep the same subject design, materials, colors and environment layout in every frame. Technology looks plausible and well-engineered. No random new objects appear.",
  motionRules:
    "Machines and vehicles move smoothly with believable mass and momentum. Any people move naturally and calmly in the background.",
  imageNegatives: ["cartoon", "toy-like", "plastic look", "cluttered sci-fi clichés", "gloomy ruins"],
  thumbnailPalette: "electric cyan, deep navy and warm orange accents",
  thumbnailFont: "extra-bold condensed sans-serif (Anton / Bebas Neue style), white with a cyan glow outline",
  defaultVoice: "Confident Indian male narrator with a clear, slightly deep voice",
  defaultTone: "excited, curious and confident",
  baseTags: ["future technology", "future tech hindi", "AI technology", "technology in hindi", "futuristic", "AI video"],
  baseHashtags: ["#FutureTech", "#AI"],
  disclosureLine:
    "🤖 यह वीडियो AI से बनाया गया है — visuals & audio AI-generated with Google Flow (Veo). It visualizes a concept or vision of the future, not an existing product unless stated.",
  ctaLines: [
    "ऐसे ही future tech Shorts के लिए channel को subscribe करें 🚀",
    "रोज़ 2 नए future concepts — subscribe करके notification on करें 🔔",
    "आपको ये future कैसा लगा? Comment में बताइए 👇",
  ],
  pinnedTemplates: [commentPins.answer, commentPins.opinion, commentPins.suggest],
  requiresFact: (seed) => Boolean(seed.fact),
};
