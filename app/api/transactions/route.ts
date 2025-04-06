import { NextRequest, NextResponse } from "next/server";
import supabase from "@/lib/supabase";
import { TimeFilter } from "@/services/transactionService";

// Initialize Supabase client


export async function GET(request: NextRequest) {
  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const wallet = searchParams.get("wallet");
    const timeFilter = (searchParams.get("timeFilter") as TimeFilter) || "all";
    const debug = searchParams.has("debug");

    // Validate wallet address
    if (!wallet) {
      return NextResponse.json(
        {
          error: "Wallet address is required",
        },
        { status: 400 }
      );
    }

    // Construct query
    let query = supabase
      .from("user_transactions")
      .select("*")
      .eq("wallet_address", wallet)
      .order("timestamp", { ascending: false });

    // Apply time filter if specified
    if (timeFilter === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query = query.gte("timestamp", today.toISOString());
    } else if (timeFilter === "week") {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      query = query.gte("timestamp", weekAgo.toISOString());
    }

    // Execute query
    const { data, error } = await query;

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        {
          error: "Failed to fetch transactions from database",
        },
        { status: 500 }
      );
    }

    // If debug parameter is present, include additional information
    if (debug) {
      return NextResponse.json({
        data,
        count: data?.length || 0,
        debug: {
          wallet,
          timeFilter,
          queryParams: {
            wallet,
            timeFilter,
            today: new Date().toISOString(),
          },
        },
      });
    }

    // Return the transactions
    return NextResponse.json({
      data: data || [],
      count: data?.length || 0,
    });
  } catch (error: any) {
    console.error("Error in transactions API:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to fetch transactions",
      },
      { status: 500 }
    );
  }
}
