import type { ScoreComponent } from "./types";

export const SCORE_WEIGHTS = {
  headers: 0.35,
  cookies: 0.2,
  exposure: 0.25,
  advanced: 0.2,
} as const;

export type ScoreComponentKey = keyof typeof SCORE_WEIGHTS;

export function calculateWeightedScore(
  components: Record<ScoreComponentKey, Pick<ScoreComponent, "value">>,
) {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        Object.entries(SCORE_WEIGHTS).reduce(
          (total, [key, weight]) => total + components[key as ScoreComponentKey].value * weight,
          0,
        ),
      ),
    ),
  );
}

export function scoreBand(value: number) {
  return {
    grade: value >= 90 ? "A" as const : value >= 80 ? "B" as const : value >= 70 ? "C" as const : value >= 60 ? "D" as const : "F" as const,
    label: value >= 90
      ? "Excellent" as const
      : value >= 80
        ? "Good" as const
        : value >= 70
          ? "Mixed Static Signals" as const
          : value >= 60
            ? "Context Required" as const
            : "Weak" as const,
  };
}
