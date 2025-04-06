import React from "react";

interface StakingOverviewProps {
  stakingData: {
    totalStaked: number;
    activePackages: {
      name: string;
      staked: number;
      apy: number;
    }[];
  };
}

export default function StakingOverview({ stakingData }: StakingOverviewProps) {
  return (
    <div className="card">
      <h3 className="subtitle">Package Staking Overview</h3>

      <div className="staking-summary mb-4">
        <div className="staking-total">
          <div className="text-sm text-tertiary">Total Staked</div>
          <div className="text-2xl font-bold">
            {stakingData?.totalStaked || 0} <span className="text-sm">TEA</span>
          </div>
        </div>
        <div className="staking-count">
          <div className="text-sm text-tertiary">Active Packages</div>
          <div className="text-2xl font-bold">
            {stakingData?.activePackages?.length || 0}
          </div>
        </div>
      </div>

      {stakingData?.activePackages && stakingData.activePackages.length > 0 ? (
        <div className="staked-packages">
          <div className="text-sm text-tertiary mb-2">Your Staked Packages</div>
          {stakingData.activePackages.map((pkg, index) => (
            <div key={index} className="staked-package-item">
              <div className="package-name">{pkg.name}</div>
              <div className="package-details">
                <div className="staked-amount">{pkg.staked} TEA</div>
                <div className="package-apy">APY: {pkg.apy}%</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-staking">
          <div className="text-center py-4 text-tertiary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-2 opacity-40"
            >
              <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
            <p>No packages staked yet</p>
          </div>
        </div>
      )}
    </div>
  );
}
