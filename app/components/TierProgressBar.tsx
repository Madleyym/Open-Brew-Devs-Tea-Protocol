import React from "react";

interface TierProgressBarProps {
  currentValue: number;
  tier1: number;
  tier2: number;
  tier3: number;
}

export default function TierProgressBar({
  currentValue,
  tier1,
  tier2,
  tier3,
}: TierProgressBarProps) {
  const max = tier3;
  const segment1Width = (tier1 / max) * 100;
  const segment2Width = ((tier2 - tier1) / max) * 100;
  const segment3Width = ((tier3 - tier2) / max) * 100;

  const completedTier1 = currentValue >= tier1;
  const completedTier2 = currentValue >= tier2;
  const completedTier3 = currentValue >= tier3;

  const currentSegment1 = Math.min(currentValue, tier1);
  const currentSegment2 = completedTier1
    ? Math.min(currentValue - tier1, tier2 - tier1)
    : 0;
  const currentSegment3 = completedTier2
    ? Math.min(currentValue - tier2, tier3 - tier2)
    : 0;

  const segment1Percentage = (currentSegment1 / tier1) * segment1Width;
  const segment2Percentage =
    currentSegment2 > 0
      ? (currentSegment2 / (tier2 - tier1)) * segment2Width
      : 0;
  const segment3Percentage =
    currentSegment3 > 0
      ? (currentSegment3 / (tier3 - tier2)) * segment3Width
      : 0;

  return (
    <div className="tier-progress">
      <div className="tier-progress-segments">
        {/* Tier 3 segment */}
        <div
          className="tier-progress-segment tier-progress-segment-1"
          style={{ width: `${segment1Percentage}%` }}
        />
        <div
          className="tier-progress-segment tier-progress-segment-empty"
          style={{
            width: `${
              completedTier1 ? 0 : segment1Width - segment1Percentage
            }%`,
          }}
        />

        {/* Tier 2 segment */}
        <div
          className="tier-progress-segment tier-progress-segment-2"
          style={{ width: `${segment2Percentage}%` }}
        />
        <div
          className="tier-progress-segment tier-progress-segment-empty"
          style={{
            width: `${
              completedTier2 ? 0 : segment2Width - segment2Percentage
            }%`,
          }}
        />

        {/* Tier 1 segment */}
        <div
          className="tier-progress-segment tier-progress-segment-3"
          style={{ width: `${segment3Percentage}%` }}
        />
        <div
          className="tier-progress-segment tier-progress-segment-empty"
          style={{
            width: `${
              completedTier3 ? 0 : segment3Width - segment3Percentage
            }%`,
          }}
        />
      </div>
    </div>
  );
}
