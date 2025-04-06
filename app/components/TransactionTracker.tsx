import React, { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import TierProgressBar from "./TierProgressBar";

interface Transaction {
  id: string;
  hash: string;
  type: "Stake" | "Unstake" | "Transfer" | "Interaction";
  timestamp: Date;
  status: "Pending" | "Confirmed" | "Failed";
  amount?: number;
  packageName?: string;
  fromAddress?: string;
  toAddress?: string;
  walletAddress?: string;
}

interface TransactionTrackerProps {
  userStats: any;
  isWalletConnected: boolean;
  onConnectWallet: () => Promise<void>;
  walletAddress?: string;
}

export default function TransactionTracker({
  userStats,
  isWalletConnected,
  onConnectWallet,
  walletAddress,
}: TransactionTrackerProps) {
  const [timeFilter, setTimeFilter] = useState("today");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dailyTransactions, setDailyTransactions] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch transaction data from API
  const fetchTransactions = async () => {
    if (!isWalletConnected || !walletAddress) return;
    console.log("Fetching transactions for wallet:", walletAddress);

    const apiUrl = `/api/transactions?wallet=${walletAddress}&timeFilter=${timeFilter}`;
    console.log("Current API URL:", apiUrl);

    setIsTransactionsLoading(true);
    setError(null);

    try {
      const response = await fetch(apiUrl);
      console.log("API response status:", response.status);

      const responseJson = await response.json();
      console.log("API response full:", responseJson);

      if (responseJson.error) {
        throw new Error(responseJson.error);
      }

      // Extract data from responseJson
      const txData = responseJson.data || [];
      console.log("Extracted transactions:", txData);

      if (!Array.isArray(txData)) {
        console.warn("Transaction data is not an array:", txData);
        setTransactions([]);
        return;
      }

      // Process the transactions data
      const processedTxs = txData.map((tx: any) => {
        return {
          id: tx.id,
          hash: tx.hash,
          type: tx.type,
          timestamp: new Date(tx.timestamp),
          status: tx.status,
          amount: tx.amount,
          packageName: tx.package_name,
          fromAddress: tx.from_address,
          toAddress: tx.to_address,
          walletAddress: tx.wallet_address,
        };
      });

      console.log("Final processed transactions:", processedTxs);
      setTransactions(processedTxs);

      // If we're viewing today's transactions, update the count
      if (timeFilter === "today") {
        setDailyTransactions(processedTxs.length);
      }
    } catch (err: any) {
      console.error("Error fetching transactions:", err);
      setError(err.message || "Failed to load transactions");

      // Try to fetch from blockchain API as fallback
      fetchBlockchainTransactions();
    } finally {
      setIsTransactionsLoading(false);
    }
  };

  // Fallback to fetch from blockchain API
  const fetchBlockchainTransactions = async () => {
    if (!walletAddress) return;

    try {
      console.log("Fetching transactions from blockchain as fallback");

      const response = await fetch(
        `/api/blockchain-transactions?address=${walletAddress}`
      );
      const data = await response.json();

      console.log("Blockchain transactions response:", data);

      if (data.transactions && Array.isArray(data.transactions)) {
        console.log(
          `Received ${data.transactions.length} blockchain transactions`
        );

        setTransactions(
          data.transactions.map((tx: any) => ({
            ...tx,
            timestamp: new Date(tx.timestamp),
          }))
        );

        // Filter for today's transactions if needed
        if (timeFilter === "today") {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const todayTxs = data.transactions.filter(
            (tx: any) => new Date(tx.timestamp) >= today
          );
          setDailyTransactions(todayTxs.length);
        }
      } else {
        console.error("Invalid blockchain transactions response:", data);
      }
    } catch (err) {
      console.error("Error fetching blockchain transactions:", err);
    }
  };

  // Fetch daily transaction count
  const fetchDailyCount = async () => {
    if (!isWalletConnected || !walletAddress) return;

    setIsLoading(true);
    try {
      // Use the count API
      const response = await fetch(
        `/api/transactions/count?wallet=${walletAddress}`
      );
      const responseData = await response.json();

      console.log("Daily count response:", responseData);

      if (responseData.error) {
        throw new Error(responseData.error);
      }

      setDailyTransactions(responseData.data?.count || 0);
    } catch (err) {
      console.error("Error fetching daily transaction count:", err);
      // Fallback to local calculation
      if (transactions.length > 0 && timeFilter === "today") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayTxs = transactions.filter(
          (tx) => new Date(tx.timestamp) >= today
        );
        setDailyTransactions(todayTxs.length);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch data when component mounts or dependencies change
  useEffect(() => {
    if (isWalletConnected && walletAddress) {
      fetchTransactions();
    }
  }, [isWalletConnected, walletAddress, timeFilter]);

  // Also get the daily count initially and every minute
  useEffect(() => {
    if (isWalletConnected && walletAddress) {
      fetchDailyCount();

      // Refresh count every minute
      const countInterval = setInterval(fetchDailyCount, 60000);

      return () => clearInterval(countInterval);
    }
  }, [isWalletConnected, walletAddress]);

  // Calculate tier info based on transaction count
  function getTierInfo(count: number) {
    if (count >= 101)
      return {
        tier: "Tier 1",
        nextTier: "Max",
        remaining: 0,
        color: "#10B981",
      };
    if (count >= 51)
      return {
        tier: "Tier 2",
        nextTier: "Tier 1",
        remaining: 101 - count,
        color: "#3B82F6",
      };
    if (count >= 11)
      return {
        tier: "Tier 3",
        nextTier: "Tier 2",
        remaining: 51 - count,
        color: "#8B5CF6",
      };
    return {
      tier: "No Tier",
      nextTier: "Tier 3",
      remaining: 10 - count,
      color: "#6B7280",
    };
  }

  // Get the user's current tier info
  const todayTierInfo = getTierInfo(dailyTransactions);

  // Filter transactions based on the selected time filter
  const filteredTransactions = transactions.filter((tx) => {
    if (timeFilter === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return new Date(tx.timestamp) >= today;
    } else if (timeFilter === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(tx.timestamp) >= weekAgo;
    }
    return true; // "all" filter
  });

  // Wallet connection prompt when not connected
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
            <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
            <path d="M6 8h.01"></path>
            <path d="M10 8h.01"></path>
            <path d="M14 8h.01"></path>
            <path d="M18 8h.01"></path>
            <path d="M8 12h.01"></path>
            <path d="M12 12h.01"></path>
            <path d="M16 12h.01"></path>
            <path d="M7 16h10"></path>
          </svg>
          <h2 className="text-xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-tertiary mb-4">
            Connect your wallet to track your daily transactions and reward
            tiers
          </p>
          <button onClick={onConnectWallet} className="btn btn-primary">
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="transaction-tracker relative">
      {/* Coming Soon Overlay */}
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
            <p className="text-sm">Last updated: 2025-04-03 20:31:08</p>
          </div> */}
        </div>
      </div>

      {/* Content with blur effect */}
      <div
        className="content-container"
        style={{ filter: "blur(3px)", pointerEvents: "none" }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <div className="card col-span-1 daily-stats">
            <h3 className="subtitle">Today&apos;s Progress</h3>
            <div className="flex flex-col h-full">
              <div className="stats-box mb-4">
                {isLoading ? (
                  <div className="loading-skeleton h-10 w-24 mb-1"></div>
                ) : (
                  <div className="text-4xl font-bold">{dailyTransactions}</div>
                )}
                <div className="text-sm text-tertiary">Transactions Today</div>
              </div>

              <div className="current-tier mb-4">
                <div className="flex justify-between mb-1">
                  <span>
                    Current Tier: <strong>{todayTierInfo.tier}</strong>
                  </span>
                  <span className="text-tertiary">{dailyTransactions}/101</span>
                </div>
                <TierProgressBar
                  currentValue={dailyTransactions}
                  tier1={11}
                  tier2={51}
                  tier3={101}
                />
              </div>

              <div className="tier-info mt-auto">
                {todayTierInfo.tier !== "Max" && (
                  <div className="next-tier-info">
                    <div className="text-sm text-tertiary mb-1">
                      Next tier in
                    </div>
                    <div className="text-2xl font-semibold">
                      {todayTierInfo.remaining} transactions
                    </div>
                  </div>
                )}

                {todayTierInfo.tier === "Tier 1" && (
                  <div className="max-tier-reached mt-3">
                    <span className="badge badge-success">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-1"
                      >
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                      Maximum Tier Reached
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card col-span-1 lg:col-span-2">
            <div className="flex justify-between items-center mb-4">
              <h3 className="subtitle mb-0">Recent Transactions</h3>

              <div className="time-filter">
                <button
                  onClick={() => setTimeFilter("today")}
                  className={`time-filter-btn ${
                    timeFilter === "today" ? "active" : ""
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setTimeFilter("week")}
                  className={`time-filter-btn ${
                    timeFilter === "week" ? "active" : ""
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setTimeFilter("all")}
                  className={`time-filter-btn ${
                    timeFilter === "all" ? "active" : ""
                  }`}
                >
                  All
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm">
                <div className="flex items-start">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}

            <div className="transaction-list">
              {isTransactionsLoading ? (
                <div className="text-center py-8">
                  <div className="loading-spinner mx-auto mb-3"></div>
                  <p>Loading transactions...</p>
                </div>
              ) : filteredTransactions.length > 0 ? (
                <table className="w-full transaction-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Transaction Hash</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id}>
                        <td>
                          <span className={`tx-type ${tx.type.toLowerCase()}`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="hash-cell">
                          <a
                            href={`https://sepolia.tea.xyz/tx/${tx.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary truncate block max-w-[120px] xl:max-w-[200px]"
                          >
                            {tx.hash}
                          </a>
                        </td>
                        <td>
                          {formatDistanceToNow(new Date(tx.timestamp), {
                            addSuffix: true,
                          })}
                        </td>
                        <td>
                          <span
                            className={`status-badge ${tx.status.toLowerCase()}`}
                          >
                            <span className="status-dot"></span>
                            {tx.status}
                          </span>
                        </td>
                        <td>
                          {tx.packageName && (
                            <span className="text-sm">
                              {tx.type === "Stake"
                                ? "Staked in"
                                : "Unstaked from"}{" "}
                              <strong>{tx.packageName}</strong>
                            </span>
                          )}
                          {tx.amount && !tx.packageName && (
                            <span className="text-sm">
                              {tx.amount.toFixed(4)} TEA
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="empty-state">
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
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                  </svg>
                  <p>No transactions found in the selected time period</p>
                  {timeFilter !== "all" && (
                    <button
                      onClick={() => setTimeFilter("all")}
                      className="btn btn-sm btn-secondary mt-3"
                    >
                      View all transactions
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="subtitle">Tier History</h3>
          <div className="tier-history-chart">
            <div className="text-center py-8 text-tertiary">
              7-day transaction tier history chart will be displayed here
              {/* In a real app, you would render a chart showing tier history */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
