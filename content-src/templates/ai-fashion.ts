import type { CastMember, ChannelTemplate } from "@/lib/content/compose";
import { LANGUAGE, TARGET_COUNTRY } from "./shared";

/**
 * Four original, fictional ADULT AI models. Each identity is permanent: face, eyes, skin, identity marker,
 * hair colour/length and body proportions never change between videos. Seeds pick 1 (rarely 2) by key.
 */
export const FASHION_MODELS: Record<string, CastMember> = {
  meher: {
    name: "Meher Anand",
    promptLabel: "the Indian model",
    description:
      "a woman with a heart-shaped face, high cheekbones, large almond-shaped deep-brown eyes with thick dark lashes, bold softly arched black eyebrows, a tiny gold stud on her left nostril, full well-defined lips, warm wheatish golden-brown skin and very long, glossy jet-black hair with soft waves.",
  },
  valeria: {
    name: "Valeria Solis",
    promptLabel: "the Latina model",
    description:
      "a woman with an oval face, defined cheekbones, warm amber-brown eyes with long lashes, full dark eyebrows, a small beauty mark high on her right cheekbone, full lips with a natural berry tone, sun-kissed caramel-tan skin and long, voluminous dark-chocolate curls.",
  },
  hana: {
    name: "Hana Mori",
    promptLabel: "the East Asian model",
    description:
      "a woman with a soft oval face, dark-brown almond eyes, straight softly feathered eyebrows, naturally rosy lips, fair skin with a light natural flush and long, straight, glossy black hair with soft curtain bangs.",
  },
  elara: {
    name: "Elara Vey",
    promptLabel: "the hazel-eyed model",
    description:
      "a woman with a global mixed-heritage look, a soft oval face, almond-shaped hazel-green eyes with a warm amber ring, softly arched dark-brown eyebrows, a small beauty mark above the left corner of her upper lip, warm light-olive skin and long, thick, softly wavy dark-chocolate-brown hair with caramel highlights.",
  },
};

export const aiFashionTemplate: ChannelTemplate = {
  channel: {
    id: "ai-fashion",
    name: "AI Fashion Model & Trending Girls Reels",
    shortName: "AI Fashion",
    niche: "Four AI models · bold modern glam, party, beach & Indian glam looks",
    description:
      "A recurring cast of four original fictional AI models — Meher, Valeria, Hana and Elara — in bold, modern glam looks: party and club wear, bodycon and slit dresses, beach and swimwear editorials, street style and athleisure, plus Indian glam (modern lehengas, designer-blouse sarees, Indo-western). Shot like a high-end fashion editorial with subtle, confident movement.",
    icon: "Shirt",
    accent: "pink",
    categories: [
      "AI fashion models",
      "Trending fashion reels",
      "Luxury lifestyle",
      "Beach fashion",
      "Traditional Indian outfits",
      "Western fashion",
      "Party outfits",
      "Summer fashion",
      "Winter fashion",
      "Beauty and styling",
      "Fashion photography",
      "Luxury destinations",
      "Instagram-style fashion trends",
    ],
    visualStyle: [
      "Photorealistic high-glam fashion editorial",
      "Bold modern styling",
      "Four consistent model identities",
      "Correct anatomy and hands",
      "Subtle confident movement",
    ],
    targetAudience: "Fashion and lifestyle viewers aged 18–35 in India and worldwide",
    language: LANGUAGE,
    targetCountry: TARGET_COUNTRY,
    madeForKids: false,
    syntheticDisclosure: "required",
    defaultSlots: ["11:00", "20:00"],
    narrator: "Confident, warm female voice (used sparingly — most reels are music-led)",
    identities: Object.values(FASHION_MODELS).map((m) => ({
      title: m.name,
      summary: `Original fictional AI model (not a real person). Permanent look: ${m.description}`,
      traits: [
        { label: "Changes per video", value: "Outfit, styling, makeup, location, pose, expression, camera" },
        { label: "Never changes", value: "Face, eyes, skin tone, identity marker, hair colour/length, body proportions" },
      ],
    })),
  },
  cast: FASHION_MODELS,
  genre: "fashion reel",
  imageStyle:
    "Photorealistic fashion editorial photograph, stylish modern look shot like a luxury magazine campaign, full-length or three-quarter framing.",
  videoStyle:
    "Photorealistic fashion film: stylish modern look, soft professional lighting, confident editorial energy, full-length or three-quarter framing.",
  trendLook: "high-end fashion campaign color grade, soft bloom, crisp detail and a trending Instagram-reel glow",
  consistencyRules:
    "The model keeps exactly her own face, eye colour, skin tone, identity marker and hair colour as described, in every frame; outfit and accessories stay the same throughout the clip; hands look natural with five fingers each.",
  motionRules:
    "She stays in place with subtle, confident movement: a slow head turn, an over-the-shoulder glance, a soft smile, hair and fabric moving in the breeze, at most one slow hand movement; hands relaxed and natural.",
  imageNegatives: [
    "unflattering angle",
    "extra legs",
    "distorted legs",
    "elongated neck",
    "plastic skin",
    "doll face",
    "different face",
    "inconsistent identity",
  ],
  thumbnailPalette: "rich fashion-campaign colors that match the outfit, with glossy highlights and clean contrast",
  thumbnailFont: "bold modern sans-serif (Montserrat ExtraBold style) in white with a soft pink glow",
  defaultVoice: "Confident, warm Indian female voice",
  defaultTone: "confident, stylish and playful",
  baseTags: ["AI fashion model", "fashion reels", "outfit ideas", "glam look", "fashion shorts", "AI model"],
  baseHashtags: ["#AIFashion", "#OutfitIdeas"],
  disclosureLine:
    "🤖 Meher, Valeria, Hana और Elara काल्पनिक AI models हैं — AI-generated fictional adult characters, not real people. Visuals & audio created with Google Flow (Veo).",
  ctaLines: [
    "रोज़ नए glam looks के लिए subscribe करें ✨",
    "आपकी favourite model कौन है? Comment करें 💖",
    "ये look save करें और friends के साथ share करें 💫",
  ],
  pinnedTemplates: [
    (q) => `📌 ${q} Comment में बताइए 👇`,
    (q) => `📌 Style poll: ${q}`,
    (q) => `📌 ${q} अगला look आप suggest करें ✨`,
  ],
  requiresFact: () => false,
  requiresCharacters: true,
  forbiddenTerms: [
    /\b(lingerie|underwear|bra|panties|thong|g-string|nude|naked|nudity|topless|see-?through|nipple|cleavage|seductive|sensual|sexy|erotic|hottie|hot girl|bedroom|lap ?dance|micro ?bikini|school ?girl|teen(?:age|ager)?|minor)\b/i,
    /\bsheer (?:top|bodysuit|dress|shirt|blouse)\b/i,
  ],
};
