import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get("address");
    const debug = searchParams.has("debug");

    // For debugging
    console.log("System time:", new Date().toISOString());

    if (!address) {
      return NextResponse.json(
        {
          error: "Wallet address is required",
        },
        { status: 400 }
      );
    }

    // Collect detailed error information
    const errors: Record<string, string> = {};
    let transactions = [];

    // Try Tea Sepolia API
    try {
      console.log("Attempting Tea Sepolia API call...");
      const response = await fetch(
        "https://sepolia.tea.xyz/tx/api/v2/main-page/transactions",
        {
          // Add cache: 'no-store' to prevent caching issues
          cache: "no-store",
          // Add a timeout
          signal: AbortSignal.timeout(5000),
        }
      );

      if (!response.ok) {
        throw new Error(`API responded with status ${response.status}`);
      }

      const data = await response.json();
      console.log("Tea API response status:", response.status);

      if (!data.items || !Array.isArray(data.items)) {
        throw new Error("Invalid response format");
      }

      // Filter for relevant transactions
      const addressLower = address.toLowerCase();
      let relevantTransactions = data.items.filter((tx: any) => {
        return (
          (tx.from && tx.from.toLowerCase() === addressLower) ||
          (tx.to && tx.to.toLowerCase() === addressLower)
        );
      });

      console.log(`Found ${relevantTransactions.length} relevant transactions`);

      if (relevantTransactions.length > 0) {
        // Success path
        transactions = relevantTransactions.map((tx: any) => ({
          id: tx.hash,
          hash: tx.hash,
          type: tx.method?.toLowerCase().includes("stake")
            ? "Stake"
            : tx.method?.toLowerCase().includes("unstake")
            ? "Unstake"
            : tx.input && tx.input !== "0x"
            ? "Interaction"
            : "Transfer",
          timestamp: new Date(tx.timestamp * 1000),
          status: "Confirmed",
          amount: tx.value
            ? parseFloat(ethers.utils.formatEther(tx.value))
            : undefined,
          fromAddress: tx.from,
          toAddress: tx.to,
          walletAddress: address,
        }));

        // If we got transactions, return them
        return NextResponse.json({
          transactions,
          source: "tea-sepolia-api",
          count: transactions.length,
        });
      }
    } catch (teaError: any) {
      errors["teaApi"] = teaError.message || "Unknown error";
      console.error("Tea API error:", teaError);
    }

    // If we reach here, the first API failed or returned no results
    // Try the BlockScout API
    try {
      console.log("Attempting BlockScout API call...");
      const blockscoutApiUrl = `https://stats-tea-sepolia.cloud.blockscout.com/api/v1/addresses/${address}/transactions`;

      const response = await fetch(blockscoutApiUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(
          `BlockScout API responded with status ${response.status}`
        );
      }

      const data = await response.json();
      console.log("BlockScout API response status:", response.status);

      if (!data.items || !Array.isArray(data.items)) {
        throw new Error("Invalid response format from BlockScout API");
      }

      if (data.items.length > 0) {
        transactions = data.items.map((tx: any) => ({
          id: tx.hash,
          hash: tx.hash,
          type: tx.method?.toLowerCase().includes("stake")
            ? "Stake"
            : tx.method?.toLowerCase().includes("unstake")
            ? "Unstake"
            : tx.input && tx.input !== "0x"
            ? "Interaction"
            : "Transfer",
          timestamp: new Date((tx.timestamp || Date.now() / 1000) * 1000),
          status: tx.status === "ok" ? "Confirmed" : "Failed",
          amount: tx.value
            ? parseFloat(ethers.utils.formatEther(tx.value))
            : undefined,
          fromAddress: tx.from?.hash,
          toAddress: tx.to?.hash,
          walletAddress: address,
        }));

        return NextResponse.json({
          transactions,
          source: "blockscout-api",
          count: transactions.length,
        });
      }
    } catch (blockscoutError: any) {
      errors["blockscoutApi"] = blockscoutError.message || "Unknown error";
      console.error("BlockScout API error:", blockscoutError);
    }

    // Return error information
    if (debug) {
      return NextResponse.json(
        {
          error: "Failed to fetch transactions from both APIs",
          transactions: [],
          systemTime: new Date().toISOString(),
          detailedErrors: errors,
        },
        { status: 500 }
      );
    }

    // General error response
    return NextResponse.json(
      {
        error: "Failed to fetch transactions from both APIs",
        transactions: [],
      },
      { status: 500 }
    );
  } catch (error: any) {
    console.error("General error in blockchain transactions API:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to fetch blockchain transactions",
        transactions: [],
      },
      { status: 500 }
    );
  }
}
