import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

interface UsageChartProps {
  usageData: { date: string; users: number }[];
}

export default function UsageChart({ usageData }: UsageChartProps) {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || !usageData || usageData.length === 0) return;

    // Destroy previous chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    const labels = usageData.map((item) => item.date);
    const userData = usageData.map((item) => item.users);

    // Calculate tier lines
    const tier3Line = Array(labels.length).fill(101);
    const tier2Line = Array(labels.length).fill(501);
    const tier1Line = Array(labels.length).fill(1001);

    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Daily Users",
            data: userData,
            borderColor: "#00c07f",
            backgroundColor: "rgba(0, 192, 127, 0.1)",
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: "#00c07f",
          },
          {
            label: "Tier 3 (101+)",
            data: tier3Line,
            borderColor: "rgba(139, 92, 246, 0.7)",
            borderWidth: 1,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0,
          },
          {
            label: "Tier 2 (501+)",
            data: tier2Line,
            borderColor: "rgba(59, 130, 246, 0.7)",
            borderWidth: 1,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0,
          },
          {
            label: "Tier 1 (1001+)",
            data: tier1Line,
            borderColor: "rgba(16, 185, 129, 0.7)",
            borderWidth: 1,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "rgba(255, 255, 255, 0.7)",
              usePointStyle: true,
            },
          },
          tooltip: {
            mode: "index",
            intersect: false,
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
            },
            title: {
              display: true,
              text: "Daily Unique Users",
              color: "rgba(255, 255, 255, 0.7)",
            },
          },
          x: {
            grid: {
              color: "rgba(255, 255, 255, 0.05)",
            },
            ticks: {
              color: "rgba(255, 255, 255, 0.7)",
            },
            title: {
              display: true,
              text: "Date",
              color: "rgba(255, 255, 255, 0.7)",
            },
          },
        },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [usageData]);

  return (
    <div style={{ height: "300px" }}>
      <canvas ref={chartRef} />
    </div>
  );
}
