import React, { useState } from "react";
import styles from "@/styles/DashboardOverview.module.css";

export default function NetworkInfo() {
  const [addingNetwork, setAddingNetwork] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<{
    type: "success" | "error" | "info" | null;
    message: string;
  }>({ type: null, message: "" });

  const TEA_SEPOLIA_CHAIN_ID = 10218; // Chain ID untuk Tea Sepolia

  const networkDetails = {
    networkName: "Tea Sepolia",
    rpcUrl: "https://tea-sepolia.g.alchemy.com/public",
    chainId: TEA_SEPOLIA_CHAIN_ID.toString(), // "10218"
    symbol: "TEA",
    explorer: "https://sepolia.tea.xyz",
    faucet: "https://faucet-sepolia.tea.xyz/",
  };

  const addToMetaMask = async () => {
    if (!window.ethereum) {
      setNetworkStatus({
        type: "error",
        message: "MetaMask is not installed. Please install it first.",
      });
      return;
    }

    setAddingNetwork(true);
    setNetworkStatus({
      type: "info",
      message: "Requesting to add network to MetaMask...",
    });

    try {
      // Convert decimal chainId to hexadecimal with '0x' prefix
      const chainIdHex = `0x${parseInt(networkDetails.chainId).toString(16)}`;

      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainIdHex,
            chainName: networkDetails.networkName,
            nativeCurrency: {
              name: "TEA",
              symbol: networkDetails.symbol,
              decimals: 18,
            },
            rpcUrls: [networkDetails.rpcUrl],
            blockExplorerUrls: [networkDetails.explorer],
          },
        ],
      });

      setNetworkStatus({
        type: "success",
        message: "TEA Sepolia network was successfully added to MetaMask!",
      });
    } catch (error: any) {
      console.error("Failed to add network to MetaMask:", error);
      setNetworkStatus({
        type: "error",
        message:
          error.message ||
          "Failed to add network to MetaMask. Please try again.",
      });
    } finally {
      setAddingNetwork(false);
    }
  };

  // Custom styles for responsive network message
  const networkMessageStyles = {
    display: "flex",
    alignItems: "center",
    padding: "10px",
    borderRadius: "8px",
    marginBottom: "15px",
    fontSize: "14px",
  };

  // Get status-specific message styles
  const getMessageStyles = (type: "success" | "error" | "info" | null) => {
    switch (type) {
      case "success":
        return {
          backgroundColor: "rgba(0, 192, 127, 0.15)",
          color: "#00c07f",
          borderLeft: "3px solid #00c07f",
          ...networkMessageStyles,
        };
      case "error":
        return {
          backgroundColor: "rgba(239, 68, 68, 0.15)",
          color: "#ef4444",
          borderLeft: "3px solid #ef4444",
          ...networkMessageStyles,
        };
      case "info":
        return {
          backgroundColor: "rgba(59, 130, 246, 0.15)",
          color: "#3b82f6",
          borderLeft: "3px solid #3b82f6",
          ...networkMessageStyles,
        };
      default:
        return {};
    }
  };

  // Common button style to ensure consistent sizing
  const buttonStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "auto",
    flex: 1,
    minWidth: "130px",
    whiteSpace: "nowrap" as "nowrap",
  };

  return (
    <div className={styles.card}>
      <h3 className={styles.subtitle}>Network Information</h3>

      {networkStatus.type && (
        <div style={getMessageStyles(networkStatus.type)}>
          {networkStatus.type === "error" && (
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
              style={{ marginRight: "0.5rem", flexShrink: 0 }}
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          )}
          {networkStatus.type === "success" && (
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
              style={{ marginRight: "0.5rem", flexShrink: 0 }}
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          )}
          {networkStatus.type === "info" && (
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
              style={{ marginRight: "0.5rem", flexShrink: 0 }}
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          )}
          <span style={{ wordBreak: "break-word" }}>
            {networkStatus.message}
          </span>
        </div>
      )}

      <div
        className={
          styles.grid +
          " " +
          styles.gridCols1 +
          " " +
          styles.mdGridCols2 +
          " " +
          styles.mb4
        }
      >
        <div className={styles.statCard}>
          <div className={styles.statTitle}>Network Name</div>
          <div className={styles.statValue + " " + styles.textPrimary}>
            {networkDetails.networkName}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTitle}>Chain ID</div>
          <div className={styles.statValue}>{networkDetails.chainId}</div>
        </div>
      </div>

      <div
        className={
          styles.grid +
          " " +
          styles.gridCols1 +
          " " +
          styles.mdGridCols2 +
          " " +
          styles.mb4
        }
      >
        <div className={styles.statCard}>
          <div className={styles.statTitle}>Currency Symbol</div>
          <div className={styles.statValue + " " + styles.textSuccess}>
            {networkDetails.symbol}
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statTitle}>RPC URL</div>
          <div
            className={styles.statValue + " " + styles.textXs}
            style={{ wordBreak: "break-all" }} // Ensure long URLs wrap properly
          >
            {networkDetails.rpcUrl}
          </div>
        </div>
      </div>

      {/* Network action buttons with consistent sizing */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        {/* First row */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            width: "100%",
          }}
        >
          {/* MetaMask button - can be slightly wider */}
          <button
            onClick={addToMetaMask}
            className={styles.btn + " " + styles.btnPrimary}
            disabled={addingNetwork}
            style={{
              ...buttonStyle,
              flex: "1.2",
            }}
          >
            {addingNetwork ? (
              <>
                <div
                  className={styles.loader}
                  style={{
                    marginRight: "0.5rem",
                    width: "16px",
                    height: "16px",
                    flexShrink: 0,
                  }}
                ></div>
                <span>Adding...</span>
              </>
            ) : (
              <>
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
                  style={{ marginRight: "0.5rem", flexShrink: 0 }}
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <rect x="7" y="7" width="3" height="9"></rect>
                  <rect x="14" y="7" width="3" height="5"></rect>
                </svg>
                <span>Add to MetaMask</span>
              </>
            )}
          </button>

          {/* Get Test TEA button - equal flex with Block Explorer */}
          <a
            href={networkDetails.faucet}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btn + " " + styles.btnLight}
            style={buttonStyle}
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
              style={{ marginRight: "0.5rem", flexShrink: 0 }}
            >
              <path d="M18 8h1a4 4 0 0 1 0 8h-1"></path>
              <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path>
              <line x1="6" y1="1" x2="6" y2="4"></line>
              <line x1="10" y1="1" x2="10" y2="4"></line>
              <line x1="14" y1="1" x2="14" y2="4"></line>
            </svg>
            <span>Get Test TEA</span>
          </a>

          {/* Block Explorer button - equal flex with Get Test TEA */}
          <a
            href={networkDetails.explorer}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btn + " " + styles.btnLight}
            style={buttonStyle}
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
              style={{ marginRight: "0.5rem", flexShrink: 0 }}
            >
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            <span>Block Explorer</span>
          </a>
        </div>
      </div>
    </div>
  );
}
