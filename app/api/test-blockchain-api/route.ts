import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const results: Record<string, any> = {};

    // Test the Tea Sepolia API endpoints
    try {
      const statsResponse = await fetch(
        "https://sepolia.tea.xyz/tx/api/v2/stats"
      );
      results["stats"] = {
        status: statsResponse.status,
        ok: statsResponse.ok,
        data: statsResponse.ok ? await statsResponse.json() : "Failed to fetch",
      };
    } catch (error: any) {
      results["stats"] = { error: error.message };
    }

    try {
      const txResponse = await fetch(
        "https://sepolia.tea.xyz/tx/api/v2/main-page/transactions"
      );
      const txData = await txResponse.json();
      results["transactions"] = {
        status: txResponse.status,
        ok: txResponse.ok,
        count: txData.items?.length || 0,
        sample: txData.items?.slice(0, 2) || [],
      };
    } catch (error: any) {
      results["transactions"] = { error: error.message };
    }

    try {
      const blocksResponse = await fetch(
        "https://sepolia.tea.xyz/tx/api/v2/main-page/blocks"
      );
      const blocksData = await blocksResponse.json();
      results["blocks"] = {
        status: blocksResponse.status,
        ok: blocksResponse.ok,
        count: blocksData.items?.length || 0,
        sample: blocksData.items?.slice(0, 2) || [],
      };
    } catch (error: any) {
      results["blocks"] = { error: error.message };
    }

    try {
      const blockscoutResponse = await fetch(
        "https://stats-tea-sepolia.cloud.blockscout.com/api/v1/pages/main"
      );
      results["blockscout"] = {
        status: blockscoutResponse.status,
        ok: blockscoutResponse.ok,
        data: blockscoutResponse.ok
          ? await blockscoutResponse.json()
          : "Failed to fetch",
      };
    } catch (error: any) {
      results["blockscout"] = { error: error.message };
    }

    // Try to get address transactions if a wallet is provided
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get("address");

    if (address) {
      try {
        const addressResponse = await fetch(
          `https://stats-tea-sepolia.cloud.blockscout.com/api/v1/addresses/${address}/transactions`
        );
        const addressData = await addressResponse.json();
        results["address_transactions"] = {
          status: addressResponse.status,
          ok: addressResponse.ok,
          count: addressData.items?.length || 0,
          sample: addressData.items?.slice(0, 2) || [],
        };
      } catch (error: any) {
        results["address_transactions"] = { error: error.message };
      }
    }

    return NextResponse.json({
      success: true,
      testedAt: new Date().toISOString(),
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
