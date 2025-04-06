"use client";
import React from "react";
import Link from "next/link";
import styles from "@/styles/Header.module.css"; // Import the CSS module

interface HeaderProps {
  walletConnected: boolean;
  walletAddress: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

export default function Header({
  walletConnected,
  walletAddress,
  connectWallet,
  disconnectWallet,
}: HeaderProps) {
  // Header styles now come from the CSS module
  return (
    <header className={styles.header}>
      <div className="container">
        <div className={styles.headerContent}>
          <h1 className={styles.headerTitle}>OpenBrew</h1>

          {!walletConnected ? (
            <button onClick={connectWallet} className="btn btn-primary">
              Connect Wallet
            </button>
          ) : (
            <div className={styles.walletInfo}>
              <span className="badge badge-success mr-2">Connected</span>
              <span className={styles.walletAddress}>
                {walletAddress?.substring(0, 6)}...
                {walletAddress?.substring(38)}
              </span>
              <button
                onClick={disconnectWallet}
                className={styles.disconnectBtn}
                title="Disconnect wallet"
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
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
