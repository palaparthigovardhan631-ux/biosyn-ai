
import { GoogleGenAI, Type } from "@google/genai";
import { SymptomInput, HealthPerception, Severity, Language, GroundingSource } from "../types.ts";

export const analyzeSymptoms = async (input: SymptomInput): Promise<HealthPerception> => {
  // Always initialize right before use to ensure the API key is caught from the shim
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  const model = "gemini-3.1-pro-preview";
  
  const systemInstruction = `
    You are a high-precision medical perception engine (BioSyn AI). 
    Perform a clinical pattern analysis based on patient input.
    DO NOT provide definitive diagnoses or prescriptions. 
    Response MUST be in ${input.language}.
  `;

  const prompt = `
    Patient Analysis Request:
    - Age: ${input.age}, Gender: ${input.gender}
    - Symptoms: ${input.description}
    - Duration: ${input.duration}
  `;

  const response = await ai.models.generateContent({
    model,
    contents: { parts: [{ text: prompt }] },
    config: {
      temperature: 0.2,
      systemInstruction,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 4000 },
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          potentialCauses: { type: Type.ARRAY, items: { type: Type.STRING } },
          severity: { type: Type.STRING, enum: Object.values(Severity) },
          recommendedSpecialist: { type: Type.STRING },
          lifestyleAdvice: { type: Type.ARRAY, items: { type: Type.STRING } },
          preventativeMeasures: { type: Type.ARRAY, items: { type: Type.STRING } },
          warningSigns: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendedMedicines: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                reason: { type: Type.STRING },
                mechanismOfAction: { type: Type.STRING },
                safetyProfile: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["name", "reason", "mechanismOfAction", "safetyProfile"]
            }
          },
          digitalTwin: {
            type: Type.OBJECT,
            properties: {
              status: { type: Type.STRING },
              organSystemsAffected: { type: Type.ARRAY, items: { type: Type.STRING } },
              simulatedVitals: {
                type: Type.OBJECT,
                properties: {
                  stressLevel: { type: Type.STRING },
                  inflammationMarker: { type: Type.STRING },
                  circulatoryImpact: { type: Type.STRING }
                },
                required: ["stressLevel", "inflammationMarker", "circulatoryImpact"]
              }
            },
            required: ["status", "organSystemsAffected", "simulatedVitals"]
          },
          evolutionSimulator: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                timeframe: { type: Type.STRING },
                untreatedProgression: { type: Type.STRING },
                interventionEffect: { type: Type.STRING }
              }
            }
          },
          explainableReasoning: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                observation: { type: Type.STRING },
                inference: { type: Type.STRING },
                confidence: { type: Type.NUMBER }
              }
            }
          },
          anomalyDetection: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                finding: { type: Type.STRING },
                riskFactor: { type: Type.STRING },
                criticality: { type: Type.STRING }
              }
            }
          },
          holisticInsights: {
            type: Type.OBJECT,
            properties: {
              nutritionalSynergy: { type: Type.STRING },
              mentalStatePerception: { type: Type.STRING },
              environmentalImpact: { type: Type.STRING }
            }
          },
          disclaimer: { type: Type.STRING }
        },
        required: ["potentialCauses", "severity", "recommendedSpecialist", "lifestyleAdvice", "preventativeMeasures", "warningSigns", "recommendedMedicines", "digitalTwin", "evolutionSimulator", "explainableReasoning", "anomalyDetection", "holisticInsights", "disclaimer"]
      }
    }
  });

  try {
    const reportData = JSON.parse(response.text.trim()) as HealthPerception;
    reportData.language = input.language;
    return reportData;
  } catch (e) {
    throw new Error("Failed to parse perception data.");
  }
};

export const chatWithHealthAssistant = async (history: any[], message: string, language: Language = 'English') => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [...history, { role: 'user', parts: [{ text: message }] }],
    config: {
      systemInstruction: `You are a medical assistant in ${language}.`,
      tools: [{ googleSearch: {} }]
    }
  });

  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
    title: chunk.web?.title || 'Source',
    uri: chunk.web?.uri || ''
  })).filter((s: any) => s.uri) || [];

  return {
    text: response.text || "No response generated.",
    sources
  };
};
