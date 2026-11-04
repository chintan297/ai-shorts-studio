import type { CastMember, ChannelTemplate } from "@/lib/content/compose";
import { LANGUAGE, TARGET_COUNTRY, castIdentities } from "./shared";

/** Original recurring cartoon cast. Seeds reference them by key in `characters`. */
export const KIDS_CAST: Record<string, CastMember> = {
  chiku: {
    name: "Chiku",
    description:
      "a cheerful baby elephant with soft sky-blue skin, big round ears with pink insides, large shiny dark eyes, a short curled trunk, a tiny yellow scarf and stubby round feet.",
  },
  mini: {
    name: "Mini",
    description:
      "a curious 6-year-old cartoon girl with a round face, warm brown skin, big brown eyes, two puffy black pigtails tied with red ribbons, a yellow T-shirt with a small white star, blue denim dungarees and white sneakers.",
  },
  bholu: {
    name: "Bholu",
    description:
      "a fluffy white baby bunny with one floppy ear and one upright ear, a pink nose, round black eyes and a little orange bow tie.",
  },
  gyanu: {
    name: "Professor Gyanu",
    description:
      "a wise, friendly little brown owl with big golden eyes, round green spectacles and a small green bow tie, who loves explaining things.",
  },
};

export const kidsLearningTemplate: ChannelTemplate = {
  channel: {
    id: "kids-learning",
    name: "Kids Entertainment & Learning",
    shortName: "Kids Learning",
    niche: "Cartoon learning: ABC, numbers, colors, shapes & tiny stories",
    description:
      "Safe, colorful 8-second cartoon lessons and tiny moral stories in simple Hindi, with an original recurring cast: Chiku, Mini, Bholu and Professor Gyanu. Made for kids.",
    icon: "ToyBrick",
    accent: "amber",
    categories: [
      "ABC learning",
      "Numbers",
      "Colors",
      "Shapes",
      "Cute animals",
      "Cartoon adventures",
      "Short moral stories",
      "Educational animations",
      "Fun learning",
      "Nursery-style entertainment",
      "Simple science concepts",
    ],
    visualStyle: [
      "Soft 3D cartoon",
      "Bright, friendly colors",
      "Consistent original characters",
      "Gentle, safe motion",
      "Simple uncluttered scenes",
    ],
    targetAudience: "Children aged 2–7 and their parents in Hindi-speaking homes",
    language: LANGUAGE,
    targetCountry: TARGET_COUNTRY,
    madeForKids: true,
    syntheticDisclosure: "not-required",
    defaultSlots: ["10:00", "17:30"],
    narrator: "Cheerful, gentle Indian female storyteller voice, slow and very clear, like a kind preschool teacher",
    identities: castIdentities(KIDS_CAST, "Original recurring cartoon character"),
  },
  cast: KIDS_CAST,
  learningSymbolsAllowed: true,
  imageStyle:
    "Bright, soft 3D cartoon illustration for preschool children: rounded shapes, smooth clay-like textures, big friendly eyes, cozy and safe.",
  videoStyle:
    "Soft 3D cartoon animation for toddlers and preschoolers: rounded friendly shapes, bright saturated colors, gentle bouncy motion, a cozy and safe atmosphere.",
  consistencyRules:
    "Every character keeps exactly the same design, proportions, colors and clothing as described, in every frame. The art style never changes. Every letter, number, shape and color being taught is drawn correctly and is easy to recognize.",
  motionRules:
    "Gentle, bouncy, cheerful movement at a calm pace. Nothing scary, no sudden loud moments, no dangerous actions.",
  imageNegatives: ["scary", "dark mood", "sharp teeth", "weapons", "creepy", "horror", "cluttered background"],
  videoNegatives: ["nothing frightening or dangerous", "no sudden loud noises", "no flashing or strobing lights"],
  thumbnailPalette: "sunny yellow, sky blue, grass green and candy pink",
  thumbnailFont: "rounded extra-bold kids font (Baloo / Fredoka style), white with a thick colorful outline",
  defaultVoice:
    "Cheerful, gentle Indian female storyteller voice, slow and very clear, like a kind preschool teacher",
  defaultTone: "joyful, warm and encouraging",
  baseTags: ["kids learning hindi", "hindi kids video", "bachon ke liye", "preschool learning", "cartoon for kids", "nursery learning"],
  baseHashtags: ["#KidsLearning", "#HindiKids"],
  disclosureLine:
    "🎨 Animated with AI tools (Google Flow / Veo): original characters and an original story, made for kids.",
  ctaLines: [
    "रोज़ नई मज़ेदार सीख के लिए subscribe करें 🎈",
    "बच्चों के साथ मिलकर देखें और साथ में दोहराएँ 🧸",
    "Parents: बच्चे से पूछें कि आज उसने क्या सीखा 🌈",
  ],
  pinnedTemplates: [() => ""],
  requiresFact: (seed) => /science|animal/i.test(seed.category) && !seed.isFictional,
};
