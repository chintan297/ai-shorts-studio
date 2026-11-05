import type { CastMember, ChannelTemplate } from "@/lib/content/compose";
import { LANGUAGE, TARGET_COUNTRY, castIdentities, commentPins } from "./shared";

/** Recurring AI animal mascots for the "Cute AI animals" and "Animal adventures" stories (always fictional). */
export const ANIMAL_CAST: Record<string, CastMember> = {
  momo: {
    name: "Momo",
    description:
      "a baby red panda with rusty-red fur, a cream-white face mask, dark tear-line markings under the eyes, small rounded white-edged ears, dark brown legs and a bushy tail with six alternating red and tan rings.",
  },
  pebble: {
    name: "Pebble",
    description:
      "a young Asian small-clawed otter with sleek dark-brown fur, a pale cream throat and chin, small round ears, long white whiskers and tiny webbed paws.",
  },
};

export const aiAnimalsTemplate: ChannelTemplate = {
  channel: {
    id: "ai-animals",
    name: "AI Animals & Nature",
    shortName: "Animals & Nature",
    niche: "Cinematic wildlife, cute AI animals & breathtaking nature",
    description:
      "Photoreal wildlife moments, underwater worlds, landscapes and fantasy creatures, plus two recurring AI mascots, Momo and Pebble. AI scenarios are always labelled as not real footage.",
    icon: "PawPrint",
    accent: "green",
    categories: [
      "Cute AI animals",
      "Wildlife",
      "Beautiful landscapes",
      "Underwater worlds",
      "Fantasy animals",
      "Nature cinematics",
      "Animal adventures",
      "Animal facts",
      "Birds",
      "Ocean life",
      "Natural environments",
    ],
    visualStyle: [
      "Photoreal nature cinematography",
      "Species-accurate anatomy",
      "Natural behavior and movement",
      "Lush, beautiful environments",
    ],
    targetAudience: "Animal and nature lovers of all ages (13+ audience setting) in India",
    language: LANGUAGE,
    targetCountry: TARGET_COUNTRY,
    madeForKids: false,
    syntheticDisclosure: "required",
    defaultSlots: ["11:30", "20:30"],
    narrator: "Warm, calm Indian male wildlife narrator",
    identities: [
      ...castIdentities(ANIMAL_CAST, "Recurring AI mascot (fictional scenarios only)"),
      {
        title: "Wildlife rules",
        summary:
          "Species-accurate anatomy and behavior. Real-animal facts name a source. Fictional or fantasy scenes are labelled ‘AI-generated, not real footage’.",
        traits: [
          { label: "Palette", value: "Emerald green, golden-hour amber, sky blue" },
          { label: "Narration", value: "Warm, calm Hindi wildlife voice-over" },
        ],
      },
    ],
  },
  cast: ANIMAL_CAST,
  genre: "wildlife and nature short",
  imageStyle: "Award-winning documentary-grade wildlife and nature photograph, photorealistic, with rich natural detail.",
  videoStyle:
    "Photorealistic nature-documentary cinematography: accurate animal anatomy, natural behavior, lush environments, gentle cinematic camera work.",
  trendLook: "nature-documentary close-up, shallow depth of field, rich natural colors, warm sunlight and a heartwarming moment",
  consistencyRules:
    "The same individual animal keeps identical markings, fur or feather pattern, colors and size throughout, with the correct number of legs, ears, eyes and tail for its species.",
  motionRules:
    "Animals move with a species-accurate gait and natural timing, calm and true to life.",
  imageNegatives: ["extra legs", "missing legs", "wrong number of eyes", "fused animals", "clothing on animals", "cartoon"],
  thumbnailPalette: "lush emerald green, golden-hour amber and sky blue",
  thumbnailFont: "bold rounded sans-serif (Poppins Black style), white with a dark green outline",
  defaultVoice: "Warm, calm Indian male wildlife narrator",
  defaultTone: "gentle, warm and full of wonder",
  baseTags: ["animals in hindi", "wildlife hindi", "nature video", "cute animals", "animal video", "jungle"],
  baseHashtags: ["#Animals", "#Nature"],
  disclosureLine:
    "🤖 AI-generated visuals & audio (Google Flow / Veo), not real wildlife footage. Facts, where stated, come from the named source.",
  ctaLines: [
    "प्रकृति के ऐसे ही खूबसूरत पलों के लिए subscribe करें 🌿",
    "रोज़ 2 नए animal Shorts — notification on करें 🐾",
    "ये video किसी animal lover को भेजें 💚",
  ],
  pinnedTemplates: [commentPins.answer, commentPins.opinion, commentPins.suggest],
  requiresFact: (seed) => /fact/i.test(seed.category) && !seed.isFictional,
};
