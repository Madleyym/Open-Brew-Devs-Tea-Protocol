import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { ChartConfiguration, ChartTypeRegistry, ChartDataset } from "chart.js";

interface ActivityChartProps {
  data: {
    date: string;
    transactions: number;
    tier: number;
  }[];
}

interface BarDataset extends ChartDataset<"bar", number[]> {
  barThickness?: number | "flex";
  maxBarThickness?: number;
}

export default function ActivityChart({ data }: ActivityChartProps) {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Format date to be more readable and responsive
  const formatDateForDisplay = (dateString: string) => {
    const date = new Date(dateString);

    // On mobile, show shorter format (MM/DD)
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }

    // On desktop, show more complete date (MMM DD)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Adjust chart responsively when window resizes
  const handleResize = () => {
    if (chartInstance.current) {
      chartInstance.current.resize();
      chartInstance.current.update();
    }
  };

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    // Destroy previous chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    const labels = data.map((item) => formatDateForDisplay(item.date));
    const transactionData = data.map((item) => item.transactions);

    // Determine if we're on mobile
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

    // Create configuration with proper typing
    const chartConfig: ChartConfiguration<"bar", number[]> = {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Transactions",
            data: transactionData,
            backgroundColor: (context) => {
              const index = context.dataIndex;
              if (index >= 0 && index < data.length) {
                const tier = data[index].tier;
                if (tier === 3) return "rgba(0, 192, 127, 0.8)"; // Tier 1 (best)
                if (tier === 2) return "rgba(59, 130, 246, 0.8)"; // Tier 2
                if (tier === 1) return "rgba(139, 92, 246, 0.8)"; // Tier 3
              }
              return "rgba(100, 116, 139, 0.8)"; // No tier
            },
            borderRadius: 4,
            // Type assertion to allow barThickness
            ...(isMobile
              ? { barThickness: "flex" as const }
              : { barThickness: 30 }),
            maxBarThickness: 50,
          } as BarDataset,
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              title: function (tooltipItems) {
                // Show full date in tooltip
                const dataIndex = tooltipItems[0].dataIndex;
                if (dataIndex >= 0 && dataIndex < data.length) {
                  const originalDate = data[dataIndex].date;
                  return new Date(originalDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  });
                }
                return "";
              },
              label: function (context) {
                const dataIndex = context.dataIndex;
                if (dataIndex >= 0 && dataIndex < data.length) {
                  const tier = data[dataIndex].tier;
                  let tierLabel = "No Tier";
                  if (tier === 3) tierLabel = "Tier 1";
                  if (tier === 2) tierLabel = "Tier 2";
                  if (tier === 1) tierLabel = "Tier 3";

                  return [
                    "Transactions: " + context.parsed.y,
                    "Reward: " + tierLabel,
                  ];
                }
                return [];
              },
            },
            titleFont: {
              size: isMobile ? 12 : 14,
            },
            bodyFont: {
              size: isMobile ? 11 : 13,
            },
            padding: isMobile ? 8 : 10,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(255, 255, 255, 0.05)",
            },
            ticks: {
              color: "rgba(255, 255, 255, 0.7)",
              font: {
                size: isMobile ? 10 : 12,
              },
              callback: function (value) {
                // Type check before formatting
                if (typeof value === "number" && value >= 1000) {
                  return (value / 1000).toFixed(1) + "k";
                }
                return value;
              },
            },
            title: {
              display: !isMobile, // Hide title on mobile
              text: "Transactions",
              color: "rgba(255, 255, 255, 0.7)",
              font: {
                size: 12,
              },
            },
          },
          x: {
            grid: {
              display: false,
            },
            ticks: {
              color: "rgba(255, 255, 255, 0.7)",
              // Instead of using maxRotation, use the autoSkip and rotation properties
              autoSkip: isMobile,
              autoSkipPadding: 10,
              // Set rotation angle for mobile
              ...(isMobile ? { rotation: 45 } : { rotation: 0 }),
              font: {
                size: isMobile ? 10 : 12,
              },
            },
          },
        },
      },
    };

    chartInstance.current = new Chart(ctx, chartConfig);

    // Add resize event listener
    window.addEventListener("resize", handleResize);

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
      window.removeEventListener("resize", handleResize);
    };
  }, [data]);

  return (
    <div
      ref={containerRef}
      style={{
        height: "auto",
        minHeight: "315px",
        maxHeight: "350px",
        position: "relative",
        width: "100%",
      }}
    >
      <canvas ref={chartRef} />
    </div>
  );
}
