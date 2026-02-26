
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { SymptomInput, HealthPerception, Severity, Language, GroundingSource } from "../types.ts";

const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> => {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      // Check if it's a 503 error or "high demand" message
      const isRetryable = 
        err.message?.includes("503") || 
        err.message?.includes("high demand") || 
        err.message?.includes("UNAVAILABLE") ||
        err.status === 503;

      if (isRetryable && i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        console.warn(`Gemini API 503 error. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
};

export const analyzeSymptoms = async (input: SymptomInput): Promise<HealthPerception> => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || "";
  if (!apiKey) {
    throw new Error("Gemini API key is missing. Please select a key or configure the environment.");
  }
  
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    You are a high-precision medical perception engine (BioSyn AI). 
    Perform a clinical pattern analysis based on patient input.
    DO NOT provide definitive diagnoses or prescriptions. 
    
    CRITICAL: Your entire response (all text fields in the JSON) MUST be in the language: ${input.language}.
  `;

  const prompt = `
    Patient Analysis Request:
    - Age: ${input.age}, Gender: ${input.gender}
    - Symptoms: ${input.description}
    - Duration: ${input.duration}
    - Medical History: ${input.medicalHistory || 'None provided'}
  `;

  const response = await withRetry(() => ai.models.generateContent({
    model,
    contents: { parts: [{ text: prompt }] },
    config: {
      temperature: 0.1,
      systemInstruction,
      responseMimeType: "application/json",
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
                imageUrl: { type: Type.STRING },
                safetyProfile: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["name", "reason", "mechanismOfAction", "imageUrl", "safetyProfile"]
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
  }));

  try {
    const text = response.text;
    if (!text) {
      throw new Error("SAFETY_ERROR: The model returned an empty response.");
    }
    const reportData = JSON.parse(text.trim()) as HealthPerception;
    reportData.language = input.language;

    // Dynamically generate accurate medicine images using Gemini Image API
    const medicinesWithImages = await Promise.all(
      reportData.recommendedMedicines.map(async (med) => {
        try {
          const imageGenResponse = await withRetry(() => ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
              parts: [{ 
                text: `A professional photograph of ${med.name} medicine packaging, white background.` 
              }]
            },
            config: {
              imageConfig: { aspectRatio: "1:1" }
            }
          }));

          const imagePart = imageGenResponse.candidates?.[0]?.content?.parts.find(p => p.inlineData);
          if (imagePart?.inlineData) {
            return {
              ...med,
              imageUrl: `data:image/png;base64,${imagePart.inlineData.data}`
            };
          }
        } catch (err) {
          console.error(`Failed to generate image for ${med.name}:`, err);
        }
        return med;
      })
    );

    reportData.recommendedMedicines = medicinesWithImages;
    return reportData;
  } catch (e: any) {
    if (e.message?.includes("SAFETY_ERROR")) throw e;
    console.error("Perception parsing error:", e);
    throw new Error("DATA_ERROR: Failed to parse perception data.");
  }
};

export const getRealTimeFeedback = async (text: string, language: Language): Promise<string> => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || "";
  if (!apiKey || text.length < 10) return "";

  const ai = new GoogleGenAI({ apiKey });
  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ text: `Analyze these symptoms briefly in ${language}: ${text}. Provide 1-2 sentences of immediate observation or clarifying questions. Keep it professional and empathetic.` }] },
    config: {
      temperature: 0.3,
      systemInstruction: "You are a medical assistant providing real-time feedback on symptoms. Be brief, empathetic, and professional. Do not diagnose."
    }
  }));

  return response.text || "";
};

export const chatWithHealthAssistant = async (history: any[], message: string, image?: string, language: Language = 'English') => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || "";
  const ai = new GoogleGenAI({ apiKey });
  
  const parts: any[] = [{ text: message }];
  if (image) {
    parts.push({
      inlineData: {
        data: image.split(',')[1] || image,
        mimeType: "image/png"
      }
    });
  }

  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [...history, { role: 'user', parts }],
    config: {
      systemInstruction: `You are a medical assistant in ${language}. Use Markdown for rich text formatting in your responses.`,
      tools: [{ googleSearch: {} }]
    }
  }));

  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
    title: chunk.web?.title || 'Source',
    uri: chunk.web?.uri || ''
  })).filter((s: any) => s.uri) || [];

  return {
    text: response.text || "No response generated.",
    sources
  };
};

export const editImage = async (base64Image: string, prompt: string): Promise<string> => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY || "";
  if (!apiKey) throw new Error("AUTH_ERROR: API key missing.");
  
  const ai = new GoogleGenAI({ apiKey });
  const response = await withRetry(() => ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: base64Image.split(',')[1] || base64Image, mimeType: "image/png" } },
        { text: prompt }
      ]
    },
  }));

  const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
  if (imagePart?.inlineData) {
    return `data:image/png;base64,${imagePart.inlineData.data}`;
  }
  throw new Error("Failed to edit image.");
};
