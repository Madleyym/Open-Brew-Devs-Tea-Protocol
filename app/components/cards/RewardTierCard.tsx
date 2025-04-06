import React from "react";

interface RewardTierCardProps {
  title: string;
  currentValue: number;
  tier1: number;
  tier2: number;
  tier3: number;
  unit: string;
  icon: string;
}

export default function RewardTierCard({
  title,
  currentValue,
  tier1,
  tier2,
  tier3,
  unit,
  icon,
}: RewardTierCardProps) {
  let currentTier = "No Tier";
  let tierColor = "var(--text-tertiary)";
  let progress = 0;
  let nextTier = tier1;
  let remaining = tier1 - currentValue;

  if (currentValue >= tier3) {
    currentTier = "Tier 1";
    tierColor = "var(--success)";
    progress = 100;
    nextTier = tier3;
    remaining = 0;
  } else if (currentValue >= tier2) {
    currentTier = "Tier 2";
    tierColor = "#3B82F6";
    progress = 66;
    nextTier = tier3;
    remaining = tier3 - currentValue;
  } else if (currentValue >= tier1) {
    currentTier = "Tier 3";
    tierColor = "#8B5CF6";
    progress = 33;
    nextTier = tier2;
    remaining = tier2 - currentValue;
  } else {
    progress = (currentValue / tier1) * 33;
  }

  return (
    <div className="reward-tier-card card">
      <div className="reward-tier-header">
        <div className="reward-tier-title">{title}</div>
        {icon === "activity" && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="reward-tier-icon"
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
        )}
        {icon === "users" && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="reward-tier-icon"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        )}
        {icon === "package" && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="reward-tier-icon"
          >
            <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
        )}
      </div>

      <div className="reward-tier-value">
        <span className="current-value">{currentValue}</span>
        <span className="unit">{unit}</span>
      </div>

      <div className="reward-tier-progress-container">
        <div className="reward-tier-info">
          <div className="current-tier" style={{ color: tierColor }}>
            {currentTier}
          </div>
          <div className="tier-thresholds">
            <span>{tier1}</span>
            <span>{tier2}</span>
            <span>{tier3}</span>
          </div>
        </div>

        <div className="reward-tier-progress">
          <div
            className="reward-tier-progress-bar"
            style={{ width: `${progress}%`, backgroundColor: tierColor }}
          ></div>
        </div>

        {remaining > 0 && (
          <div className="reward-tier-remaining">
            <span>
              {remaining} more to{" "}
              {nextTier === tier1
                ? "Tier 3"
                : nextTier === tier2
                ? "Tier 2"
                : "Tier 1"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
