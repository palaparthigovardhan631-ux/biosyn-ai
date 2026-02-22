
export enum Severity {
  LOW = "Low",
  MODERATE = "Moderate",
  HIGH = "High",
  EMERGENCY = "Emergency"
}

export type Language = 'English' | 'Spanish' | 'French' | 'German' | 'Chinese' | 'Arabic' | 'Hindi' | 'Portuguese' | 'Japanese' | 'Telugu';

export interface User {
  email: string;
  name: string;
  picture?: string;
}

export interface SymptomInput {
  description: string;
  duration: string;
  age: number;
  gender: string;
  medicalHistory: string;
  image?: string; // base64
  language: Language;
}

export interface RecommendedMedicine {
  name: string;
  reason: string;
  imageUrl?: string;
  mechanismOfAction: string;
  safetyProfile: string[];
}

export interface ReasoningStep {
  observation: string;
  inference: string;
  confidence: number;
}

export interface EvolutionStage {
  timeframe: string;
  untreatedProgression: string;
  interventionEffect: string;
}

export interface Anomaly {
  finding: string;
  riskFactor: string;
  criticality: 'Warning' | 'Alert' | 'Stable';
}

export interface DigitalTwin {
  status: string;
  organSystemsAffected: string[];
  simulatedVitals: {
    stressLevel: string;
    inflammationMarker: string;
    circulatoryImpact: string;
  };
}

export interface HolisticInsight {
  nutritionalSynergy: string;
  mentalStatePerception: string;
  environmentalImpact: string;
}

export interface HealthPerception {
  potentialCauses: string[];
  severity: Severity;
  recommendedSpecialist: string;
  lifestyleAdvice: string[];
  preventativeMeasures: string[];
  warningSigns: string[];
  recommendedMedicines: RecommendedMedicine[];
  
  // Advanced Features
  digitalTwin: DigitalTwin;
  evolutionSimulator: EvolutionStage[];
  explainableReasoning: ReasoningStep[];
  anomalyDetection: Anomaly[];
  holisticInsights: HolisticInsight;
  
  disclaimer: string;
  language?: Language;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  sources?: GroundingSource[];
}
