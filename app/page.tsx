"use client";
import React, { useState, useEffect, useRef } from "react";
import DashboardOverview from "./components/DashboardOverview";
import TransactionTracker from "./components/TransactionTracker";
import DAppAnalytics from "./components/DAppAnalytics";
import PackageStaking from "./components/PackageStaking";
import KycAddressList from "./components/KycAddressList";
import SwapTokens from "./components/SwapTokens";
import {
  fetchUserStats,
  fetchDAppStats,
  fetchPackageStats,
  UserStat,
  DAppStat,
  PackageStat,
} from "@/services/teaService";
import { getAddresses } from "@/services/addressService";
import TabNavigation from "./components/TabNavigation";
import Footer from "./components/Footer";
import Header from "./components/Header"; // Import the new Header component

export default function Home() {
  // State variables with proper TypeScript typing
  const [activeTab, setActiveTab] = useState("dashboard");
  const [addresses, setAddresses] = useState<string[]>([]);
  const [userStats, setUserStats] = useState<UserStat | null>(null);
  const [dappStats, setDappStats] = useState<DAppStat[] | null>(null);
  const [packageStats, setPackageStats] = useState<PackageStat[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Refs and state for scroll behavior
  const [showFooter, setShowFooter] = useState(true);
  const lastScrollY = useRef(0);

  // Handle scroll to hide/show footer
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY.current + 10) {
        setShowFooter(false); // Hide footer when scrolling down
      } else if (currentScrollY < lastScrollY.current - 10) {
        setShowFooter(true); // Show footer when scrolling up
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle accounts changed
  const handleAccountsChanged = (accounts: string[]) => {
    console.log("Accounts changed:", accounts);
    if (accounts.length === 0) {
      // User disconnected their wallet
      disconnectWallet();
    } else if (walletAddress !== accounts[0]) {
      // User switched accounts
      console.log("Switching to account:", accounts[0]);
      setWalletAddress(accounts[0]);
      loadUserData(accounts[0]);
    }
  };

  // Connect wallet function - improved version with signature
  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        console.log("Requesting wallet connection...");

        // Clear the explicit disconnect flag when user attempts to connect
        localStorage.removeItem("walletExplicitlyDisconnected");

        // Request accounts with clear notification to user
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });

        if (!accounts || accounts.length === 0) {
          throw new Error("No accounts returned from wallet");
        }

        const address = accounts[0];
        console.log("Connected to wallet:", address);

        // Create a message for the user to sign (without timestamp)
        const message = `Welcome to OpenBrew! Please sign this message to verify your wallet ownership.\n\nAddress: ${address}\nNonce: ${Math.floor(
          Math.random() * 1000000
        )}`;

        // Request signature from user
        console.log("Requesting signature...");
        const signature = await window.ethereum.request({
          method: "personal_sign",
          params: [message, address],
        });

        console.log("Signature verified:", signature);

        // Setup event listeners for account changes
        window.ethereum.on("accountsChanged", handleAccountsChanged);
        window.ethereum.on("chainChanged", () => window.location.reload());

        setWalletAddress(address);
        setWalletConnected(true);

        // Store connection in session storage
        sessionStorage.setItem("walletConnected", "true");
        sessionStorage.setItem("walletAddress", address);

        // Store signature information if needed for later verification
        sessionStorage.setItem("walletSignature", signature);
        sessionStorage.setItem("walletSignatureMessage", message);

        // Fetch user data after wallet connection
        loadUserData(address);
      } else {
        setError("Please install a Web3 wallet like MetaMask");
      }
    } catch (err) {
      console.error("Failed to connect wallet:", err);
      setError(
        `Failed to connect wallet: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  // Disconnect wallet function - improved version
  const disconnectWallet = () => {
    try {
      console.log("Disconnecting wallet...");

      // Remove event listeners
      if (window.ethereum) {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener(
            "accountsChanged",
            handleAccountsChanged
          );
          window.ethereum.removeListener("chainChanged", () =>
            window.location.reload()
          );
        }

        // For more complete cleanup
        if (window.ethereum.removeAllListeners) {
          window.ethereum.removeAllListeners();
        }

        // If wallet provider supports disconnect method (like WalletConnect)
        if (window.ethereum.disconnect) {
          window.ethereum.disconnect();
        }
      }

      // Clear local state
      setWalletAddress(null);
      setWalletConnected(false);
      setUserStats(null);
      setDappStats(null);
      setPackageStats(null);

      // Clear session storage
      sessionStorage.removeItem("walletConnected");
      sessionStorage.removeItem("walletAddress");
      sessionStorage.removeItem("walletSignature");
      sessionStorage.removeItem("walletSignatureMessage");

      // Set explicit disconnect flag in localStorage to prevent auto-reconnection
      localStorage.setItem("walletExplicitlyDisconnected", "true");

      console.log("Wallet disconnected successfully");

      // Reload just the KYC addresses
      getAddresses()
        .then((addressList) => {
          setAddresses(addressList);
        })
        .catch((err) => {
          console.error("Failed to load addresses after disconnect:", err);
        });
    } catch (err) {
      console.error("Error during wallet disconnect:", err);
    }
  };

  // Load all user data
  const loadUserData = async (address: string) => {
    try {
      setLoading(true);

      // Parallel data fetching
      const [userStatsData, dappStatsData, packageStatsData, addressList] =
        await Promise.all([
          fetchUserStats(address),
          fetchDAppStats(address),
          fetchPackageStats(address),
          getAddresses(),
        ]);

      setUserStats(userStatsData);
      setDappStats(dappStatsData);
      setPackageStats(packageStatsData);
      setAddresses(addressList);
    } catch (err) {
      console.error("Failed to load data:", err);
      setError("Failed to load data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // In your Home component after adding an address:
  const handleAddressSubmitted = async (address?: string) => {
    try {
      console.log("Address submitted, refreshing list");
      const addressList = await getAddresses();

      // Update the state that's passed to both components
      setAddresses(addressList);

      // Log the update
      console.log(`Updated address list with ${addressList.length} addresses`);
    } catch (err) {
      console.error("Error refreshing data after address submission:", err);
    }
  };

  // Initial load - requires manual connection after signature
  useEffect(() => {
    // Check if wallet is already connected
    const checkConnection = async () => {
      // Check if user explicitly disconnected in the previous session
      const wasExplicitlyDisconnected =
        localStorage.getItem("walletExplicitlyDisconnected") === "true";

      if (wasExplicitlyDisconnected) {
        console.log(
          "User explicitly disconnected previously. Not reconnecting automatically."
        );
        // Just load KYC addresses when user previously disconnected
        const addressList = await getAddresses();
        setAddresses(addressList);
        setLoading(false);
        return;
      }

      // When requiring signature, we should only restore from session storage
      // and not automatically connect based on eth_accounts
      const storedConnected = sessionStorage.getItem("walletConnected");
      const storedAddress = sessionStorage.getItem("walletAddress");
      const storedSignature = sessionStorage.getItem("walletSignature");

      if (storedConnected === "true" && storedAddress && storedSignature) {
        console.log(
          "Found stored wallet connection with signature, verifying..."
        );

        if (window.ethereum) {
          try {
            const accounts = await window.ethereum.request({
              method: "eth_accounts",
            });

            if (
              accounts.length > 0 &&
              accounts[0].toLowerCase() === storedAddress.toLowerCase()
            ) {
              console.log("Wallet connection verified:", accounts[0]);
              setWalletAddress(accounts[0]);
              setWalletConnected(true);

              // Setup event listeners
              window.ethereum.on("accountsChanged", handleAccountsChanged);
              window.ethereum.on("chainChanged", () =>
                window.location.reload()
              );

              loadUserData(accounts[0]);
              return;
            }
          } catch (err) {
            console.error("Error verifying stored wallet connection:", err);
            // Clear invalid stored data
            sessionStorage.removeItem("walletConnected");
            sessionStorage.removeItem("walletAddress");
            sessionStorage.removeItem("walletSignature");
            sessionStorage.removeItem("walletSignatureMessage");
          }
        }
      }

      // With signature verification, we don't want to auto-connect
      // User must explicitly connect and sign
      const addressList = await getAddresses();
      setAddresses(addressList);
      setLoading(false);
    };

    checkConnection();

    // Cleanup function to remove event listeners when component unmounts
    return () => {
      if (window.ethereum) {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener(
            "accountsChanged",
            handleAccountsChanged
          );
          window.ethereum.removeListener("chainChanged", () =>
            window.location.reload()
          );
        }

        if (window.ethereum.removeAllListeners) {
          window.ethereum.removeAllListeners();
        }
      }
    };
  }, []);

  // Error display
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center card p-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-4 text-red-500"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div className="text-red-500 mb-4">{error}</div>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Use the new Header component with proper props */}
      <Header
        walletConnected={walletConnected}
        walletAddress={walletAddress}
        connectWallet={connectWallet}
        disconnectWallet={disconnectWallet}
      />

      <main className="container mt-4" style={{ paddingBottom: "30px" }}>
        {loading && !walletConnected ? (
          <div className="flex justify-center my-8">
            <div className="text-center">
              <div
                className="loading-spinner"
                style={{ width: "30px", height: "30px", borderWidth: "3px" }}
              ></div>
              <div className="text-primary text-sm mt-2">Loading data...</div>
            </div>
          </div>
        ) : (
          <>
            <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

            <div className="tab-content mt-4">
              {activeTab === "dashboard" && (
                <DashboardOverview
                  userStats={userStats}
                  isWalletConnected={walletConnected}
                  onConnectWallet={connectWallet}
                />
              )}
              {activeTab === "transactions" && (
                <TransactionTracker
                  userStats={userStats}
                  isWalletConnected={walletConnected}
                  onConnectWallet={connectWallet}
                />
              )}
              {activeTab === "dapps" && (
                <DAppAnalytics
                  dappStats={dappStats}
                  isWalletConnected={walletConnected}
                  onConnectWallet={connectWallet}
                />
              )}
              {activeTab === "staking" && (
                <PackageStaking
                  // packageStats={packageStats}
                  isWalletConnected={walletConnected}
                  onConnectWallet={connectWallet}
                  walletAddress={walletAddress || undefined}
                />
              )}
              {/* Add the new Swap tab render condition here */}
              {activeTab === "swap" && (
                <SwapTokens
                  isWalletConnected={walletConnected}
                  onConnectWallet={connectWallet}
                  walletAddress={walletAddress || undefined}
                />
              )}
              {activeTab === "kyc" && (
                <KycAddressList
                  addresses={addresses}
                  onAddressSubmitted={handleAddressSubmitted}
                  existingAddresses={addresses}
                  walletAddress={walletAddress}
                  setActiveTab={setActiveTab} // You've added this prop
                />
              )}
            </div>
          </>
        )}
      </main>

      <Footer showFooter={showFooter} />
    </div>
  );
}
