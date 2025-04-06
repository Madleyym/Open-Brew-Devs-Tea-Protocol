import React, { useState, useEffect } from "react";
import supabase from "@/lib/supabase";
import { Bar, Line, Pie } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";

// Register Chart.js components
Chart.register(...registerables);

// Define proper types untuk data analytics
interface ProtocolStats {
  totalStaked: number;
  uniqueStakers: number;
  packageCount: number;
  avgApy: number;
}

interface StakingTrend {
  date: string;
  total_staked: number;
  new_stakes: number;
}

interface CategoryDistribution {
  category: string;
  count: number;
  total_staked: number;
}

interface Package {
  id: string;
  name: string;
  category: string;
  downloads: string;
  stakes: {
    count: number;
    sum_amount: number;
  }[];
}

interface AnalyticsData {
  totalStaked: number;
  uniqueStakers: number;
  packageCount: number;
  avgApy: number;
  stakingTrends: StakingTrend[];
  categoryDistribution: CategoryDistribution[];
  topPackages: Package[];
}

export default function ProtocolAnalytics() {
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
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchAnalyticsData() {
      setIsLoading(true);

      try {
        // 1. Fetch total statistics
        const { data: totalStats, error: statsError } = await supabase.rpc(
          "get_protocol_stats"
        );

        if (statsError) throw statsError;

        // 2. Fetch staking trends over time
        const timeFilter = getTimeFilter(timeRange);
        const { data: stakingTrends, error: trendsError } = await supabase.rpc(
          "get_staking_trends",
          { start_date: timeFilter }
        );

        if (trendsError) throw trendsError;

        // 3. Fetch category distribution
        const { data: categoryData, error: catError } = await supabase.rpc(
          "get_category_distribution"
        );

        if (catError) throw catError;

        // 4. Fetch top packages
        const { data: topPackages, error: packageError } = await supabase
          .from("packages")
          .select(
            `
            id,
            name,
            category,
            downloads,
            stakes:user_stakes(count, sum_amount)
          `
          )
          .order("stakes(sum_amount)", { ascending: false })
          .limit(10);

        if (packageError) throw packageError;

        // Process and set data
        setAnalyticsData({
          totalStaked: totalStats?.total_staked || 0,
          uniqueStakers: totalStats?.unique_stakers || 0,
          packageCount: totalStats?.package_count || 0,
          avgApy: totalStats?.avg_apy || 0,
          stakingTrends: (stakingTrends as StakingTrend[]) || [],
          categoryDistribution: (categoryData as CategoryDistribution[]) || [],
          topPackages: (topPackages as Package[]) || [],
        });
      } catch (err) {
        console.error("Error fetching analytics data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnalyticsData();
  }, [timeRange]);

  // Helper function to calculate time filter
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

  // Loading state
  if (isLoading) {
    return (
      <div className="analytics-loading">
        <div className="loading-spinner"></div>
        <p>Loading analytics data...</p>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">TEA Protocol Analytics</h1>
        <div className="time-range-selector">
          <button
            className={`range-btn ${timeRange === "7d" ? "active" : ""}`}
            onClick={() => setTimeRange("7d")}
          >
            7 Days
          </button>
          <button
            className={`range-btn ${timeRange === "30d" ? "active" : ""}`}
            onClick={() => setTimeRange("30d")}
          >
            30 Days
          </button>
          <button
            className={`range-btn ${timeRange === "90d" ? "active" : ""}`}
            onClick={() => setTimeRange("90d")}
          >
            90 Days
          </button>
          <button
            className={`range-btn ${timeRange === "all" ? "active" : ""}`}
            onClick={() => setTimeRange("all")}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="stats-overview grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <div className="stat-title">Total Staked</div>
          <div className="stat-value">
            {analyticsData.totalStaked.toLocaleString()} TEA
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Unique Stakers</div>
          <div className="stat-value">
            {analyticsData.uniqueStakers.toLocaleString()}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Packages</div>
          <div className="stat-value">
            {analyticsData.packageCount.toLocaleString()}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Avg. APY</div>
          <div className="stat-value">{analyticsData.avgApy.toFixed(2)}%</div>
        </div>
      </div>

      {/* Charts */}
      <div className="analytics-charts grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="chart-card">
          <h3 className="chart-title">Staking Trends</h3>
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
                  borderColor: "#10b981",
                  backgroundColor: "rgba(16, 185, 129, 0.1)",
                  tension: 0.2,
                  fill: true,
                },
              ],
            }}
            options={{
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
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Category Distribution</h3>
          <Pie
            data={{
              labels: analyticsData.categoryDistribution.map(
                (item) => item.category
              ),
              datasets: [
                {
                  data: analyticsData.categoryDistribution.map(
                    (item) => item.count
                  ),
                  backgroundColor: [
                    "#10b981",
                    "#3b82f6",
                    "#8b5cf6",
                    "#ec4899",
                    "#f59e0b",
                    "#06b6d4",
                    "#ef4444",
                    "#84cc16",
                    "#64748b",
                    "#d946ef",
                  ],
                },
              ],
            }}
            options={{
              plugins: {
                legend: {
                  position: "right",
                },
              },
            }}
          />
        </div>
      </div>

      {/* Top Packages Table */}
      <div className="top-packages">
        <h3 className="section-title mb-4">Top Staked Packages</h3>
        <table className="w-full">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Package</th>
              <th>Category</th>
              <th>Total Staked</th>
              <th>Stakers</th>
              <th>Downloads</th>
            </tr>
          </thead>
          <tbody>
            {analyticsData.topPackages.map((pkg, index) => (
              <tr key={pkg.id}>
                <td>{index + 1}</td>
                <td>{pkg.name}</td>
                <td>{pkg.category}</td>
                <td>{(pkg.stakes[0]?.sum_amount || 0).toLocaleString()} TEA</td>
                <td>{pkg.stakes[0]?.count || 0}</td>
                <td>{pkg.downloads}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
