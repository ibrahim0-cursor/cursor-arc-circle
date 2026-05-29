import { getPrismPredictions } from "./storage";

/** Lightweight calibration from stored PRISM forecasts (self-correct weights over time). */
export async function getPrismMemoryCalibration(): Promise<{
  sampleSize: number;
  avgConfidence: number;
  maxAllowedConfidence: number;
  note: string;
}> {
  const preds = await getPrismPredictions(40);
  const sampleSize = preds.length;
  if (sampleSize < 3) {
    return {
      sampleSize,
      avgConfidence: 0,
      maxAllowedConfidence: 85,
      note: "Insufficient forecast history — cap confidence at 85%.",
    };
  }

  const avgConfidence =
    preds.reduce((s, p) => s + p.confidence, 0) / sampleSize;

  const maxAllowedConfidence = sampleSize >= 12 ? 88 : 85;

  return {
    sampleSize,
    avgConfidence: Math.round(avgConfidence),
    maxAllowedConfidence,
    note: `${sampleSize} prior forecasts on file; calibrating confidence ceiling to ${maxAllowedConfidence}%.`,
  };
}
