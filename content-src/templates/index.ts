import type { ChannelTemplate } from "@/lib/content/compose";
import type { ChannelId } from "@/lib/content/schema";
import { aiAnimalsTemplate } from "./ai-animals";
import { aiFactsTemplate } from "./ai-facts";
import { aiFashionTemplate } from "./ai-fashion";
import { futureAiTemplate } from "./future-ai";
import { galaxySpaceTemplate } from "./galaxy-space";
import { kidsLearningTemplate } from "./kids-learning";

export const TEMPLATES: Record<ChannelId, ChannelTemplate> = {
  "future-ai": futureAiTemplate,
  "ai-fashion": aiFashionTemplate,
  "galaxy-space": galaxySpaceTemplate,
  "kids-learning": kidsLearningTemplate,
  "ai-facts": aiFactsTemplate,
  "ai-animals": aiAnimalsTemplate,
};
