import { NextRequest, NextResponse } from "next/server";
import supabase from "@/lib/supabase";
// Helper function to get tier info
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
    remaining: 11 - count,
    color: "#6B7280",
  };
}

export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const wallet = searchParams.get("wallet");

    // Validate wallet address
    if (!wallet) {
      return NextResponse.json(
        {
          error: "Wallet address is required",
        },
        { status: 400 }
      );
    }

    // Get today's date at 00:00
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count transactions for today
    const { count, error } = await supabase
      .from("user_transactions")
      .select("*", { count: "exact", head: true })
      .eq("wallet_address", wallet)
      .gte("timestamp", today.toISOString());

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        {
          error: "Failed to count transactions",
        },
        { status: 500 }
      );
    }

    const transactionCount = count || 0;

    // Return the count with tier info
    return NextResponse.json({
      data: {
        count: transactionCount,
        tier: getTierInfo(transactionCount),
      },
    });
  } catch (error: any) {
    console.error("Error in transaction count API:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to fetch transaction count",
      },
      { status: 500 }
    );
  }
}
