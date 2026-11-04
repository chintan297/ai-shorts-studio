import type { CastMember, ChannelTemplate } from "@/lib/content/compose";
import { LANGUAGE, TARGET_COUNTRY } from "./shared";

/**
 * Four original, fictional ADULT AI models. Each identity is permanent: face, eyes, skin, identity marker,
 * hair colour/length and body proportions never change between videos. Seeds pick 1 (rarely 2) by key.
 */
export const FASHION_MODELS: Record<string, CastMember> = {
  meher: {
    name: "Meher Anand",
    description:
      "an original fictional adult AI fashion model, a 25-year-old Indian woman with a mature adult face. Face: heart-shaped with high cheekbones and a softly pointed chin. Eyes: large almond-shaped deep-brown eyes with thick dark lashes and bold, softly arched black eyebrows. Nose: straight with a slightly rounded tip and a tiny gold stud on the left nostril (always present). Lips: full and well-defined. Skin: warm wheatish golden-brown with natural texture and a healthy glow. Hair: very long, thick, glossy jet-black hair with soft waves, reaching the waist. Body: about 168 cm tall with balanced, elegant adult proportions and confident posture.",
  },
  valeria: {
    name: "Valeria Solis",
    description:
      "an original fictional adult AI fashion model, a 26-year-old Latina woman with a mature adult face. Face: oval with defined cheekbones and a soft jawline. Eyes: warm amber-brown eyes with long lashes and full dark eyebrows. Nose: small and straight. Lips: full, with a natural berry tone. Skin: sun-kissed caramel-tan with natural texture and one small beauty mark high on the right cheekbone (always present). Hair: long, voluminous dark-chocolate loose curls reaching mid-back. Body: about 170 cm tall with athletic, balanced adult proportions and confident posture.",
  },
  hana: {
    name: "Hana Mori",
    description:
      "an original fictional adult AI fashion model, a 27-year-old East Asian woman with a mature adult face and poised, elegant presence. Face: soft oval with a defined jawline. Eyes: dark-brown almond eyes with soft monolids and straight, softly feathered eyebrows. Nose: small with a soft bridge. Lips: naturally rosy with a defined cupid's bow. Skin: fair with a neutral undertone, natural texture and a light flush. Hair: long, straight, glossy black hair reaching mid-back with soft curtain bangs (always present). Body: about 168 cm tall with slender, balanced adult proportions and elegant posture.",
  },
  elara: {
    name: "Elara Vey",
    description:
      "an original fictional adult AI fashion model, a 25-year-old woman with a global mixed-heritage look and a mature adult face. Face: soft oval with gently defined high cheekbones and a softly rounded chin. Eyes: almond-shaped hazel-green eyes with a warm amber ring, natural dark lashes and softly arched dark-brown eyebrows. Nose: straight, slim bridge with a softly rounded tip. Lips: medium-full with a defined cupid's bow. Skin: warm light-olive golden-beige with natural texture and one small beauty mark just above the left corner of her upper lip (always present). Hair: long, thick, softly wavy dark-chocolate-brown hair with subtle caramel highlights, reaching mid-back. Body: about 172 cm tall with slim-athletic, balanced adult proportions and graceful posture.",
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
      summary: `Permanent identity — ${m.description}`,
      traits: [
        { label: "Changes per video", value: "Outfit, styling, makeup, location, pose, expression, camera" },
        { label: "Never changes", value: "Face, eyes, skin tone, identity marker, hair colour/length, body proportions" },
      ],
    })),
  },
  cast: FASHION_MODELS,
  imageStyle:
    "High-glam fashion editorial photograph, photorealistic, bold modern styling shot like a luxury magazine or top Instagram fashion campaign; tasteful glamour framing (full-length, three-quarter or portrait — close-ups only of face, hair, jewelry or shoes).",
  videoStyle:
    "Photorealistic high-glam fashion film: bold modern styling, flattering professional fashion lighting, natural skin texture, confident editorial energy, tasteful glamour framing (full-length, three-quarter or portrait; close-ups only of face, hair, jewelry or shoes).",
  consistencyRules:
    "The model keeps exactly her own face, facial proportions, eye colour, skin tone, identity marker and hair colour as described, in every frame; she is clearly an adult woman with natural adult proportions; outfit and accessories do not change during the clip; hands are anatomically correct with five fingers each.",
  motionRules:
    "Only subtle, confident movement: a slow head turn, an over-the-shoulder glance, a soft smile, a hair flip or the breeze moving hair and fabric, a slight weight shift, at most one slow hand movement (touching hair, sunglasses or an earring). She does not walk, run, dance or spin; hands stay relaxed and natural.",
  imageNegatives: [
    "revealing clothing",
    "wardrobe malfunction",
    "unflattering angle",
    "close-up on body parts",
    "extra legs",
    "distorted legs",
    "elongated neck",
    "plastic skin",
    "airbrushed skin",
    "doll face",
    "different face",
    "inconsistent identity",
  ],
  videoNegatives: [
    "no revealing or ill-fitting clothing, the outfit stays neat, intact and tasteful",
    "no close-ups of anything except the face, hair, jewelry or shoes; framing stays elegant and fashion-editorial",
    "no walking, dancing or spinning",
    "no complex hand gestures",
    "no drift in facial features",
  ],
  thumbnailPalette: "hot pink, glossy black and champagne gold (party) or turquoise and sunset coral (beach)",
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
