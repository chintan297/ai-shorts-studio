import data from "@data/category-recommendations.json";
import { z } from "zod";

const level = z.enum(["Low", "Medium", "High"]);

export const recommendationsSchema = z.object({
  researchedAt: z.string(),
  methodology: z.string(),
  disclaimer: z.string(),
  sources: z.array(z.object({ id: z.number(), title: z.string(), url: z.string().url() })),
  recommendations: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      targetAudience: z.string(),
      examples: z.array(z.string()).min(2),
      competition: level,
      productionDifficulty: level,
      growthPotential: level,
      internationalPotential: level,
      eightSecondFit: z.string(),
      monetizationRisks: z.array(z.string()).min(1),
      strategy: z.string(),
      evidence: z.string(),
      sourceIds: z.array(z.number()),
    }),
  ),
});
export type CategoryRecommendations = z.infer<typeof recommendationsSchema>;

export const RECOMMENDATIONS: CategoryRecommendations = recommendationsSchema.parse(data);
