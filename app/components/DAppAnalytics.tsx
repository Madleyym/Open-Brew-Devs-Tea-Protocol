import React from "react";
import UsageChart from "./charts/UsageChart";

interface DAppAnalyticsProps {
  dappStats: any;
  isWalletConnected: boolean;
  onConnectWallet: () => Promise<void>;
}

export default function DAppAnalytics({
  dappStats,
  isWalletConnected,
  onConnectWallet,
}: DAppAnalyticsProps) {
  // Show the connect wallet prompt if wallet is not connected
  if (!isWalletConnected) {
    return (
      <div className="connect-wallet-prompt card">
        <div className="text-center py-10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-4 text-primary"
          >
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
          <h2 className="text-xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-tertiary mb-4">
            Connect your wallet to track your dApp usage and analytics
          </p>
          <button onClick={onConnectWallet} className="btn btn-primary">
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  // Get tier badge based on user count
  const getTierBadge = (userCount: number) => {
    if (userCount >= 1001) {
      return <span className="badge badge-success">Tier 1</span>;
    } else if (userCount >= 501) {
      return <span className="badge badge-primary">Tier 2</span>;
    } else if (userCount >= 101) {
      return <span className="badge badge-secondary">Tier 3</span>;
    } else {
      return <span className="badge badge-tertiary">No Tier</span>;
    }
  };

  return (
    <div className="dapp-analytics-container relative">
      {/* Coming Soon Overlay - Positioned earlier in the component structure */}
      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-50">
        <div className="bg-background p-8 rounded-lg shadow-lg text-center max-w-md">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-4 text-primary"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <h2 className="text-2xl font-bold mb-2">Coming Soon</h2>
          <p className="text-tertiary mb-4">
            This feature is currently under development and will be available
            soon.
          </p>
          {/* <div className="bg-primary-700 bg-opacity-20 text-primary-100 p-3 rounded-md mt-4">
            <p className="text-sm">
              Last updated: {new Date().toISOString().split("T")[0]}{" "}
              {new Date().toTimeString().split(" ")[0]}
            </p>
          </div> */}
        </div>
      </div>

      {/* Original content */}
      <div
        className="content-container"
        style={{ filter: "blur(3px)", pointerEvents: "none" }}
      >
        <div className="card mb-4">
          <h3 className="subtitle">dApp Reward Tiers</h3>
          <div className="tier-explanation">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="tier-card tier-3">
                <div className="tier-header">
                  <h4>Tier 3</h4>
                  <span className="tier-badge">Basic</span>
                </div>
                <div className="tier-target">101+ daily users</div>
                <div className="tier-progress-container">
                  <div className="tier-progress">
                    <div
                      className="tier-progress-bar"
                      style={{ width: "33%" }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="tier-card tier-2">
                <div className="tier-header">
                  <h4>Tier 2</h4>
                  <span className="tier-badge">Advanced</span>
                </div>
                <div className="tier-target">501+ daily users</div>
                <div className="tier-progress-container">
                  <div className="tier-progress">
                    <div
                      className="tier-progress-bar"
                      style={{ width: "66%" }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="tier-card tier-1">
                <div className="tier-header">
                  <h4>Tier 1</h4>
                  <span className="tier-badge">Expert</span>
                </div>
                <div className="tier-target">1001+ daily users</div>
                <div className="tier-progress-container">
                  <div className="tier-progress">
                    <div
                      className="tier-progress-bar"
                      style={{ width: "100%" }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {dappStats && dappStats.length > 0 ? (
          <>
            <div className="card mb-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="subtitle mb-0">Your dApps</h3>
                <button className="btn btn-primary btn-sm">
                  Deploy New dApp
                </button>
              </div>

              <div className="dapps-table-container">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th>dApp Name</th>
                      <th>Daily Users</th>
                      <th>Weekly Users</th>
                      <th>Current Tier</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dappStats.map((dapp: any, index: number) => (
                      <tr key={index}>
                        <td>{dapp.name}</td>
                        <td>{dapp.dailyUsers}</td>
                        <td>{dapp.weeklyUsers}</td>
                        <td>{getTierBadge(dapp.dailyUsers)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h3 className="subtitle">User Growth</h3>
              <UsageChart usageData={dappStats[0].userHistory} />
            </div>
          </>
        ) : (
          <div className="card text-center py-10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-4 text-primary opacity-40"
            >
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
            <h2 className="text-xl font-bold mb-2">No dApps Deployed Yet</h2>
            <p className="text-tertiary mb-4">
              Deploy your first dApp on TEA Sepolia to start earning rewards
            </p>
            <button className="btn btn-primary">Deploy First dApp</button>
          </div>
        )}
      </div>
    </div>
  );
}
