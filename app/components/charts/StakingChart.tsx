import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { format, parseISO } from "date-fns";

interface StakingChartProps {
  stakingData: { date: string; amount: number }[];
}

export default function StakingChart({ stakingData }: StakingChartProps) {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || !stakingData || stakingData.length === 0) return;

    // Destroy previous chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    // Create a gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, "rgba(0, 192, 127, 0.25)");
    gradient.addColorStop(1, "rgba(0, 192, 127, 0.02)");

    // Format dates for display
    const formattedDates = stakingData.map((item) => {
      try {
        const date = parseISO(item.date);
        return format(date, "MMM d, yyyy");
      } catch (e) {
        return item.date; // Fallback if date parsing fails
      }
    });

    // Calculate cumulative amounts (running total)
    const cumulativeAmounts = stakingData.reduce(
      (acc: number[], current, index) => {
        const previousTotal = index > 0 ? acc[index - 1] : 0;
        acc.push(previousTotal + current.amount);
        return acc;
      },
      []
    );

    // Prepare the chart
    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: formattedDates,
        datasets: [
          {
            label: "Total TEA Staked",
            data: cumulativeAmounts,
            borderColor: "#00c07f",
            backgroundColor: gradient,
            borderWidth: 2.5,
            fill: true,
            tension: 0.35, // Smoother curve
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: "#00c07f",
            pointBorderColor: "rgba(0, 0, 0, 0.2)",
            pointBorderWidth: 1.5,
            pointHitRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 1500, // Longer animation for better effect
          easing: "easeOutQuart",
        },
        plugins: {
          legend: {
            position: "top",
            align: "end",
            labels: {
              color: "rgba(255, 255, 255, 0.8)",
              usePointStyle: true,
              padding: 15,
              font: {
                size: 13,
              },
            },
          },
          tooltip: {
            mode: "index",
            intersect: false,
            backgroundColor: "rgba(15, 15, 15, 0.75)",
            titleColor: "#fff",
            bodyColor: "rgba(255, 255, 255, 0.8)",
            borderColor: "rgba(0, 192, 127, 0.3)",
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            titleFont: {
              size: 14,
              weight: "bold",
            },
            bodyFont: {
              size: 13,
            },
            displayColors: false,
            caretPadding: 8,
            callbacks: {
              title: function (tooltipItems: any[]) {
                return tooltipItems[0].label;
              },
              label: function (context: any) {
                return `TEA Staked: ${context.parsed.y.toLocaleString()} TEA`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(255, 255, 255, 0.05)",
              // Fixed: Removed drawBorder property
            },
            border: {
              display: false,
            },
            ticks: {
              color: "rgba(255, 255, 255, 0.7)",
              padding: 10,
              font: {
                size: 11,
              },
              // Fixed: Updated callback signature to match Chart.js expectations
              callback: function (value: string | number) {
                if (typeof value === "number") {
                  return value.toLocaleString() + " TEA";
                }
                return value;
              },
            },
            title: {
              display: true,
              text: "Total TEA Staked",
              color: "rgba(255, 255, 255, 0.8)",
              padding: {
                bottom: 10,
              },
              font: {
                size: 13,
                weight: "normal",
              },
            },
          },
          x: {
            grid: {
              display: false,
              // Fixed: Removed drawBorder property
            },
            border: {
              display: false,
            },
            ticks: {
              color: "rgba(255, 255, 255, 0.7)",
              padding: 8,
              maxRotation: 30,
              minRotation: 30,
              font: {
                size: 11,
              },
              autoSkip: true,
              maxTicksLimit: 8,
            },
          },
        },
        interaction: {
          mode: "nearest",
          axis: "x",
          intersect: false,
        },
        elements: {
          line: {
            cubicInterpolationMode: "monotone", // Smoother curves
          },
        },
        layout: {
          padding: {
            top: 5,
            right: 15,
            bottom: 5,
            left: 15,
          },
        },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [stakingData]);

  return (
    <div
      style={{
        height: "300px",
        width: "100%",
        position: "relative",
        padding: "10px 0",
      }}
    >
      <canvas ref={chartRef} />
    </div>
  );
}
