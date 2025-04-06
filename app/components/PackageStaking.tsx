"use client";

import React, { useState, useEffect } from "react";
import StakingChart from "./charts/StakingChart";
import supabase from "@/lib/supabase";
import transactionService from "@/services/transactionService";
import styles from "@/styles/PackageStaking.module.css";
import { ethers } from "ethers";
import { v4 as uuidv4 } from "uuid";

// TEA Protocol contract configuration
const TEA_CONFIG = {
  STAKING_CONTRACT: "0xbba4121A3bDE406Be131257C8918F67c97789166",
  CHAIN_ID: 10218,
  NETWORK_NAME: "Tea Sepolia",
  RPC_URL: "https://tea-sepolia.g.alchemy.com/public",
  EXPLORER_URL: "https://sepolia.tea.xyz/tx/",
  CURRENCY_SYMBOL: "TEA",
};

// Simplified contract ABI
const STAKING_ABI = [
  {
    inputs: [{ name: "packageId", type: "string" }],
    name: "stake",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "stakeId", type: "string" }],
    name: "unstake",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "staker", type: "address" }],
    name: "getStakedPackages",
    outputs: [
      {
        components: [
          { name: "id", type: "string" },
          { name: "packageId", type: "string" },
          { name: "amount", type: "uint256" },
          { name: "apy", type: "uint256" },
          { name: "timestamp", type: "uint256" },
        ],
        name: "stakes",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

// Fallback data in case database operations fail
const FALLBACK_PACKAGES = [
  {
    id: "pkg-1",
    name: "react",
    category: "Frontend",
    downloads: "45.8M weekly",
  },
  {
    id: "pkg-2",
    name: "express",
    category: "Backend",
    downloads: "23.2M weekly",
  },
  {
    id: "pkg-3",
    name: "next",
    category: "Framework",
    downloads: "18.5M weekly",
  },
  {
    id: "pkg-4",
    name: "typescript",
    category: "Language",
    downloads: "15.3M weekly",
  },
  {
    id: "pkg-5",
    name: "ethereum.js",
    category: "Blockchain",
    downloads: "10.1M weekly",
  },
  {
    id: "pkg-6",
    name: "tailwindcss",
    category: "CSS",
    downloads: "8.7M weekly",
  },
];

interface PackageStakingProps {
  isWalletConnected: boolean;
  onConnectWallet: () => Promise<void>;
  walletAddress?: string;
}

interface Package {
  id: string;
  name: string;
  category: string;
  downloads: string;
}

interface PackageRef {
  id?: string;
  name: string;
  category: string;
  downloads?: string;
}

interface UserStake {
  id: string;
  amount: number;
  apy: number;
  staked_at: string;
  packages: PackageRef;
  stakingHistory?: Array<{ timestamp: string; value: number }>;
  txHash?: string;
}

interface OnChainStake {
  id: string;
  packageId: string;
  amount: ethers.BigNumber;
  apy: ethers.BigNumber;
  timestamp: ethers.BigNumber;
}

export default function PackageStaking({
  isWalletConnected,
  onConnectWallet,
  walletAddress,
}: PackageStakingProps) {
  const [stakingAmount, setStakingAmount] = useState("");
  const [selectedPackage, setSelectedPackage] = useState("");
  const [isStaking, setIsStaking] = useState(false);
  const [popularPackages, setPopularPackages] = useState<Package[]>([]);
  const [userStakes, setUserStakes] = useState<UserStake[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [teaBalance, setTeaBalance] = useState<string>("0");
  const [networkCorrect, setNetworkCorrect] = useState(true);
  const [transactionPending, setTransactionPending] = useState(false);
  const [pendingTxHash, setPendingTxHash] = useState<string | null>(null);
  const [hasSupabase, setHasSupabase] = useState<boolean>(!!supabase);

  // Function to add TEA Sepolia network to wallet
  const addTeaSepoliaNetwork = async () => {
    if (!window.ethereum) return false;

    try {
      await window.ethereum?.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: `0x${TEA_CONFIG.CHAIN_ID.toString(16)}`,
            chainName: TEA_CONFIG.NETWORK_NAME,
            nativeCurrency: {
              name: "TEA",
              symbol: TEA_CONFIG.CURRENCY_SYMBOL,
              decimals: 18,
            },
            rpcUrls: [TEA_CONFIG.RPC_URL],
            blockExplorerUrls: [TEA_CONFIG.EXPLORER_URL.replace("/tx/", "")],
          },
        ],
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));
      return true;
    } catch (error) {
      console.error("Error adding TEA Sepolia network", error);
      return false;
    }
  };

  // Function to switch to TEA Sepolia network
  const switchToTeaNetwork = async () => {
    if (!window.ethereum) return false;

    try {
      try {
        await window.ethereum?.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${TEA_CONFIG.CHAIN_ID.toString(16)}` }],
        });

        await new Promise((resolve) => setTimeout(resolve, 1000));
        return true;
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          const added = await addTeaSepoliaNetwork();
          if (added) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
          return added;
        }
        throw switchError;
      }
    } catch (error) {
      console.error("Failed to switch to TEA Sepolia network", error);
      return false;
    }
  };

  // Function to send TEA transaction
  const sendTeaTransaction = async (
    method: "stake" | "unstake",
    packageData: any,
    amount: number = 0,
    stakeId: string = ""
  ): Promise<string> => {
    let tx: ethers.providers.TransactionResponse | null = null;

    try {
      if (!window.ethereum || !walletAddress) {
        throw new Error("Wallet not connected");
      }

      // Check and switch to correct network if needed
      const provider = new ethers.providers.Web3Provider(
        window.ethereum as any
      );
      const { chainId } = await provider.getNetwork();

      if (chainId !== TEA_CONFIG.CHAIN_ID) {
        const switched = await switchToTeaNetwork();
        if (!switched) {
          throw new Error(
            `Please switch to the ${TEA_CONFIG.NETWORK_NAME} network`
          );
        }
      }

      setTransactionPending(true);
      const signer = provider.getSigner();

      // Check balance before transaction
      const balance = await provider.getBalance(walletAddress);

      // Connect to staking contract
      const stakingContract = new ethers.Contract(
        TEA_CONFIG.STAKING_CONTRACT,
        STAKING_ABI,
        signer
      );

      if (method === "stake") {
        // For staking, send native TEA tokens with the transaction
        const amountInWei = ethers.utils.parseEther(amount.toString());

        if (balance.lt(amountInWei)) {
          throw new Error(
            `Insufficient balance: You have ${ethers.utils.formatEther(
              balance
            )} TEA but trying to stake ${amount} TEA`
          );
        }

        tx = await stakingContract.stake(packageData.id, {
          value: amountInWei,
          gasLimit: 500000,
          gasPrice: await provider
            .getGasPrice()
            .then((price) => price.mul(120).div(100)),
        });
      } else if (method === "unstake") {
        tx = await stakingContract.unstake(stakeId, {
          gasLimit: 300000,
        });
      }

      if (tx) {
        const receipt = await tx.wait();
        return receipt.transactionHash;
      } else {
        throw new Error("Failed to create transaction");
      }
    } catch (error: any) {
      if (
        error.code === "ACTION_REJECTED" ||
        error.code === 4001 ||
        error.message?.includes("user rejected") ||
        error.message?.includes("User denied")
      ) {
        return "__USER_CANCELLED__";
      }

      // If we have a transaction but encountered an error later, return the hash anyway
      if (tx) {
        return tx.hash;
      }

      throw error;
    } finally {
      setTransactionPending(false);
    }
  };

  // Function to fetch TEA token balance
  const fetchTeaBalance = async () => {
    if (!isWalletConnected || !walletAddress || !window.ethereum) {
      setTeaBalance("0");
      return;
    }

    try {
      const provider = new ethers.providers.Web3Provider(
        window.ethereum as any
      );
      const balance = await provider.getBalance(walletAddress);
      setTeaBalance(ethers.utils.formatEther(balance));
    } catch (err) {
      console.error("Error fetching TEA balance:", err);
      setTeaBalance("0");
    }
  };

  // Check network and fetch balance when wallet connects
  useEffect(() => {
    if (isWalletConnected && walletAddress && window.ethereum) {
      const checkNetwork = async () => {
        try {
          const provider = new ethers.providers.Web3Provider(
            window.ethereum as any
          );
          const { chainId } = await provider.getNetwork();
          setNetworkCorrect(chainId === TEA_CONFIG.CHAIN_ID);
        } catch (err) {
          setNetworkCorrect(false);
        }
      };

      checkNetwork();
      fetchTeaBalance();

      window.ethereum.on("chainChanged", () => {
        checkNetwork();
        fetchTeaBalance();
      });

      return () => {
        if (window.ethereum && window.ethereum.removeListener) {
          window.ethereum.removeListener("chainChanged", checkNetwork);
        }
      };
    }
  }, [isWalletConnected, walletAddress]);

  // Fetch popular packages
  useEffect(() => {
    async function fetchPopularPackages() {
      setIsLoading(true);
      try {
        if (!hasSupabase) {
          setPopularPackages(FALLBACK_PACKAGES);
          return;
        }

        const { data, error } = await supabase
          .from("packages")
          .select("*")
          .order("downloads", { ascending: false })
          .limit(8);

        if (error || !data || data.length === 0) {
          setPopularPackages(FALLBACK_PACKAGES);
        } else {
          setPopularPackages(data);
        }
      } catch (err) {
        setPopularPackages(FALLBACK_PACKAGES);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPopularPackages();
  }, [hasSupabase]);

  // Fetch user stakes if wallet is connected
  useEffect(() => {
    async function fetchUserStakes() {
      if (!isWalletConnected || !walletAddress) {
        setUserStakes([]);
        return;
      }

      setIsLoading(true);

      try {
        if (!hasSupabase) {
          setUserStakes([]);
          return;
        }

        // Use wallet address as user ID
        const effectiveUserId = walletAddress;

        // Get user stakes from database
        const { data: stakesData, error: stakesError } = await supabase
          .from("user_stakes")
          .select(
            `
            id, 
            amount, 
            apy, 
            staked_at, 
            user_id,
            package_id,
            tx_hash
          `
          )
          .eq("user_id", effectiveUserId);

        if (stakesError || !stakesData || stakesData.length === 0) {
          setUserStakes([]);
          return;
        }

        // Process stakes to get package details and history
        const processedStakes = await Promise.all(
          stakesData.map(async (stake) => {
            // Get package details
            const { data: packageData } = await supabase
              .from("packages")
              .select("id, name, category, downloads")
              .eq("id", stake.package_id)
              .single();

            const packageInfo = packageData || {
              id: stake.package_id || "unknown",
              name: "Unknown Package",
              category: "Other",
              downloads: "N/A",
            };

            // Get staking history
            const { data: historyData } = await supabase
              .from("staking_history")
              .select("timestamp, value")
              .eq("stake_id", stake.id)
              .order("timestamp", { ascending: true });

            return {
              id: stake.id,
              amount: stake.amount || 0,
              apy: stake.apy || 0,
              staked_at: stake.staked_at || new Date().toISOString(),
              txHash: stake.tx_hash,
              packages: packageInfo,
              stakingHistory: historyData || [],
            };
          })
        );

        setUserStakes(processedStakes);
      } catch (err) {
        console.error("Error fetching user stakes:", err);
        setUserStakes([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserStakes();
  }, [isWalletConnected, walletAddress, hasSupabase]);

  // Function to save stake to database
  async function saveStakeToDatabase(stake: UserStake, userId: string) {
    try {
      // Periksa apakah supabase sudah diinisialisasi
      if (!supabase) {
        console.error("Supabase client is not initialized");
        return {
          success: false,
          error: "Database client not initialized",
          databaseId: null,
        };
      }

      const databaseStakeId = stake.id.startsWith("local-")
        ? uuidv4()
        : stake.id;

      // Pastikan package_id ada
      if (!stake.packages.id) {
        console.error("Package ID is missing");
        return {
          success: false,
          error: "Package ID is required",
          databaseId: null,
        };
      }

      // Insert into user_stakes table
      const { data: stakeData, error: stakeError } = await supabase
        .from("user_stakes")
        .insert({
          id: databaseStakeId,
          amount: stake.amount,
          apy: stake.apy,
          staked_at: stake.staked_at,
          user_id: userId,
          package_id: stake.packages.id,
          tx_hash: stake.txHash,
        })
        .select()
        .single();

      if (stakeError) {
        console.error("Error inserting stake:", stakeError);
        return { success: false, error: stakeError, databaseId: null };
      }

      // Insert history records
      if (stake.stakingHistory && stake.stakingHistory.length > 0) {
        try {
          const historyRecords = stake.stakingHistory.map((record) => ({
            id: uuidv4(),
            stake_id: databaseStakeId,
            value: record.value,
            timestamp: record.timestamp,
          }));

          const { error: historyError } = await supabase
            .from("staking_history")
            .insert(historyRecords);

          if (historyError) {
            console.error("Error inserting history records:", historyError);
            // Lanjut meskipun insert history gagal
          }
        } catch (historyErr) {
          console.error("Error processing history records:", historyErr);
          // Lanjut meskipun insert history gagal
        }
      }

      return { success: true, databaseId: databaseStakeId, data: stakeData };
    } catch (err) {
      console.error("Database save error:", err);
      return { success: false, error: err, databaseId: null };
    }
  }

  // Function to remove stake from database
  async function removeStakeFromDatabase(stakeId: string) {
    try {
      // Delete associated history records
      await supabase.from("staking_history").delete().eq("stake_id", stakeId);

      // Delete the stake record
      await supabase.from("user_stakes").delete().eq("id", stakeId);

      return { success: true };
    } catch (err) {
      console.error("Database delete error:", err);
      return { success: false, error: err };
    }
  }

  // Handle staking or wallet connection
  const handleStakeOrConnect = async (e: React.FormEvent) => {
    e.preventDefault();

    // If not connected, connect wallet first
    if (!isWalletConnected) {
      await onConnectWallet();
      return;
    }

    // Otherwise proceed with staking
    setError(null);

    if (!stakingAmount || !selectedPackage || !walletAddress) return;

    const amount = parseFloat(stakingAmount);

    // Basic validation
    if (isNaN(amount) || amount < 10) {
      alert("Minimum stake is 10 TEA");
      return;
    }

    setIsStaking(true);

    try {
      // Find selected package
      const selectedPkg = popularPackages.find(
        (pkg) => pkg.name === selectedPackage
      );
      if (!selectedPkg) throw new Error("Selected package not found");

      // Generate a unique ID for the stake
      const newStakeId = `local-${Date.now()}`;

      // Check if TEA balance is sufficient
      if (parseFloat(teaBalance) < amount) {
        throw new Error(
          `Insufficient TEA balance. You have ${teaBalance} TEA.`
        );
      }

      // Check wallet and network
      if (!window.ethereum) {
        throw new Error(
          "No Ethereum wallet found. Please install MetaMask or a compatible wallet."
        );
      }

      if (!networkCorrect) {
        await switchToTeaNetwork();
        const provider = new ethers.providers.Web3Provider(
          window.ethereum as any
        );
        const { chainId } = await provider.getNetwork();
        if (chainId !== TEA_CONFIG.CHAIN_ID) {
          throw new Error(
            `Please switch to ${TEA_CONFIG.NETWORK_NAME} network before staking.`
          );
        }
      }

      // Send transaction
      const txHash = await sendTeaTransaction("stake", selectedPkg, amount);
      if (txHash === "__USER_CANCELLED__") return;

      setPendingTxHash(txHash);

      // Record transaction in history system
      if (
        transactionService &&
        typeof transactionService.recordStake === "function"
      ) {
        await transactionService.recordStake(
          txHash,
          selectedPkg.name,
          amount,
          walletAddress
        );
      }

      // Calculate APY (simplified)
      const apy = Math.floor(Math.random() * 10) + 5; // 5-15% APY

      // Check if a stake for this package already exists
      const effectiveUserId = walletAddress;
      const existingStakeIndex = userStakes.findIndex(
        (stake) => stake.packages.name === selectedPackage
      );
      let updatedStake: UserStake;

      if (existingStakeIndex >= 0) {
        // Update existing stake
        const updatedStakes = [...userStakes];
        updatedStake = {
          ...updatedStakes[existingStakeIndex],
          amount: updatedStakes[existingStakeIndex].amount + amount,
          txHash: txHash,
          stakingHistory: [
            ...(updatedStakes[existingStakeIndex].stakingHistory || []),
            { timestamp: new Date().toISOString(), value: amount },
          ],
        };
        updatedStakes[existingStakeIndex] = updatedStake;
        setUserStakes(updatedStakes);
      } else {
        // Create new stake
        updatedStake = {
          id: newStakeId,
          amount: amount,
          apy: apy,
          staked_at: new Date().toISOString(),
          txHash: txHash,
          packages: {
            id: selectedPkg.id,
            name: selectedPkg.name,
            category: selectedPkg.category,
            downloads: selectedPkg.downloads,
          },
          stakingHistory: [
            { timestamp: new Date().toISOString(), value: amount },
          ],
        };
        setUserStakes((prev) => [...prev, updatedStake]);
      }

      // Save to database
      if (hasSupabase) {
        const saveResult = await saveStakeToDatabase(
          updatedStake,
          effectiveUserId
        );
        if (
          saveResult.success &&
          saveResult.databaseId &&
          updatedStake.id !== saveResult.databaseId
        ) {
          // Update local state with database ID
          setUserStakes((prevStakes) =>
            prevStakes.map((stake) =>
              stake.id === updatedStake.id
                ? { ...stake, id: saveResult.databaseId as string }
                : stake
            )
          );
        }
      }

      // Update TEA balance
      setTeaBalance((prev) => (parseFloat(prev) - amount).toString());

      // Reset form
      setStakingAmount("");
      setSelectedPackage("");
      alert(`Staking successful! Transaction: ${txHash}`);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      alert(`Staking failed: ${errorMessage}`);
    } finally {
      setIsStaking(false);
      setPendingTxHash(null);
      setTimeout(() => setError(null), 100);
    }
  };

  // Handle unstaking
  const handleUnstake = async (stakeId: string) => {
    if (!isWalletConnected || !walletAddress) {
      await onConnectWallet();
      return;
    }

    const stakeToUnstake = userStakes.find((stake) => stake.id === stakeId);
    if (!stakeToUnstake) {
      alert("Error: Stake not found");
      return;
    }

    setIsUnstaking(stakeId);
    setError(null);

    try {
      if (!window.ethereum) {
        throw new Error(
          "No Ethereum wallet found. Please install MetaMask or a compatible wallet."
        );
      }

      if (!networkCorrect) {
        await switchToTeaNetwork();
        const provider = new ethers.providers.Web3Provider(
          window.ethereum as any
        );
        const { chainId } = await provider.getNetwork();
        if (chainId !== TEA_CONFIG.CHAIN_ID) {
          throw new Error(
            `Please switch to ${TEA_CONFIG.NETWORK_NAME} network before unstaking.`
          );
        }
      }

      // Get on-chain stakes and find match
      const provider = new ethers.providers.Web3Provider(
        window.ethereum as any
      );
      const signer = provider.getSigner();
      const stakingContract = new ethers.Contract(
        TEA_CONFIG.STAKING_CONTRACT,
        STAKING_ABI,
        signer
      );
      const onChainStakes: OnChainStake[] =
        await stakingContract.getStakedPackages(walletAddress);

      let matchingStake = onChainStakes.find((stake) => {
        const onChainAmount = parseFloat(
          ethers.utils.formatEther(stake.amount)
        );
        return (
          stake.packageId === stakeToUnstake.packages.id &&
          Math.abs(onChainAmount - stakeToUnstake.amount) < 0.001
        );
      });

      if (!matchingStake) {
        matchingStake = onChainStakes.find(
          (stake) => stake.packageId === stakeToUnstake.packages.id
        );
      }

      if (!matchingStake) {
        throw new Error(
          "Could not find matching stake on blockchain. The stake may have already been unstaked."
        );
      }

      const txHash = await sendTeaTransaction(
        "unstake",
        stakeToUnstake.packages,
        0,
        matchingStake.id
      );
      if (txHash === "__USER_CANCELLED__") return;

      setPendingTxHash(txHash);

      // Record transaction in history
      if (
        transactionService &&
        typeof transactionService.recordUnstake === "function"
      ) {
        await transactionService.recordUnstake(
          txHash,
          stakeToUnstake.packages.name,
          stakeToUnstake.amount,
          walletAddress
        );
      }

      // Remove from database
      if (hasSupabase) {
        await removeStakeFromDatabase(stakeId);
      }

      // Update local state
      setUserStakes(userStakes.filter((stake) => stake.id !== stakeId));

      // Update TEA balance
      setTeaBalance((prev) =>
        (parseFloat(prev) + stakeToUnstake.amount).toString()
      );

      alert(`Unstaking successful! Transaction: ${txHash}`);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      alert(`Unstaking failed: ${errorMessage}`);
    } finally {
      setIsUnstaking(null);
      setPendingTxHash(null);
      setTimeout(() => setError(null), 100);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.stakingContainer}>
        <div className={`${styles.textCenter} ${styles.py10}`}>
          <div
            className={`${styles.loadingSpinner} ${styles.mxAuto} ${styles.mb4}`}
          ></div>
          <p>Loading staking data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.stakingContainer}>
      {/* Error notification */}
      {error && (
        <div
          className={`${styles.bgErrorLight} ${styles.textError} ${styles.p4} ${styles.roundedMd} ${styles.mb4} ${styles.borderL4} ${styles.borderError}`}
        >
          <div className={`${styles.flex} ${styles.itemsStart}`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`${styles.mr2} ${styles.mt1}`}
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <div>
              <h4 className={`${styles.fontMedium} ${styles.mb1}`}>Error</h4>
              <p className={styles.textSm}>{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Transaction pending notification */}
      {transactionPending && (
        <div className={styles.notificationContainer}>
          <div className={styles.spinnerContainer}>
            <div className={styles.spinner}></div>
          </div>
          <div className={styles.notificationContent}>
            <h4 className={styles.notificationTitle}>Transaction Pending</h4>
            <p className={styles.notificationText}>
              Your transaction is being processed on the blockchain...
              {pendingTxHash && (
                <a
                  href={`${TEA_CONFIG.EXPLORER_URL}${pendingTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.explorerLink}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z"
                      clipRule="evenodd"
                    />
                    <path
                      fillRule="evenodd"
                      d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                  View on Explorer
                </a>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Network warning - only show if wallet is connected */}
      {isWalletConnected && !networkCorrect && (
        <div
          className={`${styles.bgAmber50} ${styles.textAmber800} ${styles.p4} ${styles.roundedMd} ${styles.mb4} ${styles.borderL4} ${styles.borderAmber400}`}
        >
          <div className={`${styles.flex} ${styles.itemsStart}`}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`${styles.mr2} ${styles.mt1}`}
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <div>
              <h4 className={`${styles.fontMedium} ${styles.mb1}`}>
                Wrong Network
              </h4>
              <p className={styles.textSm}>
                Please switch to {TEA_CONFIG.NETWORK_NAME} for TEA Protocol
                staking.
              </p>
              <button
                className={`${styles.mt2} ${styles.btn} ${styles.btnAmber} ${styles.btnSm}`}
                onClick={async () => {
                  try {
                    if (window.ethereum) {
                      await switchToTeaNetwork();
                    }
                  } catch (err) {
                    console.error("Error switching network:", err);
                  }
                }}
              >
                Switch Network
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staking form and user stakes sections */}
      <div
        className={`${styles.grid} ${styles.gridCols1} ${styles.lgGridCols3} ${styles.gap4} ${styles.mb4}`}
      >
        {/* First column - staking form */}
        <div className={`${styles.card} ${styles.colSpan1}`}>
          <h3 className={styles.subtitle}>Stake Open Source Packages</h3>
          <p className={`${styles.textTertiary} ${styles.mb4}`}>
            Support open source development by staking on your favorite
            packages.
          </p>

          <form onSubmit={handleStakeOrConnect}>
            <div className={`${styles.formGroup} ${styles.mb3}`}>
              <label className={styles.formLabel}>Select Package</label>
              <select
                className={`${styles.formControl} ${styles.selectCustom}`}
                value={selectedPackage}
                onChange={(e) => setSelectedPackage(e.target.value)}
                disabled={isStaking || transactionPending}
              >
                <option value="">-- Select a package --</option>
                {popularPackages.map((pkg) => (
                  <option key={pkg.id} value={pkg.name}>
                    {pkg.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={`${styles.formGroup} ${styles.mb4}`}>
              <label className={styles.formLabel}>Stake Amount</label>
              <div className={styles.inputWithSuffix}>
                <input
                  type="number"
                  className={`${styles.formControl} ${styles.noArrows} ${styles.numericOnly}`}
                  placeholder=""
                  value={stakingAmount}
                  onChange={(e) => {
                    // Additional validation to ensure only numbers
                    const value = e.target.value;
                    if (value === "" || /^\d*\.?\d*$/.test(value)) {
                      setStakingAmount(value);
                    }
                  }}
                  onKeyDown={(e) => {
                    // Block non-numeric keys except for special keys
                    const specialKeys = [
                      "Backspace",
                      "Delete",
                      "ArrowLeft",
                      "ArrowRight",
                      "Tab",
                      ".",
                    ];
                    if (!/^\d$/.test(e.key) && !specialKeys.includes(e.key)) {
                      e.preventDefault();
                    }
                    // Allow only one decimal point
                    if (e.key === "." && stakingAmount.includes(".")) {
                      e.preventDefault();
                    }
                  }}
                  disabled={isStaking || transactionPending}
                  min="10"
                  step="any"
                />
                <span className={styles.inputSuffix}>TEA</span>
              </div>
              <div className={`${styles.flex} ${styles.justifyBetween}`}>
                <p
                  className={`${styles.textXs} ${styles.textTertiary} ${styles.mt1}`}
                >
                  Minimum stake: 10 TEA
                </p>
                {isWalletConnected && (
                  <p
                    className={`${styles.textXs} ${styles.textTertiary} ${styles.mt1}`}
                  >
                    Balance: {parseFloat(teaBalance).toLocaleString()} TEA
                  </p>
                )}
              </div>
            </div>

            <button
              type="submit"
              className={`${styles.btn} ${styles.btnPrimary} ${styles.wFull}`}
              disabled={
                (isWalletConnected && (!stakingAmount || !selectedPackage)) ||
                isStaking ||
                isUnstaking !== null ||
                transactionPending ||
                (isWalletConnected &&
                  parseFloat(teaBalance) < parseFloat(stakingAmount || "0"))
              }
            >
              {isStaking || transactionPending ? (
                <>
                  <span className={styles.loadingSpinner}></span>
                  {isStaking ? "Staking..." : "Signing Transaction..."}
                </>
              ) : !isWalletConnected ? (
                "Connect Wallet"
              ) : (
                "Stake Now"
              )}
            </button>
          </form>
        </div>

        {/* Second column - user stakes or wallet connection prompt */}
        <div
          className={`${styles.card} ${styles.colSpan1} ${styles.lgColSpan2}`}
        >
          <h3 className={styles.subtitle}>Your Staked Packages</h3>

          {!isWalletConnected ? (
            <div className={styles.emptyState}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`${styles.mxAuto} ${styles.mb2} ${styles.opacity40}`}
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <path d="M3 9h18"></path>
                <path d="M9 21V9"></path>
              </svg>
              <p>Connect your wallet to view your staked packages</p>
            </div>
          ) : userStakes.length > 0 ? (
            <div className={styles.stakedPackagesList}>
              <table className={styles.wFull}>
                <thead>
                  <tr>
                    <th>Package</th>
                    <th>Staked</th>
                    <th>APY</th>
                    <th>TX</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {userStakes.map((stake) => (
                    <tr key={stake.id}>
                      <td>
                        <div className={styles.packageName}>
                          {stake.packages.name}
                          {stake.id.startsWith("local-") && (
                            <span
                              className={`${styles.ml1} ${styles.textAmber500} ${styles.textXs}`}
                            >
                              (Temp)
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{stake.amount} TEA</td>
                      <td>{stake.apy}%</td>
                      <td>
                        {stake.txHash ? (
                          <a
                            href={`${TEA_CONFIG.EXPLORER_URL}${stake.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${styles.textPrimary} ${styles.textXs} ${styles.hoverUnderline}`}
                            title="View transaction on block explorer"
                          >
                            {stake.txHash.substring(0, 6)}...
                          </a>
                        ) : (
                          <span
                            className={`${styles.textTertiary} ${styles.textXs}`}
                          >
                            N/A
                          </span>
                        )}
                      </td>
                      <td>
                        <button
                          className={`${styles.actionBtn} ${
                            styles.unstakeBtn
                          } ${
                            isUnstaking === stake.id || transactionPending
                              ? styles.loading
                              : ""
                          }`}
                          onClick={() => handleUnstake(stake.id)}
                          disabled={
                            isUnstaking !== null ||
                            isStaking ||
                            transactionPending
                          }
                        >
                          {isUnstaking === stake.id ? (
                            <>
                              <span className={styles.loadingSpinner}></span>
                              Unstaking...
                            </>
                          ) : (
                            "Unstake"
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`${styles.mxAuto} ${styles.mb2} ${styles.opacity40}`}
              >
                <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
              <p>You haven&apos;t staked any packages yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Performance chart */}
      <div className={styles.card}>
        <h3 className={styles.subtitle}>Package Performance</h3>
        {isWalletConnected &&
        userStakes.length > 0 &&
        userStakes[0].stakingHistory ? (
          <StakingChart
            stakingData={userStakes[0].stakingHistory.map((item: any) => ({
              date: item.timestamp,
              amount: item.value,
            }))}
          />
        ) : (
          <div className={styles.placeholderChart}>
            <div
              className={`${styles.textCenter} ${styles.py8} ${styles.textTertiary}`}
            >
              {isWalletConnected
                ? "Stake packages to see their performance history"
                : "Connect wallet and stake packages to see performance history"}
            </div>
          </div>
        )}
      </div>

      {/* Popular packages */}
      <div className={`${styles.card} ${styles.mt4}`}>
        <div
          className={`${styles.flex} ${styles.justifyBetween} ${styles.itemsCenter} ${styles.mb4}`}
        >
          <h3 className={`${styles.subtitle} ${styles.mb0}`}>
            Popular Packages
          </h3>
          <div className={`${styles.badge} ${styles.badgePrimary}`}>
            Top Staked
          </div>
        </div>

        <div className={styles.popularPackagesGrid}>
          {popularPackages.map((pkg) => (
            <div key={pkg.id} className={styles.popularPackageCard}>
              <div className={styles.packageHeader}>
                <div className={styles.packageName}>{pkg.name}</div>
                <div className={styles.packageCategory}>{pkg.category}</div>
              </div>
              <div className={styles.packageDownloads}>{pkg.downloads}</div>
              <button
                className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm} ${styles.wFull} ${styles.mt2}`}
                onClick={() => {
                  if (!isWalletConnected) {
                    onConnectWallet();
                  } else {
                    setSelectedPackage(pkg.name);
                    document
                      .querySelector(`.${styles.stakingContainer}`)
                      ?.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                disabled={transactionPending}
              >
                {!isWalletConnected ? "Connect Wallet" : "Stake"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
