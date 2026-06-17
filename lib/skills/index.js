// ============================================================
// Índice das skills da engine — ponto único de importação.
//   import { researchTrends, generateIdeas, ... } from "@/lib/skills";
// ============================================================

export { researchTrends } from "./trends.js";        // Tarefa 1
export { generateIdeas } from "./ideas.js";           // Tarefa 2
export { generatePackage } from "./script.js";        // Tarefa 3
export { generateDerivatives } from "./derivatives.js"; // Tarefa 4
export { generateKeywords, buildSeoPackage } from "./seo.js";          // Tarefa 6
export { generateThumbnail, generateThumbnailSet } from "./thumbnail.js";   // Tarefa 9
export { generateStrategy } from "./strategy.js";     // Tarefa 10
export { extractLearnings } from "./learning.js";     // Tarefa 8
export { generateDistribution } from "./distribute.js";
export { generateMediaFactoryPackage, generateImagePrompts, generateAiThumbnails, generateStoryboard, generateVideoPackage, generateShortsFactory } from "./mediaFactory.js";
export { checkContent } from "./compliance.js";
export { nicheRpm, videoRevenue, channelMonetizationPotential, priorityLabel, NICHE_RPM } from "./monetization.js";
export { channelScore, nicheScore, contentScore, priorityDecision, opportunityType } from "./analytics.js";
export { PLATFORMS, PLATFORM_TEMPLATES, getPlatform } from "./templates.js";
