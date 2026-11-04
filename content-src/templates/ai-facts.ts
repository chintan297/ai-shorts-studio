import type { ChannelTemplate } from "@/lib/content/compose";
import { LANGUAGE, TARGET_COUNTRY } from "./shared";

export const aiFactsTemplate: ChannelTemplate = {
  channel: {
    id: "ai-facts",
    name: "Viral AI Facts & Interesting Discoveries",
    shortName: "AI Facts",
    niche: "One verified, mind-blowing fact per Short",
    description:
      "One well-established fact per Short (science, human body, animals, psychology, history, geography, inventions, nature), shown through a single striking visual demonstration. Every fact names its source.",
    icon: "Lightbulb",
    accent: "emerald",
    categories: [
      "Amazing facts",
      "Science facts",
      "Human body facts",
      "Animal facts",
      "Psychology facts",
      "Historical discoveries",
      "Geography facts",
      "Unusual inventions",
      "Interesting comparisons",
      "Natural phenomena",
      "Mind-blowing discoveries",
    ],
    visualStyle: [
      "Photoreal explainer visuals",
      "One clear visual demonstration",
      "Vivid, clean composition",
      "Documentary-quality detail",
    ],
    targetAudience: "Curious Hindi-speaking viewers aged 13–45 in India",
    language: LANGUAGE,
    targetCountry: TARGET_COUNTRY,
    madeForKids: false,
    syntheticDisclosure: "required",
    defaultSlots: ["12:00", "18:30"],
    narrator: "Energetic, friendly Indian female narrator, clear and expressive",
    identities: [
      {
        title: "Editorial rules",
        summary:
          "Only well-established facts from named authoritative sources. The visual demonstrates the fact without exaggerating it. Each Short has one clear ending line.",
        traits: [
          { label: "Fact rule", value: "Named authoritative source on every video; verify before publishing" },
          { label: "Hook", value: "A question or surprising visual in the first 1.5 s" },
          { label: "Palette", value: "Bright yellow, black, white, one bold red accent" },
          { label: "Narration", value: "Energetic Hindi voice-over, ≤ 20 words" },
        ],
      },
    ],
  },
  imageStyle: "Photorealistic cinematic explainer visual, crisp and vivid, with documentary-quality detail.",
  videoStyle:
    "Cinematic photoreal explainer with one striking visual demonstration of the fact: vivid colors, clean composition, premium documentary feel.",
  consistencyRules:
    "The demonstrated object or scene keeps a consistent shape, scale and color throughout. The visual demonstration is accurate to the fact and never exaggerates it.",
  motionRules: "Motion is clear and easy to follow, one main movement at a time, with realistic physics.",
  imageNegatives: ["fake infographic text", "wrong scale", "misleading exaggeration", "cartoon"],
  videoNegatives: ["no exaggerated or false depiction of the fact", "no fake charts or numbers on screen"],
  thumbnailPalette: "bright yellow, black and white with one bold red accent",
  thumbnailFont: "heavy impact-style sans-serif in yellow with a thick black outline",
  defaultVoice: "Energetic, friendly Indian female narrator, clear and expressive",
  defaultTone: "surprised, energetic and friendly",
  baseTags: ["amazing facts hindi", "facts in hindi", "interesting facts", "did you know", "rochak tathya", "science facts hindi"],
  baseHashtags: ["#Facts", "#AmazingFacts"],
  disclosureLine:
    "🤖 Visuals & voice AI-generated with Google Flow (Veo). The fact is summarized from the named source; the visual is an illustration.",
  ctaLines: [
    "रोज़ 2 नए rochak facts — subscribe करें 🧠",
    "ये fact किसे भेजेंगे? Share करें 🔁",
    "क्या आपको ये पहले से पता था? Comment करें 👇",
  ],
  pinnedTemplates: [
    (q) => `📌 ${q} सही जवाब comment करें 👇`,
    (q) => `📌 क्या आपको ये पता था? ${q}`,
    (q) => `📌 ${q} अगला fact topic suggest करें 💡`,
  ],
  requiresFact: () => true,
};
