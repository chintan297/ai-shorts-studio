import type { CastMember } from "@/lib/content/compose";
import type { Channel } from "@/lib/content/schema";

export const LANGUAGE = "Hindi / Hinglish voice-over · English visual instructions";
export const TARGET_COUNTRY = "India";

export function castIdentities(cast: Record<string, CastMember>, role: string): Channel["identities"] {
  return Object.values(cast).map((member) => ({
    title: member.name,
    summary: member.description,
    traits: [{ label: "Role", value: role }],
  }));
}

export const commentPins = {
  answer: (q: string) => `📌 ${q} अपना जवाब comment में लिखें 👇`,
  opinion: (q: string) => `📌 सवाल: ${q} — आपकी राय नीचे बताइए!`,
  suggest: (q: string) => `📌 ${q} और अगला topic आप suggest करें 💡`,
};
