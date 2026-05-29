import type { PrismEngineContext } from "./prism-intelligence-engine";
import type { PrismMacroSnapshot } from "./prism-macro-snapshot";
import type { PrismPrediction } from "./storage";

type ForecastCore = Omit<PrismPrediction, "id" | "timestamp" | "arcTxHash">;

/** Institutional confidence calibration — max 85% unless memory allows 88. */
export function calibratePrismForecast(
  core: ForecastCore,
  macro: PrismMacroSnapshot,
  engine: PrismEngineContext,
  maxConfidence: number,
): ForecastCore {
  const feeds =
    (macro.market ? 1 : 0) +
    (macro.defi ? 1 : 0) +
    (macro.fred ? 1 : 0) +
    (macro.dune ? 1 : 0) +
    (engine.scoredHeadlines.length >= 3 ? 2 : 0);

  const agreementBoost = Math.round(engine.signalAgreement * 12);
  let confidence = Math.min(
    maxConfidence,
    Math.max(
      core.confidence,
      42 + feeds * 4 + agreementBoost + (macro.fred ? 5 : 0),
    ),
  );

  if (engine.signalAgreement < 0.4) confidence = Math.min(confidence, 62);
  if (engine.regime === "volatility-expansion") confidence = Math.min(confidence, 68);

  const bearish = engine.scoredHeadlines.filter(
    (h) => h.impact === "bearish" || h.impact === "uncertainty",
  ).length;
  const bullish = engine.scoredHeadlines.filter((h) => h.impact === "bullish").length;
  let probability = core.probability;
  if (bullish > bearish + 2) probability = Math.min(88, probability + 4);
  if (bearish > bullish + 2) probability = Math.max(10, probability - 4);

  return {
    ...core,
    probability: Math.min(88, Math.max(8, Math.round(probability))),
    confidence: Math.round(confidence),
    reasoning: `${core.reasoning} Regime: ${engine.regime}. ${engine.memoryNote}`,
  };
}
