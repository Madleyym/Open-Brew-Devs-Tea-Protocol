"use client";

import React, { useEffect, useState } from "react";
import ActivityChart from "./charts/ActivityChart";
import CountdownTimer from "./CountdownTimer";
import { Bar, Line, Pie } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
import supabase from "@/lib/supabase";
import { fetchDexStatistics } from "@/services/transactionLogService";

// Import CSS module
import styles from "@/styles/DashboardOverview.module.css";

// Register Chart.js components
Chart.register(...registerables);

// TEA Protocol contract configuration
const TEA_CONFIG = {
  STAKING_CONTRACT: "0xbba4121A3bDE406Be131257C8918F67c97789166",
  CHAIN_ID: 10218, // TEA Sepolia chain ID
  NETWORK_NAME: "Tea Sepolia",
  RPC_URL: "https://tea-sepolia.g.alchemy.com/public",
  EXPLORER_URL: "https://sepolia.tea.xyz/",
  CURRENCY_SYMBOL: "TEA",
};

interface DashboardOverviewProps {
  userStats: any;
  isWalletConnected: boolean;
  onConnectWallet: () => Promise<void>;
  walletAddress?: string;
}

// Interface untuk data staking
interface StakingData {
  totalStaked: number;
  activePackages: Array<{
    name: string;
    staked: number;
    apy: number;
  }>;
}

// Interface untuk top staked packages
interface TopPackage {
  name: string;
  category: string;
  staked: number;
  stakerCount: number;
  downloads: string | number;
}

// Interface untuk aktivitas yang diharapkan oleh ActivityChart
interface ActivityItem {
  date: string;
  transactions: number;
  tier: number;
}

// Interface untuk analytics data
interface AnalyticsData {
  totalStaked: number;
  uniqueStakers: number;
  packageCount: number;
  avgApy: number;
  stakingTrends: Array<{
    date: string;
    total_staked: number;
    new_stakes: number;
  }>;
  categoryDistribution: Array<{
    category: string;
    count: number;
    total_staked: number;
  }>;
  topPackages: Array<{
    id: string;
    name: string;
    category: string;
    downloads: string;
    stakes: {
      count: number;
      sum_amount: number;
    }[];
  }>;
}

// Interface untuk DEX statistics
interface DexStats {
  totalSwaps: number;
  totalLiquidityAdds: number;
  totalVolume: string;
  activeUsers: number;
}

// Interface untuk DEX activity data
interface DexActivityItem {
  date: string;
  volume: number;
  swapCount: number;
}

export default function DashboardOverview({
  userStats,
  isWalletConnected,
  onConnectWallet,
  walletAddress,
}: DashboardOverviewProps) {
  const [stakingData, setStakingData] = useState<StakingData>({
    totalStaked: 0,
    activePackages: [],
  });

  const [topPackages, setTopPackages] = useState<TopPackage[]>([]);
  const [activityHistory, setActivityHistory] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [packageCount, setPackageCount] = useState<number>(0);
  const [stakerCount, setStakerCount] = useState<number>(0);
  const [hasSupabase, setHasSupabase] = useState<boolean>(!!supabase);

  // Analytics states
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalStaked: 0,
    uniqueStakers: 0,
    packageCount: 0,
    avgApy: 0,
    stakingTrends: [],
    categoryDistribution: [],
    topPackages: [],
  });
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">(
    "30d"
  );
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // DEX states
  const [dexStats, setDexStats] = useState<DexStats>({
    totalSwaps: 0,
    totalLiquidityAdds: 0,
    totalVolume: "0",
    activeUsers: 0,
  });
  const [dexActivity, setDexActivity] = useState<DexActivityItem[]>([]);
  const [dexTimeRange, setDexTimeRange] = useState<"7d" | "30d" | "all">("7d");
  const [dexLoading, setDexLoading] = useState<boolean>(true);

  // Helper function to get time filter
  function getTimeFilter(range: "7d" | "30d" | "90d" | "all"): string {
    const now = new Date();
    switch (range) {
      case "7d":
        return new Date(now.setDate(now.getDate() - 7)).toISOString();
      case "30d":
        return new Date(now.setDate(now.getDate() - 30)).toISOString();
      case "90d":
        return new Date(now.setDate(now.getDate() - 90)).toISOString();
      case "all":
      default:
        return new Date(2020, 0, 1).toISOString(); // Start from 2020
    }
  }

  // Generate default history if no data
  function generateDefaultHistory(): ActivityItem[] {
    const last7Days: ActivityItem[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split("T")[0];
      last7Days.push({
        date: dayStr,
        transactions: 0,
        tier: 0,
      });
    }
    return last7Days;
  }

  // Fetch analytics data
  async function fetchAnalyticsData() {
    setAnalyticsLoading(true);
    setAnalyticsError(null);

    try {
      console.log("Fetching analytics data...");

      // Check if Supabase is available
      if (!hasSupabase) {
        console.warn("Supabase client not available.");
        return;
      }

      // Define a new analytics data object with proper typing
      const analytics: AnalyticsData = {
        totalStaked: 0,
        uniqueStakers: 0,
        packageCount: 0,
        avgApy: 0,
        stakingTrends: [],
        categoryDistribution: [],
        topPackages: [],
      };

      // Fetching total staking stats with direct query instead of RPC
      try {
        console.log("Fetching protocol stats directly...");

        // Get total staked amount from user_stakes table
        const { data: stakeData, error: stakeError } = await supabase
          .from("user_stakes")
          .select("amount")
          .not("amount", "is", null);

        if (stakeError) {
          console.error("Error fetching stake data:", stakeError);
        } else if (stakeData) {
          // Calculate total staked amount
          analytics.totalStaked = stakeData.reduce(
            (sum, item) => sum + (item.amount || 0),
            0
          );

          // Get unique stakers count
          const { count: stakers, error: stakersError } = await supabase
            .from("user_stakes")
            .select("user_id", { count: "exact", head: true })
            .not("user_id", "is", null);

          if (!stakersError && stakers !== null) {
            analytics.uniqueStakers = stakers;
          }

          // Get package count
          const { count: packages, error: packagesError } = await supabase
            .from("packages")
            .select("id", { count: "exact", head: true });

          if (!packagesError && packages !== null) {
            analytics.packageCount = packages;
          }

          // Calculate average APY (simplified)
          const { data: apyData, error: apyError } = await supabase
            .from("user_stakes")
            .select("apy")
            .not("apy", "is", null);

          if (!apyError && apyData && apyData.length > 0) {
            const total = apyData.reduce(
              (sum, item) => sum + (item.apy || 0),
              0
            );
            analytics.avgApy = total / apyData.length;
          } else {
            // Default APY if no data
            analytics.avgApy = 0;
          }
        }
      } catch (error) {
        console.error("Failed to fetch protocol stats:", error);
      }

      // Fetch staking trends - direct query approach
      try {
        console.log("Fetching staking trends with direct query...");

        // Set last 30 days as default (or based on timeRange)
        const daysToFetch =
          timeRange === "7d"
            ? 7
            : timeRange === "30d"
            ? 30
            : timeRange === "90d"
            ? 90
            : 180; // For "all" we'll limit to 180 days

        // Generate array of dates to analyze
        const dateArray = [];
        for (let i = daysToFetch - 1; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          date.setHours(0, 0, 0, 0);
          dateArray.push(date.toISOString().split("T")[0]);
        }

        // Get history data within range
        const startDate = dateArray[0] + "T00:00:00";

        const { data: historyData, error: historyError } = await supabase
          .from("staking_history")
          .select("value, timestamp")
          .gte("timestamp", startDate)
          .order("timestamp", { ascending: true });

        if (historyError) {
          console.error("Error fetching staking history:", historyError);
        } else if (historyData) {
          // Process history data to create trend points
          const trendMap = new Map<
            string,
            { total_staked: number; new_stakes: number }
          >();

          // Initialize map with all dates
          dateArray.forEach((date) => {
            trendMap.set(date, { total_staked: 0, new_stakes: 0 });
          });

          // Add data from history
          let runningTotal = 0;
          historyData.forEach((item) => {
            const date = item.timestamp.split("T")[0];
            if (trendMap.has(date)) {
              const current = trendMap.get(date)!;
              current.new_stakes += 1;
              runningTotal += item.value;
              current.total_staked = runningTotal;
              trendMap.set(date, current);
            }
          });

          // Convert map to array and ensure running totals are maintained
          let lastTotal = 0;
          analytics.stakingTrends = dateArray.map((date) => {
            const data = trendMap.get(date)!;
            if (data.total_staked === 0 && lastTotal > 0) {
              data.total_staked = lastTotal;
            } else {
              lastTotal = data.total_staked;
            }
            return {
              date: date,
              total_staked: data.total_staked,
              new_stakes: data.new_stakes,
            };
          });
        }
      } catch (error) {
        console.error("Failed to fetch staking trends:", error);
      }

      // Fetch category distribution
      try {
        console.log("Fetching category distribution...");

        // Get categories with stakes from packages and user_stakes tables
        const { data: categoryData, error: categoryError } =
          await supabase.from("packages").select(`
            id, 
            category,
            user_stakes(amount)
          `);

        if (categoryError) {
          console.error("Error fetching category data:", categoryError);
        } else if (categoryData) {
          // Process category data
          const categoryMap = new Map<
            string,
            { count: number; total_staked: number }
          >();

          categoryData.forEach((pkg) => {
            const category = pkg.category || "Other";
            let totalStaked = 0;

            // Calculate total staked for this package
            if (pkg.user_stakes && pkg.user_stakes.length > 0) {
              totalStaked = pkg.user_stakes.reduce(
                (sum, stake) => sum + (stake.amount || 0),
                0
              );
            }

            if (categoryMap.has(category)) {
              const current = categoryMap.get(category)!;
              current.count += 1;
              current.total_staked += totalStaked;
              categoryMap.set(category, current);
            } else {
              categoryMap.set(category, {
                count: 1,
                total_staked: totalStaked,
              });
            }
          });

          // Convert map to array and sort by total staked
          analytics.categoryDistribution = Array.from(categoryMap.entries())
            .map(([category, data]) => ({
              category,
              count: data.count,
              total_staked: data.total_staked,
            }))
            .sort((a, b) => b.total_staked - a.total_staked);
        }
      } catch (error) {
        console.error("Failed to fetch category distribution:", error);
      }

      // Fetch top packages
      try {
        console.log("Fetching top packages...");

        // Get packages with their stake amounts
        const { data: packages, error: packagesError } = await supabase.from(
          "packages"
        ).select(`
            id,
            name,
            category,
            downloads,
            user_stakes(amount)
          `);

        if (packagesError) {
          console.error("Error fetching packages:", packagesError);
        } else if (packages) {
          // Process package data to calculate stakes
          const topPackages = packages.map((pkg) => {
            // Calculate total staked and count
            let sumAmount = 0;
            let count = 0;

            if (pkg.user_stakes && pkg.user_stakes.length > 0) {
              count = pkg.user_stakes.length;
              sumAmount = pkg.user_stakes.reduce(
                (sum, stake) => sum + (stake.amount || 0),
                0
              );
            }

            return {
              id: pkg.id,
              name: pkg.name || "Unknown Package",
              category: pkg.category || "Other",
              downloads: pkg.downloads || "N/A",
              stakes: [
                {
                  count: count,
                  sum_amount: sumAmount,
                },
              ],
            };
          });

          // Sort by total staked amount and take top 10
          analytics.topPackages = topPackages
            .sort((a, b) => {
              const aAmount =
                a.stakes && a.stakes[0] ? a.stakes[0].sum_amount : 0;
              const bAmount =
                b.stakes && b.stakes[0] ? b.stakes[0].sum_amount : 0;
              return bAmount - aAmount;
            })
            .slice(0, 10);
        }
      } catch (error) {
        console.error("Failed to fetch top packages:", error);
      }

      // Set the analytics data if we have any data
      setAnalyticsData(analytics);

      // Also update dashboard state with this data
      setStakingData({
        totalStaked: analytics.totalStaked,
        activePackages: analytics.topPackages.slice(0, 3).map((pkg) => ({
          name: pkg.name,
          staked: pkg.stakes && pkg.stakes[0] ? pkg.stakes[0].sum_amount : 0,
          apy: Math.floor(Math.random() * 6) + 5, // Random APY between 5-10% for display
        })),
      });

      setPackageCount(analytics.packageCount);
      setStakerCount(analytics.uniqueStakers);

      // Convert top packages for table display
      setTopPackages(
        analytics.topPackages.map((pkg) => ({
          name: pkg.name,
          category: pkg.category,
          staked: pkg.stakes && pkg.stakes[0] ? pkg.stakes[0].sum_amount : 0,
          stakerCount: pkg.stakes && pkg.stakes[0] ? pkg.stakes[0].count : 0,
          downloads: pkg.downloads,
        }))
      );
    } catch (err) {
      console.error("Error in fetchAnalyticsData:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setAnalyticsError(`Failed to load analytics: ${errorMessage}`);
    } finally {
      setAnalyticsLoading(false);
    }
  }

  // Fetch activity history for the past 7 days
  async function fetchActivityHistory() {
    try {
      console.log("Fetching activity history...");

      if (!hasSupabase) {
        console.warn("Supabase client not available.");
        return;
      }

      // Generate last 7 days dates
      const activityData: ActivityItem[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStr = date.toISOString().split("T")[0];

        activityData.push({
          date: dayStr,
          transactions: 0,
          tier: 0,
        });
      }

      // Get 7 day time range
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const startDate = sevenDaysAgo.toISOString().split("T")[0] + "T00:00:00";

      // Query staking history directly
      const { data, error } = await supabase
        .from("staking_history")
        .select("timestamp")
        .gte("timestamp", startDate)
        .order("timestamp", { ascending: true });

      if (error) {
        console.error("Error fetching activity history:", error);
        throw error;
      }

      if (data && data.length > 0) {
        // Aggregate transactions by day
        const dailyCounts = new Map<string, number>();

        // Initialize with our date range
        activityData.forEach((item) => {
          dailyCounts.set(item.date, 0);
        });

        // Count transactions by day
        data.forEach((item) => {
          const day = item.timestamp.split("T")[0];
          if (dailyCounts.has(day)) {
            dailyCounts.set(day, (dailyCounts.get(day) || 0) + 1);
          }
        });

        // Update activity data with transaction counts and tiers
        activityData.forEach((item, index) => {
          const count = dailyCounts.get(item.date) || 0;
          activityData[index].transactions = count;
          activityData[index].tier = getTierFromTransactionCount(count);
        });

        setActivityHistory(activityData);
      } else {
        // If no data, use default history
        const defaultHistory = generateDefaultHistory();
        setActivityHistory(defaultHistory);
      }
    } catch (error) {
      console.error("Failed to fetch activity history:", error);
      setActivityHistory(generateDefaultHistory());
    }
  }

  // Fetch DEX data
  async function fetchDexData() {
    setDexLoading(true);

    try {
      console.log("Fetching DEX data...");

      // Initialize with empty data
      setDexActivity([]);

      if (!hasSupabase) {
        console.warn("Supabase client not available.");
        setDexLoading(false);
        return;
      }

      // Get DEX statistics
      try {
        console.log("Fetching DEX statistics...");
        const stats = await fetchDexStatistics();

        // Format volume with 2 decimal places for consistency
        if (stats && stats.totalVolume) {
          const formattedVolume = parseFloat(stats.totalVolume).toFixed(2);
          stats.totalVolume = formattedVolume;
        }

        setDexStats(
          stats || {
            totalSwaps: 0,
            totalLiquidityAdds: 0,
            totalVolume: "0",
            activeUsers: 0,
          }
        );
      } catch (error) {
        console.error("Failed to fetch DEX statistics:", error);
        setDexStats({
          totalSwaps: 0,
          totalLiquidityAdds: 0,
          totalVolume: "0",
          activeUsers: 0,
        });
      }

      // Get DEX activity (volume by day)
      try {
        // Determine date range based on selected timeRange
        const days =
          dexTimeRange === "7d" ? 7 : dexTimeRange === "30d" ? 30 : 90;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const startDateStr = startDate.toISOString();

        // Create activity array with dates
        const activityData: DexActivityItem[] = [];
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dayStr = date.toISOString().split("T")[0];
          activityData.push({
            date: dayStr,
            volume: 0,
            swapCount: 0,
          });
        }

        // Query transactions and swap details
        const { data, error } = await supabase
          .from("transactions")
          .select(
            `
            tx_hash,
            tx_type,
            timestamp,
            swap_details(amount_in)
          `
          )
          .eq("tx_type", "swap")
          .eq("status", "completed")
          .gte("timestamp", startDateStr)
          .order("timestamp", { ascending: true });

        if (error) {
          console.error("Error fetching DEX activity:", error);
          setDexActivity(activityData); // Use empty activity data
        } else if (data && data.length > 0) {
          // Process transaction data
          const volumeByDay = new Map<
            string,
            { volume: number; count: number }
          >();

          // Initialize with dates
          activityData.forEach((item) => {
            volumeByDay.set(item.date, { volume: 0, count: 0 });
          });

          // Aggregate data by day
          data.forEach((tx) => {
            if (!tx || !tx.timestamp) return;

            const day = tx.timestamp.split("T")[0];
            if (volumeByDay.has(day)) {
              const current = volumeByDay.get(day)!;
              current.count += 1;

              // Add to volume if swap details exist
              if (
                tx.swap_details &&
                Array.isArray(tx.swap_details) &&
                tx.swap_details.length > 0
              ) {
                const amountIn = tx.swap_details[0]?.amount_in;
                if (amountIn) {
                  current.volume += parseFloat(amountIn) || 0;
                }
              }

              volumeByDay.set(day, current);
            }
          });

          // Update activity data
          activityData.forEach((item, index) => {
            const dayData = volumeByDay.get(item.date);
            if (dayData) {
              activityData[index].volume = dayData.volume;
              activityData[index].swapCount = dayData.count;
            }
          });

          setDexActivity(activityData);
        } else {
          setDexActivity(activityData); // Use empty activity data
        }
      } catch (error) {
        console.error("Failed to process DEX activity data:", error);
        const emptyActivity: DexActivityItem[] = [];
        setDexActivity(emptyActivity);
      }
    } catch (err) {
      console.error("Error in fetchDexData:", err);
      setDexActivity([]);
    } finally {
      setDexLoading(false);
    }
  }

  // Helper function to determine tier based on transaction count
  function getTierFromTransactionCount(count: number): number {
    if (count <= 0) return 0;
    if (count < 1000) return 1;
    if (count < 2500) return 2;
    return 3;
  }

  // Fetch public data when component mounts
  useEffect(() => {
    async function fetchPublicData() {
      setIsLoading(true);
      setError(null);

      try {
        console.log("Fetching dashboard data...");

        // Check if Supabase is available
        if (!supabase) {
          console.warn("Supabase client not available.");
          setHasSupabase(false);
          return;
        }

        // Load all data in parallel
        await Promise.all([
          fetchAnalyticsData(),
          fetchActivityHistory(),
          fetchDexData(),
        ]);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(`Failed to load dashboard: ${errorMessage}`);
      } finally {
        setIsLoading(false);
        setAnalyticsLoading(false);
        setDexLoading(false);
      }
    }

    fetchPublicData();
  }, []);

  // Update analytics data when timeRange changes
  useEffect(() => {
    if (!isLoading) {
      fetchAnalyticsData();
    }
  }, [timeRange]);

  // Update DEX data when dexTimeRange changes
  useEffect(() => {
    if (!isLoading) {
      fetchDexData();
    }
  }, [dexTimeRange]);

  // View for public dashboard
  return (
    <div className={styles.dashboardGrid}>
      {/* Header Section - Info & Timer */}
      <div className={styles.card + " " + styles.phaseInfo}>
        <div className={styles.flexBetween + " " + styles.mb4}>
          <h2 className={styles.subtitle}>
            Phase 2: Package Staking & Final Sprint
          </h2>
          <span className={styles.badge + " " + styles.badgeWhite}>Active</span>
        </div>
        <div
          className={
            styles.grid + " " + styles.gridCols1 + " " + styles.mdGridCols3
          }
        >
          <div>
            <div className={styles.textSm + " " + styles.mb2}>
              Time Remaining
            </div>
            <CountdownTimer targetDate={new Date("2025-04-20T23:59:59Z")} />
          </div>
          <div></div>
        </div>
      </div>

      {/* Main Stats Section */}
      <div
        className={
          styles.grid +
          " " +
          styles.gridCols1 +
          " " +
          styles.mdGridCols4 +
          " " +
          styles.mb4
        }
      >
        <div className={styles.statCard}>
          <div className={styles.statTitle}>Total Staked</div>
          <div className={styles.statValue + " " + styles.textPrimary}>
            {Number(analyticsData.totalStaked || 0).toLocaleString()}{" "}
            <span className={styles.textSm}>TEA</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statTitle}>Unique Stakers</div>
          <div className={styles.statValue + " " + styles.textSecondary}>
            {Number(analyticsData.uniqueStakers || 0).toLocaleString()}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statTitle}>Packages</div>
          <div className={styles.statValue + " " + styles.textTertiary}>
            {Number(analyticsData.packageCount || 0).toLocaleString()}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statTitle}>Avg. APY</div>
          <div className={styles.statValue + " " + styles.textSuccess}>
            {Number(analyticsData.avgApy || 0).toFixed(2)}%
          </div>
        </div>
      </div>

      {/* DEX Stats Section */}
      <div
        className={
          styles.grid +
          " " +
          styles.gridCols1 +
          " " +
          styles.mdGridCols4 +
          " " +
          styles.mb4
        }
      >
        <div className={styles.statCard}>
          <div className={styles.statTitle}>DEX Volume (7d)</div>
          <div className={styles.statValue + " " + styles.textSuccess}>
            {Number(dexStats.totalVolume || 0).toLocaleString()}{" "}
            <span className={styles.textSm}>TEA</span>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statTitle}>Total Swaps</div>
          <div className={styles.statValue + " " + styles.textPrimary}>
            {Number(dexStats.totalSwaps || 0).toLocaleString()}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statTitle}>Liquidity Providers</div>
          <div className={styles.statValue + " " + styles.textSecondary}>
            {Number(dexStats.totalLiquidityAdds || 0).toLocaleString()}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statTitle}>Active Traders</div>
          <div className={styles.statValue + " " + styles.textTertiary}>
            {Number(dexStats.activeUsers || 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Staking Trends & Category Distribution */}
      <div
        className={
          styles.grid +
          " " +
          styles.gridCols1 +
          " " +
          styles.lgGridCols2 +
          " " +
          styles.mb4
        }
      >
        {/* Staking Trends Chart */}
        <div className={styles.card}>
          <h3 className={styles.subtitle}>Staking Trends</h3>
          <div className={styles.timeRangeSelector}>
            <button
              className={`${styles.rangeBtn} ${
                timeRange === "7d" ? styles.rangeBtnActive : ""
              }`}
              onClick={() => setTimeRange("7d")}
            >
              7 Days
            </button>
            <button
              className={`${styles.rangeBtn} ${
                timeRange === "30d" ? styles.rangeBtnActive : ""
              }`}
              onClick={() => setTimeRange("30d")}
            >
              30 Days
            </button>
            <button
              className={`${styles.rangeBtn} ${
                timeRange === "90d" ? styles.rangeBtnActive : ""
              }`}
              onClick={() => setTimeRange("90d")}
            >
              90 Days
            </button>
            <button
              className={`${styles.rangeBtn} ${
                timeRange === "all" ? styles.rangeBtnActive : ""
              }`}
              onClick={() => setTimeRange("all")}
            >
              All Time
            </button>
          </div>

          <div className={styles.chartContainer}>
            {analyticsLoading ? (
              <div
                className={styles.flexCol}
                style={{ height: "100%", justifyContent: "center" }}
              >
                <div className={styles.loader}></div>
              </div>
            ) : (
              <Line
                data={{
                  labels: analyticsData.stakingTrends.map((item) =>
                    new Date(item.date).toLocaleDateString()
                  ),
                  datasets: [
                    {
                      label: "Total Staked (TEA)",
                      data: analyticsData.stakingTrends.map(
                        (item) => item.total_staked
                      ),
                      borderColor: "#00c07f",
                      backgroundColor: "rgba(0, 192, 127, 0.1)",
                      tension: 0.2,
                      fill: true,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                    tooltip: {
                      mode: "index",
                      intersect: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: function (value: any) {
                          return value.toLocaleString() + " TEA";
                        },
                      },
                    },
                  },
                }}
              />
            )}
          </div>
        </div>

        {/* Category Distribution Chart */}
        <div className={styles.card}>
          <h3 className={styles.subtitle}>Category Distribution</h3>
          <div className={styles.chartContainer}>
            {analyticsLoading ? (
              <div
                className={styles.flexCol}
                style={{ height: "100%", justifyContent: "center" }}
              >
                <div className={styles.loader}></div>
              </div>
            ) : (
              <Pie
                data={{
                  labels: analyticsData.categoryDistribution.map(
                    (item) => item.category
                  ),
                  datasets: [
                    {
                      data: analyticsData.categoryDistribution.map(
                        (item) => item.total_staked
                      ),
                      backgroundColor: [
                        "#00c07f", // Primary
                        "#3b82f6", // Blue
                        "#8b5cf6", // Purple
                        "#ec4899", // Pink
                        "#f59e0b", // Amber
                      ],
                      hoverOffset: 4,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "right",
                      labels: {
                        boxWidth: 15,
                        padding: 15,
                      },
                    },
                    tooltip: {
                      callbacks: {
                        label: function (context) {
                          const label = context.label || "";
                          const value = context.raw || 0;
                          return `${label}: ${Number(
                            value
                          ).toLocaleString()} TEA`;
                        },
                      },
                    },
                  },
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* DEX Trading Activity & 7-Day Global Staking Activity - Side by Side */}
      <div
        className={
          styles.grid +
          " " +
          styles.gridCols1 +
          " " +
          styles.lgGridCols2 +
          " " +
          styles.mb4
        }
      >
        {/* DEX Trading Activity Chart */}
        <div className={styles.card}>
          <h3 className={styles.subtitle}>DEX Trading Activity</h3>
          <div className={styles.timeRangeSelector}>
            <button
              className={`${styles.rangeBtn} ${
                dexTimeRange === "7d" ? styles.rangeBtnActive : ""
              }`}
              onClick={() => setDexTimeRange("7d")}
            >
              7 Days
            </button>
            <button
              className={`${styles.rangeBtn} ${
                dexTimeRange === "30d" ? styles.rangeBtnActive : ""
              }`}
              onClick={() => setDexTimeRange("30d")}
            >
              30 Days
            </button>
            <button
              className={`${styles.rangeBtn} ${
                dexTimeRange === "all" ? styles.rangeBtnActive : ""
              }`}
              onClick={() => setDexTimeRange("all")}
            >
              All Time
            </button>
          </div>

          <div className={styles.chartContainer}>
            {dexLoading ? (
              <div
                className={styles.flexCol}
                style={{ height: "100%", justifyContent: "center" }}
              >
                <div className={styles.loader}></div>
              </div>
            ) : (
              <Bar
                data={{
                  labels: dexActivity.map((item) =>
                    new Date(item.date).toLocaleDateString()
                  ),
                  datasets: [
                    {
                      label: "Daily Volume (TEA)",
                      data: dexActivity.map((item) => item.volume),
                      backgroundColor: "#3b82f6",
                      borderColor: "#2563eb",
                      borderWidth: 1,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                    tooltip: {
                      callbacks: {
                        label: function (context) {
                          const value = context.raw as number;
                          const dataIndex = context.dataIndex;
                          const swapCount = dexActivity[dataIndex].swapCount;
                          return [
                            `Volume: ${value.toLocaleString()} TEA`,
                            `Swaps: ${swapCount}`,
                          ];
                        },
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: function (value) {
                          return value.toLocaleString() + " TEA";
                        },
                      },
                    },
                  },
                }}
              />
            )}
          </div>
        </div>

        {/* 7-Day Global Staking Activity */}
        <div className={styles.card}>
          <h3 className={styles.subtitle}>7-Day Global Staking Activity</h3>
          {isLoading ? (
            <div
              className={styles.flexCol}
              style={{ height: "200px", justifyContent: "center" }}
            >
              <div className={styles.loader}></div>
            </div>
          ) : (
            <>
              <ActivityChart data={activityHistory} />
              <div
                className={`${styles.textCenter} ${styles.textXs} ${styles.textTertiary} ${styles.mt3}`}
              >
                Total TEA staked in the protocol over the past 7 days
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top Staked Packages */}
      <div className={`${styles.card} ${styles.mb4}`}>
        <div className={styles.flexBetween + " " + styles.mb4}>
          <h3 className={styles.subtitle}>Top Staked Packages</h3>
          <div className={styles.badge + " " + styles.badgePrimary}>
            Community Favorites
          </div>
        </div>

        {isLoading ? (
          <div
            className={styles.flexCol}
            style={{ height: "160px", justifyContent: "center" }}
          >
            <div className={styles.loader}></div>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Package</th>
                  <th>Category</th>
                  <th className={styles.textRight}>Total Staked</th>
                  <th className={styles.textRight}>Stakers</th>
                  <th className={styles.textRight}>Downloads</th>
                </tr>
              </thead>
              <tbody>
                {analyticsData.topPackages.map((pkg, index) => (
                  <tr key={pkg.id || `pkg-${index}`}>
                    <td>
                      <span
                        className={`${styles.rankBadge} ${
                          index === 0
                            ? styles.rankGold
                            : index === 1
                            ? styles.rankSilver
                            : index === 2
                            ? styles.rankBronze
                            : styles.rankDefault
                        }`}
                      >
                        {index + 1}
                      </span>
                    </td>
                    <td className={styles.fontSemibold}>{pkg.name}</td>
                    <td>
                      <span className={styles.categoryBadge}>
                        {pkg.category}
                      </span>
                    </td>
                    <td
                      className={`${styles.textRight} ${styles.fontSemibold}`}
                    >
                      {Number(
                        pkg.stakes && pkg.stakes[0]
                          ? pkg.stakes[0].sum_amount
                          : 0
                      ).toLocaleString()}{" "}
                      TEA
                    </td>
                    <td className={styles.textRight}>
                      {Number(
                        pkg.stakes && pkg.stakes[0] ? pkg.stakes[0].count : 0
                      ).toLocaleString()}
                    </td>
                    <td className={styles.textRight}>{pkg.downloads}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
