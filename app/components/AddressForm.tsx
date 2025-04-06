"use client";

import React, { useState } from "react";
import { addAddress } from "@/services/addressService";
import styles from "@/styles/address-components.module.css";

interface AddressFormProps {
  onAddressSubmitted: () => Promise<void>;
  existingAddresses: string[];
}

export default function AddressForm({
  onAddressSubmitted,
  existingAddresses,
}: AddressFormProps) {
  const [newAddress, setNewAddress] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isDuplicate, setIsDuplicate] = useState(false);

  const validateAddress = (address: string) => {
    // Simple Ethereum address validation
    return address.match(/^0x[a-fA-F0-9]{40}$/);
  };

  // Check for duplicates as user types
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewAddress(value);
    setError("");

    // Clean up the address for comparison
    const cleanedAddress = value.trim().toLowerCase();

    // Only check for duplicates if the address format is valid
    if (validateAddress(cleanedAddress)) {
      const duplicate = existingAddresses.some(
        (addr) => addr.toLowerCase() === cleanedAddress
      );
      setIsDuplicate(duplicate);

      if (duplicate) {
        setError("This address has already been added");
      }
    } else {
      setIsDuplicate(false);
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    // Clear previous messages
    setError("");
    setSuccessMessage("");

    // Trim the input
    const trimmedAddress = newAddress.trim();

    if (!trimmedAddress) {
      setError("Please enter an Ethereum address");
      return;
    }

    if (!validateAddress(trimmedAddress)) {
      setError("Please enter a valid Ethereum address");
      return;
    }

    // Prevent submission if it's a duplicate
    if (isDuplicate) {
      setError("This address has already been added.");
      return;
    }

    setIsSubmitting(true);

    try {
      const added = await addAddress(trimmedAddress);

      if (added) {
        setNewAddress("");
        setSuccessMessage("Address added successfully!");
        await onAddressSubmitted();
      } else {
        setError("This address has already been added.");
        setIsDuplicate(true);
      }
    } catch (err) {
      setError("Failed to add address. Please try again.");
    } finally {
      setIsSubmitting(false);

      // Clear success message after delay
      if (successMessage) {
        setTimeout(() => {
          setSuccessMessage("");
        }, 3000);
      }
    }
  };

  return (
    <div className="card">
      <h2 className="subtitle">Add KYC Verified Address</h2>

      {successMessage && (
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
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label htmlFor="address" className={styles.formLabel}>
            Ethereum Address
          </label>
          <div className={styles.inputButtonGroup}>
            <div className={styles.inputWrapper}>
              <input
                id="address"
                type="text"
                value={newAddress}
                onChange={handleAddressChange}
                placeholder="Enter Ethereum address (0x...)"
                className={`${styles.formControl} ${styles.withButton} ${
                  isDuplicate ? styles.duplicateInput : ""
                }`}
                disabled={isSubmitting}
                autoComplete="off"
              />
              {isDuplicate && (
                <div className={styles.duplicateIndicator}>
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
                </div>
              )}
            </div>
            <button
              type="submit"
              className={`${styles.btnPrimary} ${styles.formButton}`}
              disabled={isSubmitting || isDuplicate}
            >
              {isSubmitting ? (
                <>
                  <span className={styles.loadingSpinner}></span>
                  Adding...
                </>
              ) : (
                "Add Address"
              )}
            </button>
          </div>
          {error && <p className={styles.errorMessage}>{error}</p>}
        </div>
      </form>
    </div>
  );
}
