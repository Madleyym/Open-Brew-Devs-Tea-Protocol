"use client";

import React, { useState } from "react";
import styles from "@/styles/address-components.module.css";

interface AddressListProps {
  addresses: string[];
}

export default function AddressList({ addresses }: AddressListProps) {
  const [showShareMessage, setShowShareMessage] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  const filteredAddresses = searchTerm
    ? addresses.filter((addr) =>
        addr.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : addresses;

  const copyAddresses = () => {
    navigator.clipboard.writeText(addresses.join("\n"));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const shareWithDeveloper = () => {
    const subject = encodeURIComponent("TEA Protocol KYC Addresses");
    const body = encodeURIComponent(
      `KYC verified addresses:\n\n${addresses.join("\n")}\n\nTotal: ${
        addresses.length
      }`
    );
    const mailtoLink = `mailto:coming.soon@gmail.com?subject=${subject}&body=${body}`;
    window.open(mailtoLink);
    setShowShareMessage(true);
    setTimeout(() => setShowShareMessage(false), 2000);
  };

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-3">
        <div className="mb-2 sm:mb-0">
          <h2 className="subtitle flex items-center">
            KYC Verified Addresses
            <span className="inline-block ml-2 badge badge-primary">
              {addresses.length}{" "}
              {addresses.length === 1 ? "Address" : "Addresses"}
            </span>
          </h2>
        </div>

        <div className={styles.buttonsRow}>
          <button onClick={copyAddresses} className={styles.btnSecondary}>
            {copySuccess ? (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Copied
              </>
            ) : (
              "Copy All"
            )}
          </button>
          <button onClick={shareWithDeveloper} className={styles.btnPrimary}>
            Share
          </button>
        </div>
      </div>

      {showShareMessage && (
        <div className={styles.notification}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
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
          Addresses shared successfully!
        </div>
      )}

      <div className={styles.formGroup}>
        <div className={styles.searchContainer}>
          <svg
            className={styles.searchIcon}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Search addresses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
            autoComplete="off"
          />
        </div>
      </div>

      <div className={styles.addressList}>
        {filteredAddresses.length > 0 ? (
          <ul className={styles.addressListUl}>
            {filteredAddresses.map((address, index) => (
              <li key={index} className={styles.addressItem}>
                <div className={styles.addressLeft}>
                  <span className={styles.addressText}>{address}</span>
                </div>
                <span className={styles.badgeSuccess}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-1"
                  >
                    <path d="M20 6L9 17l-5-5"></path>
                  </svg>
                  Verified
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.emptyState}>
            {searchTerm ? (
              <>
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
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <p>No matching addresses found</p>
              </>
            ) : (
              <>
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
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="12" y1="8" x2="12" y2="16"></line>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                <p>No addresses added yet</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
