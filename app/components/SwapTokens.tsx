"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  fetchTokenBalances,
  fetchSwapQuote,
  executeTokenSwap,
  searchToken,
  addCustomToken,
  fetchTeaTokens,
  TokenBalance,
  SwapQuote,
  teaSepoliaNetwork,
  addLiquidity,
  revokeTokenApproval,
} from "@/services/tokenService";
import TokenImage from "./TokenImage";
import "@/styles/SwapTokens.css";
import { ethers } from "ethers";
// Impor fungsi-fungsi dari transactionLogService
import {
  logSwapTransaction,
  logLiquidityTransaction,
  logRevokeTransaction,
  updateTransactionStatus,
} from "@/services/transactionLogService";

// Definisi komponen untuk notifikasi batasan transaksi
const TransactionLimitNotice: React.FC = () => (
  <div className="transaction-limit-notice">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
    <span>
      Maximal SWAP size: <strong>0.25 TEA</strong> or{" "}
      <strong>0.35 BREW</strong> per transaction
    </span>
  </div>
);

// TEA Protocol network configuration - selaraskan dengan tokenService
const TEA_CONFIG = {
  CHAIN_ID: teaSepoliaNetwork.chainId,
  NETWORK_NAME: teaSepoliaNetwork.networkName,
  RPC_URL: teaSepoliaNetwork.rpcUrl,
  EXPLORER_URL: `${teaSepoliaNetwork.explorerUrl}/tx/`,
  CURRENCY_SYMBOL: teaSepoliaNetwork.currencySymbol,
  CONTRACT_ADDRESSES: {
    DEX: teaSepoliaNetwork.contractAddresses.dex, // Kontrak OpenBrew
  },
};

// Basic ERC20 ABI untuk cek allowance
const ERC20_ABI = [
  {
    constant: true,
    inputs: [
      { name: "_owner", type: "address" },
      { name: "_spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "remaining", type: "uint256" }],
    type: "function",
  },
];

interface SwapTokensProps {
  isWalletConnected: boolean;
  onConnectWallet: () => Promise<void>;
  walletAddress?: string;
}

/**
 * Formats a token balance to show fewer decimal places
 * @param balance - Original balance string
 * @param maxDecimals - MAXnumber of decimals to show
 * @returns Formatted balance
 */
const formatBalance = (balance: string, maxDecimals = 3): string => {
  if (!balance || isNaN(parseFloat(balance))) return "0";

  const num = parseFloat(balance);

  // For very small numbers, show more precision
  if (num > 0 && num < 0.0001) return "< 0.0001";

  // For larger numbers with decimals
  const formattedNum = num.toLocaleString("en-US", {
    maximumFractionDigits: maxDecimals,
    minimumFractionDigits: 0,
  });

  return formattedNum;
};

/**
 * Shortens a transaction hash for display
 * @param hash - The full transaction hash
 * @returns Shortened hash (e.g., 0xabcd...1234)
 */
const shortenHash = (hash: string): string => {
  if (!hash) return "";
  return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
};

/**
 * Transaction success message component
 */
const TransactionSuccessMessage = ({
  txHash,
  onClose,
  message = "Swap executed successfully!",
}: {
  txHash: string;
  onClose: () => void;
  message?: string;
}) => {
  return (
    <div className="premium-swap-success">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>
        {message}{" "}
        <a
          href={`${TEA_CONFIG.EXPLORER_URL}${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="transaction-hash"
        >
          {shortenHash(txHash)}
        </a>
      </span>
      <button onClick={onClose} className="close-message">
        ×
      </button>
    </div>
  );
};

type SwapMode = "swap" | "liquidity";

const SwapTokens: React.FC<SwapTokensProps> = ({
  isWalletConnected,
  onConnectWallet,
  walletAddress,
}) => {
  // Mode state (swap or liquidity)
  const [mode, setMode] = useState<SwapMode>("swap");

  // Token states
  const [tokenBalances, setTokenBalances] = useState<TokenBalance[]>([]);
  const [fromToken, setFromToken] = useState<string>("");
  const [toToken, setToToken] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [swapQuote, setSwapQuote] = useState<SwapQuote | null>(null);

  // Liquidity states
  const [liquidityTokenA, setLiquidityTokenA] = useState<string>("");
  const [liquidityTokenB, setLiquidityTokenB] = useState<string>("");
  const [liquidityAmountA, setLiquidityAmountA] = useState<string>("");
  const [liquidityAmountB, setLiquidityAmountB] = useState<string>("");
  const [addingLiquidity, setAddingLiquidity] = useState<boolean>(false);

  // UI control states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [liquiditySuccess, setLiquiditySuccess] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [slippage, setSlippage] = useState<string>("0.5");
  const [deadline, setDeadline] = useState<string>("20");

  // Token selector states
  const [showFromTokenSelector, setShowFromTokenSelector] =
    useState<boolean>(false);
  const [showToTokenSelector, setShowToTokenSelector] =
    useState<boolean>(false);
  const [showTokenASelectorLiquidity, setShowTokenASelectorLiquidity] =
    useState<boolean>(false);
  const [showTokenBSelectorLiquidity, setShowTokenBSelectorLiquidity] =
    useState<boolean>(false);
  const [tokenSearch, setTokenSearch] = useState<string>("");
  const [searchResults, setSearchResults] = useState<TokenBalance[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [customTokenAddress, setCustomTokenAddress] = useState<string>("");
  const [isAddingToken, setIsAddingToken] = useState<boolean>(false);

  // Network state
  const [networkCorrect, setNetworkCorrect] = useState(true);
  const [teaBalance, setTeaBalance] = useState<string>("0");
  const [transactionPending, setTransactionPending] = useState(false);
  const [pendingTxHash, setPendingTxHash] = useState<string | null>(null);
  // Tambahkan state untuk menandai proses approval
  const [isApproving, setIsApproving] = useState<boolean>(false);

  // State untuk token approvals
  const [approvedTokens, setApprovedTokens] = useState<string[]>([]);
  const [isRevoking, setIsRevoking] = useState<boolean>(false);
  const [showApprovals, setShowApprovals] = useState<boolean>(false);

  // State untuk tracking transaksi yang sedang berlangsung
  const [pendingTransactionId, setPendingTransactionId] = useState<
    string | null
  >(null);

  // Refs for closing dropdown on outside click
  const fromSelectorRef = useRef<HTMLDivElement>(null);
  const toSelectorRef = useRef<HTMLDivElement>(null);
  const liquidityTokenASelectorRef = useRef<HTMLDivElement>(null);
  const liquidityTokenBSelectorRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Fungsi untuk memeriksa apakah pasangan token adalah TEA-BREW
  const isTeaBrewPair = (): boolean => {
    if (!fromToken || !toToken) return false;

    const fromTokenInfo = tokenBalances.find((t) => t.address === fromToken);
    const toTokenInfo = tokenBalances.find((t) => t.address === toToken);

    if (!fromTokenInfo || !toTokenInfo) return false;

    // Cek jika pasangan TEA/WTEA dan BREW
    return (
      ((fromTokenInfo.symbol === "TEA" || fromTokenInfo.symbol === "WTEA") &&
        toTokenInfo.symbol === "BREW") ||
      ((toTokenInfo.symbol === "TEA" || toTokenInfo.symbol === "WTEA") &&
        fromTokenInfo.symbol === "BREW")
    );
  };

  // Handler untuk validasi batas maksimum transaksi
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Batasan jumlah maksimum sesuai token yang dipilih
    if (fromToken) {
      const token = tokenBalances.find((t) => t.address === fromToken);
      const MAX_TEA = 0.25;
      const MAX_BREW = 0.35;

      if (token) {
        if (
          (token.symbol === "TEA" || token.symbol === "WTEA") &&
          parseFloat(value) > MAX_TEA
        ) {
          setError(`MAX transaction size is ${MAX_TEA} TEA per transaction`);
        } else if (token.symbol === "BREW" && parseFloat(value) > MAX_BREW) {
          setError(`MAX transaction size is ${MAX_BREW} BREW per transaction`);
        } else {
          setError(null);
        }
      }
    }

    setAmount(value);
  };

  // Handler for liquidity amounts - without MAX validation
  const handleLiquidityAmountChange = (value: string, isTokenA: boolean) => {
    // No MAX amount validation for liquidity
    if (isTokenA) {
      setLiquidityAmountA(value);
    } else {
      setLiquidityAmountB(value);
    }

    // Always clear any previous errors when changing amount
    setError(null);
  };

  // Helper function untuk detect user rejection
  const isUserRejectionError = (error: any): boolean => {
    if (!error) return false;

    return (
      error.code === 4001 ||
      error.code === "ACTION_REJECTED" ||
      (error.message &&
        (error.message.includes("user rejected") ||
          error.message.includes("User denied") ||
          error.message.includes("User rejected") ||
          error.message.includes("transaction was rejected") ||
          error.message.includes("canceled") ||
          error.message.includes("cancelled") ||
          error.message.includes("denied by the user")))
    );
  };

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

  // Fungsi untuk cek token yang sudah diapprove - dengan rate limiting
  const checkTokenApprovals = async () => {
    if (!isWalletConnected || !walletAddress || !window.ethereum) return;

    try {
      const provider = new ethers.providers.Web3Provider(
        window.ethereum as any
      );
      const DEX_CONTRACT = teaSepoliaNetwork.contractAddresses.dex;

      // Cek approval untuk token yang bukan native
      const nonNativeTokens = tokenBalances.filter(
        (token) =>
          !token.isNative &&
          token.address !== "0x0000000000000000000000000000000000000000"
      );

      // Batasi pemrosesan menjadi 5 token sekaligus untuk meningkatkan kinerja
      const batchSize = 5;
      const approvedAddresses: string[] = [];

      for (let i = 0; i < nonNativeTokens.length; i += batchSize) {
        const batch = nonNativeTokens.slice(i, i + batchSize);

        const approvals = await Promise.all(
          batch.map(async (token) => {
            try {
              const contract = new ethers.Contract(
                token.address,
                ERC20_ABI,
                provider
              );
              const allowance = await contract.allowance(
                walletAddress,
                DEX_CONTRACT
              );

              return {
                address: token.address,
                hasAllowance: !allowance.isZero(),
              };
            } catch (e) {
              console.error(`Error checking approval for ${token.symbol}:`, e);
              return { address: token.address, hasAllowance: false };
            }
          })
        );

        approvals
          .filter((a) => a.hasAllowance)
          .forEach((a) => approvedAddresses.push(a.address));
      }

      setApprovedTokens(approvedAddresses);
    } catch (err) {
      console.error("Error checking token approvals:", err);
    }
  };

  // Handle revoke token approval dengan logging
  const handleRevokeApproval = async (tokenAddress: string) => {
    if (!isWalletConnected) {
      onConnectWallet();
      return;
    }

    try {
      setIsRevoking(true);
      setTransactionPending(true);

      // Get token details
      const token = tokenBalances.find(
        (t) => t.address.toLowerCase() === tokenAddress.toLowerCase()
      );

      // Log revoke sebagai "pending"
      const pendingId = `pending-${Date.now()}`;

      // Catat transaksi revoke sebagai 'pending'
      await logRevokeTransaction({
        txHash: pendingId,
        walletAddress: walletAddress || "",
        status: "pending",
        network: TEA_CONFIG.NETWORK_NAME,
        token: tokenAddress,
        tokenSymbol: token?.symbol || "Unknown",
        spender: TEA_CONFIG.CONTRACT_ADDRESSES.DEX,
      });

      // Eksekusi revoke
      const txHash = await revokeTokenApproval(tokenAddress);

      // Update status transaksi di database
      await logRevokeTransaction({
        txHash: txHash,
        walletAddress: walletAddress || "",
        status: "completed",
        blockNumber: 0, // Akan diisi dengan block number sebenarnya jika tersedia
        network: TEA_CONFIG.NETWORK_NAME,
        token: tokenAddress,
        tokenSymbol: token?.symbol || "Unknown",
        spender: TEA_CONFIG.CONTRACT_ADDRESSES.DEX,
      });

      // Hapus token dari daftar yang diapprove
      setApprovedTokens((prev) =>
        prev.filter((addr) => addr.toLowerCase() !== tokenAddress.toLowerCase())
      );

      setSuccessMessage(`Token approval revoked successfully!`);

      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      console.error("Failed to revoke approval:", err);

      // Catat transaksi sebagai gagal jika bukan user rejection
      if (!isUserRejectionError(err)) {
        await logRevokeTransaction({
          txHash: `failed-${Date.now()}`,
          walletAddress: walletAddress || "",
          status: "failed",
          network: TEA_CONFIG.NETWORK_NAME,
          token: tokenAddress,
          tokenSymbol:
            tokenBalances.find(
              (t) => t.address.toLowerCase() === tokenAddress.toLowerCase()
            )?.symbol || "Unknown",
          spender: TEA_CONFIG.CONTRACT_ADDRESSES.DEX,
        });
      }

      if (isUserRejectionError(err)) {
        setError("You rejected the transaction");
      } else {
        setError(err.message || "Failed to revoke token approval");
      }
    } finally {
      setIsRevoking(false);
      setTransactionPending(false);
    }
  };

  // Check network and fetch balance when wallet connects
  useEffect(() => {
    let mounted = true;
    let chainChangedListener: () => Promise<void>;

    if (isWalletConnected && walletAddress && window.ethereum) {
      const checkNetwork = async () => {
        try {
          const provider = new ethers.providers.Web3Provider(
            window.ethereum as any
          );
          const { chainId } = await provider.getNetwork();
          if (mounted) {
            setNetworkCorrect(chainId === TEA_CONFIG.CHAIN_ID);
          }
        } catch (err) {
          if (mounted) {
            setNetworkCorrect(false);
          }
        }
      };

      checkNetwork();
      fetchTeaBalance();

      // Delay token approvals check untuk mengurangi beban awal
      const approvalCheckTimeout = setTimeout(() => {
        if (mounted) {
          checkTokenApprovals();
        }
      }, 1500);

      // Create separate handler function to pass to event listener
      chainChangedListener = async () => {
        if (mounted) {
          await checkNetwork();
          await fetchTeaBalance();
        }
      };

      window.ethereum.on("chainChanged", chainChangedListener);

      return () => {
        mounted = false;
        clearTimeout(approvalCheckTimeout);
        if (window.ethereum && window.ethereum.removeListener) {
          window.ethereum.removeListener("chainChanged", chainChangedListener);
        }
      };
    }

    return () => {
      mounted = false;
    };
  }, [isWalletConnected, walletAddress]);

  // Load tokens when component mounts or wallet connection changes
  useEffect(() => {
    let mounted = true;

    const loadTokens = async () => {
      if (isWalletConnected && walletAddress) {
        await loadTokenBalances(walletAddress);
      } else {
        // Even if wallet is not connected, load the TEA tokens to display them
        await loadTeaTokensOnly();
      }
    };

    loadTokens();

    return () => {
      mounted = false;
    };
  }, [isWalletConnected, walletAddress]);

  // Check token approvals whenever token balances change (dengan delay)
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    if (isWalletConnected && walletAddress && tokenBalances.length > 0) {
      timeoutId = setTimeout(() => {
        if (mounted) {
          checkTokenApprovals();
        }
      }, 1000);
    }

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [isWalletConnected, walletAddress, tokenBalances.length]);

  // Load TEA tokens even when wallet is not connected
  const loadTeaTokensOnly = async () => {
    let mounted = true;

    try {
      setIsLoading(true);
      const teaTokens = await fetchTeaTokens();

      if (!mounted) return;

      setTokenBalances(teaTokens);

      // Set default tokens if available
      if (teaTokens.length > 0 && !fromToken) {
        const mainToken = teaTokens[0]; // Just use the first token as default
        if (mainToken) {
          setFromToken(mainToken.address);
          if (teaTokens.length > 1) {
            // Set token B as the second default token (likely BREW)
            const brewToken = teaTokens.find((t) => t.symbol === "BREW");
            if (brewToken) {
              setToToken(brewToken.address);
              setLiquidityTokenB(brewToken.address);
            } else {
              setToToken(teaTokens[1].address);
              setLiquidityTokenB(teaTokens[1].address);
            }
          }
          // Set liquidity token A to main token
          setLiquidityTokenA(mainToken.address);
        }
      }

      setError(null);
    } catch (err) {
      console.error("Failed to load TEA tokens:", err);
      if (mounted) {
        setError("Failed to load token list. Please try again later.");
      }
    } finally {
      if (mounted) {
        setIsLoading(false);
      }
    }

    return () => {
      mounted = false;
    };
  };

  useEffect(() => {
    // Click outside handler to close dropdowns
    const handleClickOutside = (event: MouseEvent) => {
      if (
        fromSelectorRef.current &&
        !fromSelectorRef.current.contains(event.target as Node)
      ) {
        setShowFromTokenSelector(false);
      }
      if (
        toSelectorRef.current &&
        !toSelectorRef.current.contains(event.target as Node)
      ) {
        setShowToTokenSelector(false);
      }
      if (
        liquidityTokenASelectorRef.current &&
        !liquidityTokenASelectorRef.current.contains(event.target as Node)
      ) {
        setShowTokenASelectorLiquidity(false);
      }
      if (
        liquidityTokenBSelectorRef.current &&
        !liquidityTokenBSelectorRef.current.contains(event.target as Node)
      ) {
        setShowTokenBSelectorLiquidity(false);
      }
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node)
      ) {
        setShowSettings(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Debounced search dengan throttling
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (tokenSearch.length > 2) {
        handleSearchToken();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delaySearch);
  }, [tokenSearch]);

  const loadTokenBalances = async (address: string) => {
    let mounted = true;

    try {
      setIsLoading(true);
      const balances = await fetchTokenBalances(address);

      if (!mounted) return;

      setTokenBalances(balances);

      // Set default tokens if available
      if (balances.length > 0 && !fromToken) {
        // Look for a common token like TEA to set as default
        const mainToken =
          balances.find((t) => t.symbol === "TEA" || t.symbol === "ETH") ||
          balances[0];

        if (mainToken) {
          setFromToken(mainToken.address);
          setLiquidityTokenA(mainToken.address);

          // Find BREW token and set as default for token B
          const brewToken = balances.find((t) => t.symbol === "BREW");
          if (brewToken) {
            setToToken(brewToken.address);
            setLiquidityTokenB(brewToken.address);
          }
        }
      }

      setError(null);
    } catch (err) {
      console.error("Failed to load token balances:", err);
      if (mounted) {
        setError("Failed to load token balances. Please try again later.");

        // Fall back to loading just TEA tokens if balance fetch fails
        loadTeaTokensOnly();
      }
    } finally {
      if (mounted) {
        setIsLoading(false);
      }
    }

    return () => {
      mounted = false;
    };
  };

  const handleSearchToken = async () => {
    if (tokenSearch.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const results = await searchToken(tokenSearch);
      setSearchResults(results);
    } catch (err) {
      console.error("Token search failed:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddCustomToken = async () => {
    if (!isWalletConnected) {
      onConnectWallet();
      return;
    }

    if (!customTokenAddress || !customTokenAddress.startsWith("0x")) {
      setError("Please enter a valid token address");
      return;
    }

    try {
      setIsAddingToken(true);
      const newToken = await addCustomToken(
        customTokenAddress,
        walletAddress || ""
      );

      // Add to balances if not already present
      if (
        !tokenBalances.find(
          (t) => t.address.toLowerCase() === customTokenAddress.toLowerCase()
        )
      ) {
        setTokenBalances((prev) => [...prev, newToken]);
      }

      setCustomTokenAddress("");
      setSuccessMessage(`${newToken.symbol} token added successfully`);

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      console.error("Failed to add custom token:", err);
      setError("Could not add token. Please verify the address is correct.");
    } finally {
      setIsAddingToken(false);
    }
  };

  const getSwapQuote = async () => {
    if (!isWalletConnected) {
      onConnectWallet();
      return;
    }

    if (!fromToken || !toToken || !amount) {
      setError("Please select tokens and enter an amount");
      return;
    }

    // Check if on correct network before getting quote
    if (!networkCorrect && window.ethereum) {
      try {
        const switched = await switchToTeaNetwork();
        if (!switched) {
          setError(`Please switch to the ${TEA_CONFIG.NETWORK_NAME} network`);
          return;
        }
      } catch (err) {
        setError(
          `Network error: Unable to switch to ${TEA_CONFIG.NETWORK_NAME}`
        );
        return;
      }
    }

    try {
      setIsLoading(true);
      setTransactionPending(true);
      const quote = await fetchSwapQuote(fromToken, toToken, amount, {
        slippage: parseFloat(slippage),
        deadline: parseInt(deadline),
      });
      setSwapQuote(quote);
      setError(null);
    } catch (err: any) {
      console.error("Failed to get swap quote:", err);

      // Mencari pesan error tentang batasan maksimum
      if (err.message && err.message.includes("MAX transaction size")) {
        setError(err.message);
      } else {
        setError(
          err.message || "Failed to fetch swap quote. Please try again."
        );
      }
    } finally {
      setIsLoading(false);
      setTransactionPending(false);
    }
  };

  // Swap direction function
  const swapTokenDirection = () => {
    if (!fromToken || !toToken) return;

    // Store current values in temporary variables
    const tempFromToken = fromToken;
    const tempToToken = toToken;

    // Clear the amount and quote when swapping direction
    setAmount("");
    setSwapQuote(null);

    // Swap the tokens using the temporary variables
    setFromToken(tempToToken);
    setToToken(tempFromToken);
  };

  const handleSwap = async () => {
    if (!isWalletConnected) {
      onConnectWallet();
      return;
    }

    if (!swapQuote) {
      setError("Please get a quote first");
      return;
    }

    // Check if on correct network before swapping
    if (!networkCorrect && window.ethereum) {
      try {
        const switched = await switchToTeaNetwork();
        if (!switched) {
          setError(`Please switch to the ${TEA_CONFIG.NETWORK_NAME} network`);
          return;
        }
      } catch (err) {
        setError(
          `Network error: Unable to switch to ${TEA_CONFIG.NETWORK_NAME}`
        );
        return;
      }
    }

    // Generate a transaction ID for this pending transaction
    const pendingTxId = `pending-${Date.now()}`;
    setPendingTransactionId(pendingTxId);

    try {
      setIsLoading(true);
      setTransactionPending(true);

      // Tandai status approval jika bukan token native
      if (
        swapQuote.fromToken !== "0x0000000000000000000000000000000000000000"
      ) {
        setIsApproving(true);
      }

      // Log transaksi sebagai "pending" ke Supabase
      await logSwapTransaction({
        txHash: pendingTxId,
        walletAddress: walletAddress || "",
        status: "pending",
        network: TEA_CONFIG.NETWORK_NAME,
        fromToken: swapQuote.fromToken,
        fromTokenSymbol:
          tokenBalances.find((t) => t.address === swapQuote.fromToken)
            ?.symbol || "Unknown",
        toToken: swapQuote.toToken,
        toTokenSymbol:
          tokenBalances.find((t) => t.address === swapQuote.toToken)?.symbol ||
          "Unknown",
        amountIn: swapQuote.inputAmount,
        amountOut: swapQuote.outputAmount,
        price: swapQuote.price,
        priceImpact: swapQuote.priceImpact,
        slippage: swapQuote.slippage,
        fee: swapQuote.fee,
      });

      // Eksekusi swap
      const txHash = await executeTokenSwap(swapQuote);
      setPendingTxHash(txHash);

      // Update transaksi di Supabase - dari pending ke completed
      await logSwapTransaction({
        txHash: txHash,
        walletAddress: walletAddress || "",
        status: "completed",
        blockNumber: 0, // Ideally get the block number from receipt
        network: TEA_CONFIG.NETWORK_NAME,
        fromToken: swapQuote.fromToken,
        fromTokenSymbol:
          tokenBalances.find((t) => t.address === swapQuote.fromToken)
            ?.symbol || "Unknown",
        toToken: swapQuote.toToken,
        toTokenSymbol:
          tokenBalances.find((t) => t.address === swapQuote.toToken)?.symbol ||
          "Unknown",
        amountIn: swapQuote.inputAmount,
        amountOut: swapQuote.outputAmount,
        price: swapQuote.price,
        priceImpact: swapQuote.priceImpact,
        slippage: swapQuote.slippage,
        fee: swapQuote.fee,
      });

      // Refresh balances after swap
      if (walletAddress) {
        loadTokenBalances(walletAddress);
        fetchTeaBalance();

        // Delay approval check untuk mencegah masalah timing
        setTimeout(() => {
          checkTokenApprovals();
        }, 2000);
      }

      // Store just the transaction hash, not the full message
      setSuccessMessage(txHash);
      setSwapQuote(null);
      setAmount("");
      setError(null);

      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      console.error("Failed to execute swap:", err);

      // Catat transaksi gagal ke Supabase (kecuali jika user menolak transaksi)
      if (!isUserRejectionError(err) && swapQuote) {
        await logSwapTransaction({
          txHash: `failed-${Date.now()}`,
          walletAddress: walletAddress || "",
          status: "failed",
          network: TEA_CONFIG.NETWORK_NAME,
          fromToken: swapQuote.fromToken,
          fromTokenSymbol:
            tokenBalances.find((t) => t.address === swapQuote.fromToken)
              ?.symbol || "Unknown",
          toToken: swapQuote.toToken,
          toTokenSymbol:
            tokenBalances.find((t) => t.address === swapQuote.toToken)
              ?.symbol || "Unknown",
          amountIn: swapQuote.inputAmount,
          amountOut: swapQuote.outputAmount,
          price: swapQuote.price,
          priceImpact: swapQuote.priceImpact,
          slippage: swapQuote.slippage,
          fee: swapQuote.fee,
        });
      }

      // Mencari pesan error tentang batasan maksimum
      if (err.message && err.message.includes("MAX transaction size")) {
        setError(err.message);
      } else if (isUserRejectionError(err)) {
        setError("You rejected the transaction");
      } else {
        setError(err.message || "Failed to execute swap. Please try again.");
      }
    } finally {
      setIsLoading(false);
      setTransactionPending(false);
      setIsApproving(false);
      setPendingTxHash(null);
      setPendingTransactionId(null);
    }
  };

  // Function to handle Add Liquidity with transaction logging
  const handleAddLiquidity = async () => {
    if (!isWalletConnected) {
      onConnectWallet();
      return;
    }

    if (
      !liquidityTokenA ||
      !liquidityTokenB ||
      !liquidityAmountA ||
      !liquidityAmountB
    ) {
      setError("Please select tokens and enter amounts for liquidity");
      return;
    }

    // Check if on correct network
    if (!networkCorrect && window.ethereum) {
      try {
        const switched = await switchToTeaNetwork();
        if (!switched) {
          setError(`Please switch to the ${TEA_CONFIG.NETWORK_NAME} network`);
          return;
        }
      } catch (err) {
        setError(
          `Network error: Unable to switch to ${TEA_CONFIG.NETWORK_NAME}`
        );
        return;
      }
    }

    // Generate a transaction ID for this pending transaction
    const pendingTxId = `pending-liquidity-${Date.now()}`;
    setPendingTransactionId(pendingTxId);

    try {
      setIsLoading(true);
      setTransactionPending(true);
      setAddingLiquidity(true);
      setIsApproving(true); // Needs approval for both tokens

      // Log transaksi liquidity sebagai "pending" di Supabase
      await logLiquidityTransaction({
        txHash: pendingTxId,
        walletAddress: walletAddress || "",
        status: "pending",
        network: TEA_CONFIG.NETWORK_NAME,
        tokenA: liquidityTokenA,
        tokenASymbol:
          tokenBalances.find((t) => t.address === liquidityTokenA)?.symbol ||
          "Unknown",
        tokenB: liquidityTokenB,
        tokenBSymbol:
          tokenBalances.find((t) => t.address === liquidityTokenB)?.symbol ||
          "Unknown",
        amountA: liquidityAmountA,
        amountB: liquidityAmountB,
      });

      // Eksekusi add liquidity
      const txHash = await addLiquidity(
        liquidityTokenA,
        liquidityTokenB,
        liquidityAmountA,
        liquidityAmountB
      );

      // Update transaksi di Supabase - dari pending ke completed
      await logLiquidityTransaction({
        txHash: txHash,
        walletAddress: walletAddress || "",
        status: "completed",
        blockNumber: 0, // Ideally get this from receipt
        network: TEA_CONFIG.NETWORK_NAME,
        tokenA: liquidityTokenA,
        tokenASymbol:
          tokenBalances.find((t) => t.address === liquidityTokenA)?.symbol ||
          "Unknown",
        tokenB: liquidityTokenB,
        tokenBSymbol:
          tokenBalances.find((t) => t.address === liquidityTokenB)?.symbol ||
          "Unknown",
        amountA: liquidityAmountA,
        amountB: liquidityAmountB,
        lpTokensReceived: "0", // Ideally get the LP tokens received from the event
      });

      // Refresh balances after adding liquidity
      if (walletAddress) {
        loadTokenBalances(walletAddress);
        fetchTeaBalance();

        // Delay approval check
        setTimeout(() => {
          checkTokenApprovals();
        }, 2000);
      }

      // Show liquidity success message
      setLiquiditySuccess(txHash);
      setLiquidityAmountA("");
      setLiquidityAmountB("");
      setError(null);

      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setLiquiditySuccess(null);
      }, 5000);
    } catch (err: any) {
      console.error("Failed to add liquidity:", err);

      // Catat transaksi gagal ke Supabase (kecuali jika user menolak transaksi)
      if (!isUserRejectionError(err)) {
        await logLiquidityTransaction({
          txHash: `failed-${Date.now()}`,
          walletAddress: walletAddress || "",
          status: "failed",
          network: TEA_CONFIG.NETWORK_NAME,
          tokenA: liquidityTokenA,
          tokenASymbol:
            tokenBalances.find((t) => t.address === liquidityTokenA)?.symbol ||
            "Unknown",
          tokenB: liquidityTokenB,
          tokenBSymbol:
            tokenBalances.find((t) => t.address === liquidityTokenB)?.symbol ||
            "Unknown",
          amountA: liquidityAmountA,
          amountB: liquidityAmountB,
        });
      }

      // Handle error message
      if (
        err.message === "Transaction rejected by user" ||
        err.message === "Transaction cancelled by user" ||
        isUserRejectionError(err)
      ) {
        setError("You rejected the transaction");
      } else {
        setError(err.message || "Failed to add liquidity. Please try again.");
      }
    } finally {
      setIsLoading(false);
      setTransactionPending(false);
      setAddingLiquidity(false);
      setIsApproving(false);
      setPendingTransactionId(null);
    }
  };

  const renderTokenSelector = (
    isFrom: boolean,
    selectorRef: React.RefObject<HTMLDivElement | null>,
    currentMode: "swap" | "liquidity" = "swap",
    isTokenA = true
  ) => {
    const handleTokenSelection = (token: TokenBalance) => {
      if (currentMode === "swap") {
        if (isFrom) {
          setFromToken(token.address);
          setShowFromTokenSelector(false);
        } else {
          setToToken(token.address);
          setShowToTokenSelector(false);
        }
      } else {
        // liquidity mode
        if (isTokenA) {
          setLiquidityTokenA(token.address);
          setShowTokenASelectorLiquidity(false);
        } else {
          setLiquidityTokenB(token.address);
          setShowTokenBSelectorLiquidity(false);
        }
      }
      setTokenSearch("");
      setSearchResults([]);
    };

    // Get popular tokens from our list for the common tokens section
    const popularSymbols = ["TEA", "BREW", "WTEA"]; // Prioritize BREW token
    const popularTokens = tokenBalances
      .filter((token) => popularSymbols.includes(token.symbol))
      .slice(0, 3);

    // If we don't have enough popular tokens, just use the first few available
    const commonTokens =
      popularTokens.length >= 3 ? popularTokens : tokenBalances.slice(0, 3);

    return (
      <div className="token-selector-dropdown" ref={selectorRef}>
        <div className="token-selector-header">
          <h3>Select a token</h3>
          <button
            className="close-selector"
            onClick={() => {
              if (currentMode === "swap") {
                isFrom
                  ? setShowFromTokenSelector(false)
                  : setShowToTokenSelector(false);
              } else {
                isTokenA
                  ? setShowTokenASelectorLiquidity(false)
                  : setShowTokenBSelectorLiquidity(false);
              }
            }}
          >
            ×
          </button>
        </div>

        <div className="token-search-container">
          <input
            type="text"
            className="token-search-input"
            placeholder="Search by name or address"
            value={tokenSearch}
            onChange={(e) => setTokenSearch(e.target.value)}
          />
        </div>

        {/* Common tokens section */}
        <div className="common-tokens">
          <div className="token-list-label">Common tokens</div>
          <div className="common-tokens-grid">
            {commonTokens.map((token) => (
              <button
                key={`common-${token.address}`}
                className="common-token-pill"
                onClick={() => handleTokenSelection(token)}
              >
                <TokenImage
                  iconUrl={token.iconUrl}
                  symbol={token.symbol}
                  width={18}
                  height={18}
                />
                {token.symbol}
              </button>
            ))}
          </div>
        </div>

        {/* Token list */}
        <div className="token-list">
          <div className="token-list-label">
            {tokenSearch.length > 2 ? "Search results" : "Your tokens"}
          </div>

          {isSearching ? (
            <div className="token-loading">
              <div className="token-loading-spinner"></div>
              <span>Searching...</span>
            </div>
          ) : (
            <>
              {(tokenSearch.length > 2 ? searchResults : tokenBalances).map(
                (token) => (
                  <div
                    key={token.address}
                    className="token-list-item"
                    onClick={() => handleTokenSelection(token)}
                  >
                    <div className="token-data">
                      <TokenImage
                        iconUrl={token.iconUrl}
                        symbol={token.symbol}
                        width={24}
                        height={24}
                      />
                      <div className="token-info">
                        <div className="token-symbol">{token.symbol}</div>
                        <div className="token-name">{token.name}</div>
                      </div>
                    </div>
                    {isWalletConnected &&
                      token.balance &&
                      parseFloat(token.balance) > 0 && (
                        <div className="token-balance">
                          {formatBalance(token.balance)}
                        </div>
                      )}
                  </div>
                )
              )}
            </>
          )}

          {!isSearching &&
            tokenSearch.length > 2 &&
            searchResults.length === 0 && (
              <div className="no-results">
                <div>No tokens found</div>
                {isWalletConnected ? (
                  <button
                    className="add-token-button"
                    onClick={() =>
                      setCustomTokenAddress(
                        tokenSearch.startsWith("0x") ? tokenSearch : ""
                      )
                    }
                  >
                    Import token
                  </button>
                ) : (
                  <button
                    className="add-token-button"
                    onClick={onConnectWallet}
                  >
                    Connect Wallet to Import
                  </button>
                )}
              </div>
            )}
        </div>
      </div>
    );
  };

  // Network warning banner - only show when wallet is connected
  const renderNetworkWarning = () => {
    if (!isWalletConnected || networkCorrect) return null;

    return (
      <div className="network-warning">
        <div className="warning-icon">
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
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <div className="warning-content">
          <h4>Wrong Network</h4>
          <p>Please switch to {TEA_CONFIG.NETWORK_NAME} for token swapping.</p>
          <button className="switch-network-btn" onClick={switchToTeaNetwork}>
            Switch Network
          </button>
        </div>
      </div>
    );
  };

  // Render the Swap UI
  const renderSwapUI = () => {
    return (
      <>
        {/* Swap Form */}
        <div className="premium-swap-form">
          {/* From token section */}
          <div className="premium-swap-field">
            <div className="premium-field-header">
              <span>From</span>
              {isWalletConnected &&
                fromToken &&
                tokenBalances.find((t) => t.address === fromToken) && (
                  <span className="balance-display">
                    Balance:{" "}
                    {formatBalance(
                      tokenBalances.find((t) => t.address === fromToken)
                        ?.balance || "0"
                    )}
                  </span>
                )}
            </div>

            <div className="premium-token-input-group">
              <input
                type="number"
                className="premium-amount-input"
                placeholder="0.0"
                value={amount}
                onChange={handleAmountChange}
                disabled={isLoading || transactionPending}
              />

              <div
                className="premium-token-selector-wrapper"
                ref={fromSelectorRef}
              >
                <button
                  className="premium-token-selector"
                  onClick={() =>
                    setShowFromTokenSelector(!showFromTokenSelector)
                  }
                  disabled={isLoading || transactionPending}
                >
                  {fromToken ? (
                    <>
                      <TokenImage
                        iconUrl={
                          tokenBalances.find((t) => t.address === fromToken)
                            ?.iconUrl
                        }
                        symbol={
                          tokenBalances.find((t) => t.address === fromToken)
                            ?.symbol || ""
                        }
                        width={24}
                        height={24}
                      />
                      <span className="token-symbol-text">
                        {
                          tokenBalances.find((t) => t.address === fromToken)
                            ?.symbol
                        }
                      </span>
                    </>
                  ) : (
                    <span>Select token</span>
                  )}
                </button>

                {showFromTokenSelector &&
                  renderTokenSelector(true, fromSelectorRef)}
              </div>
            </div>
          </div>

          {/* Swap direction button */}
          <div className="premium-swap-direction">
            <button
              className="premium-direction-button"
              onClick={swapTokenDirection}
              disabled={
                isLoading || !fromToken || !toToken || transactionPending
              }
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <polyline points="19 12 12 19 5 12"></polyline>
              </svg>
            </button>
          </div>

          {/* To token section */}
          <div className="premium-swap-field">
            <div className="premium-field-header">
              <span>To</span>
              {isWalletConnected &&
                toToken &&
                tokenBalances.find((t) => t.address === toToken) && (
                  <span className="balance-display">
                    Balance:{" "}
                    {formatBalance(
                      tokenBalances.find((t) => t.address === toToken)
                        ?.balance || "0"
                    )}
                  </span>
                )}
            </div>

            <div className="premium-token-input-group to-token">
              <div className="premium-expected-amount">
                {swapQuote ? (
                  formatBalance(swapQuote.outputAmount, 6)
                ) : (
                  <span className="placeholder-value">0.0</span>
                )}
              </div>

              <div
                className="premium-token-selector-wrapper"
                ref={toSelectorRef}
              >
                <button
                  className="premium-token-selector"
                  onClick={() => setShowToTokenSelector(!showToTokenSelector)}
                  disabled={isLoading || transactionPending}
                >
                  {toToken ? (
                    <>
                      <TokenImage
                        iconUrl={
                          tokenBalances.find((t) => t.address === toToken)
                            ?.iconUrl
                        }
                        symbol={
                          tokenBalances.find((t) => t.address === toToken)
                            ?.symbol || ""
                        }
                        width={24}
                        height={24}
                      />
                      <span className="token-symbol-text">
                        {
                          tokenBalances.find((t) => t.address === toToken)
                            ?.symbol
                        }
                      </span>
                    </>
                  ) : (
                    <span>Select token</span>
                  )}
                </button>

                {showToTokenSelector &&
                  renderTokenSelector(false, toSelectorRef)}
              </div>
            </div>
          </div>

          {/* Swap quote info */}
          {swapQuote && (
            <div className="premium-swap-info">
              <div className="info-row">
                <span>Price</span>
                <span>
                  1 {tokenBalances.find((t) => t.address === fromToken)?.symbol}{" "}
                  = {formatBalance(swapQuote.price.toString(), 6)}{" "}
                  {tokenBalances.find((t) => t.address === toToken)?.symbol}
                  {/* Tampilkan badge fixed rate untuk pasangan TEA-BREW */}
                  {isTeaBrewPair() && (
                    <span className="fixed-rate-badge">Fixed Rate</span>
                  )}
                </span>
              </div>
              <div className="info-row">
                <span>Price Impact</span>
                <span
                  className={
                    parseFloat(swapQuote.priceImpact) > 3 ? "high-impact" : ""
                  }
                >
                  {swapQuote.priceImpact}
                </span>
              </div>
              <div className="info-row">
                <span>Fee</span>
                <span>{swapQuote.fee}</span>
              </div>
              <div className="info-row">
                <span>Developer Fee</span>
                <span>0.01 TEA</span>
              </div>
              <div className="info-row">
                <span>Slippage Tolerance</span>
                <span>{slippage}%</span>
              </div>
              <div className="info-row">
                <span>Provider</span>
                <span>OpenBrew DEX</span>
              </div>
            </div>
          )}

          {/* Swap/Connect button */}
          {!swapQuote ? (
            <button
              className="premium-swap-button"
              onClick={isWalletConnected ? getSwapQuote : onConnectWallet}
              disabled={
                isLoading ||
                transactionPending ||
                (isWalletConnected && (!fromToken || !toToken || !amount))
              }
            >
              {isLoading ? (
                <>
                  <span className="premium-loading-spinner"></span>
                  Loading...
                </>
              ) : !isWalletConnected ? (
                "Connect Wallet"
              ) : !fromToken || !toToken ? (
                "Select tokens"
              ) : !amount ? (
                "Enter an amount"
              ) : (
                "Get Quote"
              )}
            </button>
          ) : (
            <div className="premium-swap-actions">
              <button
                className="premium-cancel-button"
                onClick={() => setSwapQuote(null)}
                disabled={isLoading || transactionPending}
              >
                Cancel
              </button>
              <button
                className="premium-swap-button"
                onClick={isWalletConnected ? handleSwap : onConnectWallet}
                disabled={isLoading || transactionPending}
              >
                {isLoading || transactionPending ? (
                  <>
                    <span className="premium-loading-spinner"></span>
                    {isApproving ? "Approving..." : "Processing..."}
                  </>
                ) : !isWalletConnected ? (
                  "Connect Wallet"
                ) : (
                  "Swap Now"
                )}
              </button>
            </div>
          )}
        </div>
      </>
    );
  };

  // Render the Add Liquidity UI
  const renderAddLiquidityUI = () => {
    return (
      <>
        <div className="premium-swap-form">
          {/* First token (Token A) */}
          <div className="premium-swap-field">
            <div className="premium-field-header">
              <span>Token A</span>
              {isWalletConnected &&
                liquidityTokenA &&
                tokenBalances.find((t) => t.address === liquidityTokenA) && (
                  <span className="balance-display">
                    Balance:{" "}
                    {formatBalance(
                      tokenBalances.find((t) => t.address === liquidityTokenA)
                        ?.balance || "0"
                    )}
                  </span>
                )}
            </div>

            <div className="premium-token-input-group">
              <input
                type="number"
                className="premium-amount-input"
                placeholder="0.0"
                value={liquidityAmountA}
                onChange={(e) =>
                  handleLiquidityAmountChange(e.target.value, true)
                }
                disabled={isLoading || addingLiquidity}
              />

              <div
                className="premium-token-selector-wrapper"
                ref={liquidityTokenASelectorRef}
              >
                <button
                  className="premium-token-selector"
                  onClick={() =>
                    setShowTokenASelectorLiquidity(!showTokenASelectorLiquidity)
                  }
                  disabled={isLoading || addingLiquidity}
                >
                  {liquidityTokenA ? (
                    <>
                      <TokenImage
                        iconUrl={
                          tokenBalances.find(
                            (t) => t.address === liquidityTokenA
                          )?.iconUrl
                        }
                        symbol={
                          tokenBalances.find(
                            (t) => t.address === liquidityTokenA
                          )?.symbol || ""
                        }
                        width={24}
                        height={24}
                      />
                      <span className="token-symbol-text">
                        {
                          tokenBalances.find(
                            (t) => t.address === liquidityTokenA
                          )?.symbol
                        }
                      </span>
                    </>
                  ) : (
                    <span>Select token</span>
                  )}
                </button>

                {showTokenASelectorLiquidity &&
                  renderTokenSelector(
                    true,
                    liquidityTokenASelectorRef,
                    "liquidity",
                    true
                  )}
              </div>
            </div>
          </div>

          {/* Second token (Token B) */}
          <div className="premium-swap-field">
            <div className="premium-field-header">
              <span>Token B</span>
              {isWalletConnected &&
                liquidityTokenB &&
                tokenBalances.find((t) => t.address === liquidityTokenB) && (
                  <span className="balance-display">
                    Balance:{" "}
                    {formatBalance(
                      tokenBalances.find((t) => t.address === liquidityTokenB)
                        ?.balance || "0"
                    )}
                  </span>
                )}
            </div>

            <div className="premium-token-input-group">
              <input
                type="number"
                className="premium-amount-input"
                placeholder="0.0"
                value={liquidityAmountB}
                onChange={(e) =>
                  handleLiquidityAmountChange(e.target.value, false)
                }
                disabled={isLoading || addingLiquidity}
              />

              <div
                className="premium-token-selector-wrapper"
                ref={liquidityTokenBSelectorRef}
              >
                <button
                  className="premium-token-selector"
                  onClick={() =>
                    setShowTokenBSelectorLiquidity(!showTokenBSelectorLiquidity)
                  }
                  disabled={isLoading || addingLiquidity}
                >
                  {liquidityTokenB ? (
                    <>
                      <TokenImage
                        iconUrl={
                          tokenBalances.find(
                            (t) => t.address === liquidityTokenB
                          )?.iconUrl
                        }
                        symbol={
                          tokenBalances.find(
                            (t) => t.address === liquidityTokenB
                          )?.symbol || ""
                        }
                        width={24}
                        height={24}
                      />
                      <span className="token-symbol-text">
                        {
                          tokenBalances.find(
                            (t) => t.address === liquidityTokenB
                          )?.symbol
                        }
                      </span>
                    </>
                  ) : (
                    <span>Select token</span>
                  )}
                </button>

                {showTokenBSelectorLiquidity &&
                  renderTokenSelector(
                    false,
                    liquidityTokenBSelectorRef,
                    "liquidity",
                    false
                  )}
              </div>
            </div>
          </div>

          {/* Information about adding liquidity */}
          <div className="liquidity-info">
            <p>
              <strong>Note:</strong> Adding liquidity will create a new pool or
              add to an existing pool. You will receive LP tokens representing
              your share of the pool.
            </p>
          </div>

          {/* Add Liquidity Button */}
          <button
            className="premium-swap-button"
            onClick={isWalletConnected ? handleAddLiquidity : onConnectWallet}
            disabled={
              isLoading ||
              addingLiquidity ||
              (isWalletConnected &&
                (!liquidityTokenA ||
                  !liquidityTokenB ||
                  !liquidityAmountA ||
                  !liquidityAmountB))
            }
          >
            {isLoading || addingLiquidity ? (
              <>
                <span className="premium-loading-spinner"></span>
                {isApproving ? "Approving..." : "Adding Liquidity..."}
              </>
            ) : !isWalletConnected ? (
              "Connect Wallet"
            ) : !liquidityTokenA || !liquidityTokenB ? (
              "Select tokens"
            ) : !liquidityAmountA || !liquidityAmountB ? (
              "Enter amounts"
            ) : (
              "Add Liquidity"
            )}
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="swap-container">
      {/* Network warning - only show when wallet is connected */}
      {renderNetworkWarning()}

      {/* Transaction pending notification */}
      {transactionPending && (
        <div className="transaction-pending">
          <div className="spinner-container">
            <div className="spinner"></div>
          </div>
          <div className="pending-content">
            <h4>
              {isApproving
                ? "Approval Pending"
                : isRevoking
                ? "Revoking Approval"
                : addingLiquidity
                ? "Adding Liquidity"
                : "Swap Pending"}
            </h4>
            <p>
              {isApproving
                ? "Please confirm token approval in your wallet..."
                : isRevoking
                ? "Revoking token approval. Please confirm in your wallet..."
                : addingLiquidity
                ? "Adding liquidity to the pool..."
                : "Your transaction is being processed on the blockchain..."}
              {pendingTxHash && (
                <a
                  href={`${TEA_CONFIG.EXPLORER_URL}${pendingTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="explorer-link"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    width="16"
                    height="16"
                  >
                    <path d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" />
                  </svg>
                  View on Explorer
                </a>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="swap-tabs">
        <button
          className={`swap-tab ${mode === "swap" ? "active" : ""}`}
          onClick={() => setMode("swap")}
        >
          Swap
        </button>
        <button
          className={`swap-tab ${mode === "liquidity" ? "active" : ""}`}
          onClick={() => setMode("liquidity")}
        >
          Add Liquidity
        </button>
      </div>

      {/* Transaction Limit Notice - only show for swap mode */}
      {mode === "swap" && <TransactionLimitNotice />}

      {/* Swap Section */}
      <div className="swap-section">
        <div className="premium-swap-header">
          <h2 className="subtitle">
            {mode === "swap" ? "Swap Tokens" : "Add Liquidity"}
          </h2>
          {isWalletConnected && mode === "swap" && (
            <div className="swap-actions">
              <button
                className="settings-button"
                onClick={() => setShowSettings(!showSettings)}
                aria-label="Transaction Settings"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
              </button>

              {/* Settings dropdown */}
              {showSettings && (
                <div className="settings-dropdown" ref={settingsRef}>
                  <div className="settings-header">
                    <h3>Transaction Settings</h3>
                    <button
                      className="close-settings"
                      onClick={() => setShowSettings(false)}
                    >
                      ×
                    </button>
                  </div>

                  <div className="settings-content">
                    <div className="setting-group">
                      <label>Slippage tolerance</label>
                      <div className="slippage-options">
                        <button
                          className={`slippage-preset ${
                            slippage === "0.1" ? "active" : ""
                          }`}
                          onClick={() => setSlippage("0.1")}
                        >
                          0.1%
                        </button>
                        <button
                          className={`slippage-preset ${
                            slippage === "0.5" ? "active" : ""
                          }`}
                          onClick={() => setSlippage("0.5")}
                        >
                          0.5%
                        </button>
                        <button
                          className={`slippage-preset ${
                            slippage === "1.0" ? "active" : ""
                          }`}
                          onClick={() => setSlippage("1.0")}
                        >
                          1.0%
                        </button>
                        <div className="slippage-custom">
                          <input
                            type="number"
                            value={slippage}
                            onChange={(e) => setSlippage(e.target.value)}
                            step="0.1"
                            min="0.1"
                            max="50"
                          />
                          <span>%</span>
                        </div>
                      </div>
                    </div>

                    <div className="setting-group">
                      <label>Transaction deadline</label>
                      <div className="deadline-setting">
                        <input
                          type="number"
                          value={deadline}
                          onChange={(e) => setDeadline(e.target.value)}
                          min="1"
                          max="180"
                        />
                        <span>minutes</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {/* Success and error messages */}
        {error && (
          <div className="premium-swap-error">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{error}</span>
            <button onClick={() => setError(null)} className="close-message">
              ×
            </button>
          </div>
        )}
        {/* Use our custom transaction success message component */}
        {successMessage && (
          <TransactionSuccessMessage
            txHash={successMessage}
            onClose={() => setSuccessMessage(null)}
            message={
              successMessage.includes("revoked")
                ? "Token approval revoked successfully!"
                : "Swap executed successfully!"
            }
          />
        )}{" "}
        {/* Liquidity success message */}
        {liquiditySuccess && (
          <TransactionSuccessMessage
            txHash={liquiditySuccess}
            onClose={() => setLiquiditySuccess(null)}
            message="Liquidity added successfully!"
          />
        )}
        {/* Main form based on current mode */}
        {mode === "swap" ? renderSwapUI() : renderAddLiquidityUI()}
      </div>

      {/* Approvals Management Section */}
      {isWalletConnected && approvedTokens.length > 0 && (
        <div className="approvals-section">
          <div className="approvals-header">
            <h3>Token Approvals</h3>
            <button
              className="toggle-approvals-button"
              onClick={() => setShowApprovals(!showApprovals)}
            >
              {showApprovals ? "Hide" : "Show"} ({approvedTokens.length})
            </button>
          </div>

          {showApprovals && (
            <div className="approvals-list">
              <p className="approvals-info">
                These tokens have been approved to be spent by the DEX contract.
                Consider revoking unused approvals for better security.
              </p>
              {approvedTokens.map((tokenAddress) => {
                const token = tokenBalances.find(
                  (t) => t.address.toLowerCase() === tokenAddress.toLowerCase()
                );
                return (
                  <div key={tokenAddress} className="approval-item">
                    <div className="token-info">
                      <TokenImage
                        iconUrl={token?.iconUrl}
                        symbol={token?.symbol || "Unknown"}
                        width={20}
                        height={20}
                      />
                      <span>{token?.symbol || "Unknown Token"}</span>
                    </div>
                    <button
                      className="revoke-button"
                      onClick={() => handleRevokeApproval(tokenAddress)}
                      disabled={transactionPending || isRevoking}
                    >
                      {isRevoking && approvedTokens.includes(tokenAddress) ? (
                        <>
                          <span className="small-spinner"></span>
                          Revoking...
                        </>
                      ) : (
                        "Revoke"
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SwapTokens;