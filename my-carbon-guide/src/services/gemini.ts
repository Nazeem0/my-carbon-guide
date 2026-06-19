import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export interface DailyInsightParams {
  userName: string;
  city: string;
  todayKg: number;
  weeklyAvg: number;
  cityAvg: number;
  topActivity: string;
  streak: number;
  language?: "en" | "kn" | "hi";
}

export async function generateDailyInsight({
  userName,
  city,
  todayKg,
  weeklyAvg,
  cityAvg,
  topActivity,
  streak,
  language = "en"
}: DailyInsightParams): Promise<string> {
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY is not set");
  }

  const model = genAI.getGenerativeModel(
    { model: "gemini-2.5-flash" },
  );
  
  const languageInstruction = {
    en: "Respond in English",
    kn: "Respond in Kannada language (ಕನ್ನಡ)",
    hi: "Respond in Hindi language (हिंदी)"
  }[language];

  const prompt = `
You are EcoLog's friendly AI carbon coach for Indian users.
Generate a short personalised carbon footprint insight.

User details:
- Name: ${userName}
- City: ${city}
- Today's CO₂: ${todayKg} kg
- Their weekly average: ${weeklyAvg} kg/day
- ${city} city average: ${cityAvg} kg/day
- Biggest emission today: ${topActivity}
- Current logging streak: ${streak} days

Rules:
- Exactly 2 sentences only
- Be specific with the numbers provided
- First sentence: what they did today vs average
- Second sentence: one specific actionable tip
- Sound encouraging and friendly, not preachy
- Reference Indian context where relevant
- ${languageInstruction}
- Output only the 2 sentences, nothing else
  `;
  
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { thinkingConfig: { thinkingBudget: 0 } } as any,
  });
  return result.response.text().trim();
}

export interface WeeklySummaryParams {
  userName: string;
  weeklyData: number[];
  bestDay: string;
  streak: number;
  language?: "en" | "kn" | "hi";
}

export async function generateWeeklySummary({
  userName,
  weeklyData,
  bestDay,
  streak,
  language = "en"
}: WeeklySummaryParams): Promise<string> {
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY is not set");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  
  const avg = (weeklyData.reduce((a, b) => a + b, 0) / 7).toFixed(2);

  const languageInstruction = {
    en: "Respond in English",
    kn: "Respond in Kannada language (ಕನ್ನಡ)",
    hi: "Respond in Hindi language (हिंदी)"
  }[language];
  
  const prompt = `
You are EcoLog's AI coach. Write a weekly carbon summary.

User: ${userName}
This week's daily CO₂: ${weeklyData.join(", ")} kg
Weekly average: ${avg} kg/day
Best day: ${bestDay}
Current streak: ${streak} days

Write exactly 3 sentences:
1. Overall week performance with specific numbers
2. What worked well this week
3. One focus area for next week
Be encouraging and specific.
Output only the 3 sentences.
${languageInstruction}
  `;
  
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { thinkingConfig: { thinkingBudget: 0 } } as any,
  });
  return result.response.text().trim();
}

export interface ReductionRoadmapParams {
  userName: string;
  topCategories: string[];
  currentAvg: number;
}

export interface RoadmapAction {
  week: number;
  action?: string;
  actionKey?: string;
  category: "transport" | "food" | "energy" | "shopping";
  saving_kg_month: number;
  difficulty: "Easy" | "Medium" | "Hard";
  india_tip?: string;
  tipKey?: string;
}

export async function generateReductionRoadmap({
  userName,
  topCategories,
  currentAvg
}: ReductionRoadmapParams): Promise<RoadmapAction[]> {
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY is not set");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  
  const prompt = `
You are EcoLog's AI coach for Indian users.
Generate a 30-day personalised carbon reduction plan.

User: ${userName}
Current daily average: ${currentAvg} kg CO₂
Top emission categories: ${topCategories.join(", ")}

Return ONLY a valid JSON array (no markdown, no backticks):
[
  {
    "week": 1,
    "action": "specific action",
    "category": "transport/food/energy/shopping",
    "saving_kg_month": number,
    "difficulty": "Easy/Medium/Hard",
    "india_tip": "India-specific context"
  }
]
Generate 8 actions total (2 per week).
Focus on Indian lifestyle: LPG, auto-rickshaw, 
Swiggy orders, BESCOM electricity.
  `;
  
  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { thinkingConfig: { thinkingBudget: 0 } } as any,
  });
  const text = result.response.text().trim();
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}
