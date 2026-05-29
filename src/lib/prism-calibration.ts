import { macroProbabilityAdjust, type PrismMacroSnapshot } from "./prism-macro-snapshot";
import type { PrismPrediction } from "./storage";

type ForecastCore = Omit<PrismPrediction, "id" | "timestamp" | "arcTxHash">;

/** Ground forecasts in live macro + headline depth — target up to ~90% model confidence when feeds are rich. */
export function calibratePrismForecast(
  core: ForecastCore,
  macro: PrismMacroSnapshot,
  headlineCount: number,
): ForecastCore {
  const feeds =
    (macro.market ? 1 : 0) +
    (macro.defi ? 1 : 0) +
    (macro.fred ? 1 : 0) +
    (macro.dune ? 1 : 0) +
    (headlineCount >= 4 ? 2 : headlineCount >= 2 ? 1 : 0);

  const macroAdjusted = macroProbabilityAdjust(core.probability, core.category, macro);
  const blend = feeds >= 4 ? 0.65 : feeds >= 3 ? 0.5 : 0.35;
  const probability = Math.min(
    92,
    Math.max(8, Math.round(core.probability * (1 - blend) + macroAdjusted * blend)),
  );

  const confidence = Math.min(
    90,
    Math.max(
      core.confidence,
      58 + feeds * 5 + (macro.fred ? 8 : 0) + (headlineCount >= 3 ? 6 : 0),
    ),
  );

  const summary =
    feeds >= 3 && !core.summary.toLowerCase().includes("real-time")
      ? `${core.summary} Grounded in real-time Binance, FRED, DefiLlama, and matched headlines.`
      : core.summary;

  return { ...core, probability, confidence, summary };
}
