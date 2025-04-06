"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  addAddress,
  getAddresses,
  setComponentActive,
  getTotalAddressCount,
  getNextPage,
  getPreviousPage,
  getPaginationInfo,
  resetPagination,
  searchAddress,
} from "@/services/addressService";
import styles from "@/styles/address-components.module.css";

interface KycAddressListProps {
  addresses: string[];
  onAddressSubmitted: (address?: string) => Promise<void>;
  existingAddresses: string[];
  walletAddress: string | null;
  setActiveTab?: (tab: string) => void; // It's defined as optional with ?
}

// Change this part in your KycAddressList.tsx component:
export default function KycAddressList({
  addresses: propAddresses,
  onAddressSubmitted,
  existingAddresses: propExistingAddresses,
  walletAddress,
  setActiveTab, // Add this line to properly extract the prop
}: KycAddressListProps) {
  const [internalAddresses, setInternalAddresses] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");
  const [totalAddressCount, setTotalAddressCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [autoRotateEnabled, setAutoRotateEnabled] = useState(true);
  const [secondsToRotation, setSecondsToRotation] = useState(60);
  const autoRotateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const rotationCountdownRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const currentDateTime = "2025-04-05 18:49:19"; // Updated current date/time
  const currentUser = "Brew"; // Updated current user login

  // Format function for display numbers with K for thousands
  const formatDisplayNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(num % 1000 < 100 ? 0 : 1) + "K";
    }
    return num.toString();
  };

  // Fungsi untuk mengambil alamat terbaru dari database
  const refreshAddresses = useCallback(async () => {
    setIsRefreshing(true);
    try {
      console.log(`Refreshing addresses at ${new Date().toLocaleTimeString()}`);

      // Ambil jumlah total alamat
      const total = await getTotalAddressCount();
      setTotalAddressCount(total);

      // Reset halaman saat refresh
      resetPagination();

      // Ambil alamat untuk halaman pertama
      const updatedAddresses = await getAddresses();

      // Dapatkan info pagination
      const { currentPage: page, totalPages: pages } = getPaginationInfo();
      setCurrentPage(page);
      setTotalPages(pages);

      // Update state internal
      setInternalAddresses(updatedAddresses);
      setLastRefreshed(new Date().toLocaleTimeString());

      // Reset timer untuk auto-rotate
      if (autoRotateEnabled) {
        setSecondsToRotation(60);
      }

      // Tampilkan notifikasi jika refresh dipicu oleh tombol
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 2000);

      return updatedAddresses;
    } catch (error) {
      console.error("Error saat mengambil alamat:", error);
      return [];
    } finally {
      setIsRefreshing(false);
    }
  }, [autoRotateEnabled]);

  // Fungsi untuk mendapatkan halaman berikutnya
  const fetchNextPage = useCallback(async () => {
    if (isSearching) return; // Jangan ganti halaman saat mode pencarian

    setIsRefreshing(true);
    try {
      const { addresses, page, totalPages: pages } = await getNextPage();
      setInternalAddresses(addresses);
      setCurrentPage(page);
      setTotalPages(pages);
      setLastRefreshed(new Date().toLocaleTimeString());

      // Reset timer untuk auto-rotate
      if (autoRotateEnabled) {
        setSecondsToRotation(60);
      }

      return addresses;
    } catch (error) {
      console.error("Error fetching next page:", error);
      return [];
    } finally {
      setIsRefreshing(false);
    }
  }, [isSearching, autoRotateEnabled]);

  // Fungsi untuk mendapatkan halaman sebelumnya
  const fetchPreviousPage = useCallback(async () => {
    if (isSearching) return; // Jangan ganti halaman saat mode pencarian

    setIsRefreshing(true);
    try {
      const { addresses, page, totalPages: pages } = await getPreviousPage();
      setInternalAddresses(addresses);
      setCurrentPage(page);
      setTotalPages(pages);
      setLastRefreshed(new Date().toLocaleTimeString());

      // Reset timer untuk auto-rotate
      if (autoRotateEnabled) {
        setSecondsToRotation(60);
      }

      return addresses;
    } catch (error) {
      console.error("Error fetching previous page:", error);
      return [];
    } finally {
      setIsRefreshing(false);
    }
  }, [isSearching, autoRotateEnabled]);

  // Fungsi untuk mencari alamat
  const handleSearch = useCallback(async (term: string) => {
    if (!term || term.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchAddress(term);
      setSearchResults(results);
    } catch (error) {
      console.error("Error searching addresses:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Set active status and cleanup on unmount
  useEffect(() => {
    console.log("KycAddressList component mounted");
    setComponentActive(true);

    return () => {
      console.log("KycAddressList component unmounting");
      setComponentActive(false);
      setInternalAddresses([]); // Clear memory

      // Clear timers
      if (autoRotateTimerRef.current) {
        clearInterval(autoRotateTimerRef.current);
        autoRotateTimerRef.current = null;
      }

      if (rotationCountdownRef.current) {
        clearInterval(rotationCountdownRef.current);
        rotationCountdownRef.current = null;
      }
    };
  }, []);

  // Efek untuk search debounce
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchTerm) {
        handleSearch(searchTerm);
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(delaySearch);
  }, [searchTerm, handleSearch]);

  // Inisialisasi data saat komponen dimuat
  useEffect(() => {
    const initializeAddresses = async () => {
      if (propAddresses && propAddresses.length > 0) {
        setInternalAddresses(propAddresses);
        // Tetap dapatkan total count
        const total = await getTotalAddressCount();
        setTotalAddressCount(total);

        // Get pagination info
        const { currentPage: page, totalPages: pages } = getPaginationInfo();
        setCurrentPage(page);
        setTotalPages(pages);
      } else {
        await refreshAddresses();
      }
    };

    initializeAddresses();
  }, [refreshAddresses, propAddresses]);

  // Efek untuk auto-rotate
  useEffect(() => {
    // Start auto-rotate timer
    const startAutoRotate = () => {
      if (autoRotateTimerRef.current) {
        clearInterval(autoRotateTimerRef.current);
        autoRotateTimerRef.current = null;
      }

      if (rotationCountdownRef.current) {
        clearInterval(rotationCountdownRef.current);
        rotationCountdownRef.current = null;
      }

      if (autoRotateEnabled && !searchTerm) {
        console.log("Starting auto-rotate timer (60 second interval)");

        // Set timer untuk countdown setiap detik
        rotationCountdownRef.current = setInterval(() => {
          setSecondsToRotation((prev) => {
            if (prev <= 1) {
              return 60; // Reset ke 60 detik
            }
            return prev - 1;
          });
        }, 1000);

        // Set timer untuk rotasi halaman setiap 60 detik
        autoRotateTimerRef.current = setInterval(() => {
          console.log("Auto rotating to next page...");
          fetchNextPage();
        }, 60000); // 60 detik
      }
    };

    startAutoRotate();

    // Cleanup interval on unmount or when dependencies change
    return () => {
      if (autoRotateTimerRef.current) {
        clearInterval(autoRotateTimerRef.current);
        autoRotateTimerRef.current = null;
      }

      if (rotationCountdownRef.current) {
        clearInterval(rotationCountdownRef.current);
        rotationCountdownRef.current = null;
      }
    };
  }, [fetchNextPage, autoRotateEnabled, searchTerm]);

  // Reset auto-rotate when search term changes
  useEffect(() => {
    if (searchTerm) {
      // Disable auto-rotate during search
      if (autoRotateTimerRef.current) {
        clearInterval(autoRotateTimerRef.current);
        autoRotateTimerRef.current = null;
      }

      if (rotationCountdownRef.current) {
        clearInterval(rotationCountdownRef.current);
        rotationCountdownRef.current = null;
      }
    } else if (autoRotateEnabled) {
      // Re-enable auto-rotate when search is cleared
      if (autoRotateTimerRef.current) {
        clearInterval(autoRotateTimerRef.current);
      }

      if (rotationCountdownRef.current) {
        clearInterval(rotationCountdownRef.current);
      }

      // Reset countdown
      setSecondsToRotation(60);

      // Start countdown timer
      rotationCountdownRef.current = setInterval(() => {
        setSecondsToRotation((prev) => {
          if (prev <= 1) {
            return 60; // Reset ke 60 detik
          }
          return prev - 1;
        });
      }, 1000);

      // Start page rotation timer
      autoRotateTimerRef.current = setInterval(() => {
        console.log("Auto rotating to next page...");
        fetchNextPage();
      }, 60000); // 60 detik
    }
  }, [searchTerm, fetchNextPage, autoRotateEnabled]);

  // Tentukan alamat yang akan ditampilkan
  const displayAddresses = searchTerm
    ? searchResults
    : internalAddresses.length > 0
    ? internalAddresses
    : propAddresses || [];

  // Tentukan alamat untuk pengecekan duplikat
  const addressesForDuplicateCheck = propExistingAddresses || displayAddresses;

  // Copy addresses with numbers in K format
  const copyAddresses = () => {
    // Gunakan displayAddresses untuk mencakup hasil pencarian jika ada
    const addresses = searchTerm ? searchResults : internalAddresses;

    // Hitung offset berdasarkan halaman saat ini
    const offset = searchTerm ? 0 : currentPage * 1000;

    // Buat alamat dengan nomor (format K untuk ribuan)
    const numberedAddresses = addresses.map((addr, idx) => {
      const displayIndex = offset + idx + 1;
      const formattedIndex =
        displayIndex >= 1000 ? formatDisplayNumber(displayIndex) : displayIndex;
      return `${formattedIndex}. ${addr}`;
    });

    // Join all addresses with line breaks
    const textToCopy = numberedAddresses.join("\n");

    // Copy to clipboard
    navigator.clipboard.writeText(textToCopy);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);

    console.log(`Copied ${addresses.length} addresses to clipboard`);
  };

  const validateAddress = (address: string) => {
    return address.match(/^0x[a-fA-F0-9]{40}$/);
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewAddress(value);
    setError("");

    const cleanedAddress = value.trim().toLowerCase();

    if (validateAddress(cleanedAddress)) {
      const duplicate = addressesForDuplicateCheck.some(
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

    setError("");
    setSuccessMessage("");

    const trimmedAddress = newAddress.trim();

    if (!trimmedAddress) {
      setError("Please enter an Ethereum address");
      return;
    }

    if (!validateAddress(trimmedAddress)) {
      setError("Please enter a valid Ethereum address");
      return;
    }

    if (isDuplicate) {
      setError("This address has already been added.");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("Menambahkan alamat:", trimmedAddress);
      const added = await addAddress(trimmedAddress);

      if (added) {
        setNewAddress("");
        setSuccessMessage("Address added successfully!");

        console.log("Alamat berhasil ditambahkan ke database.");

        // Penting: Tambahkan delay sebelum refresh untuk memastikan database terupdate
        console.log(
          "Menunggu 1 detik sebelum refresh untuk memastikan database terupdate..."
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Refresh data dari database setelah berhasil menambahkan (auto refresh)
        console.log("Memulai refresh data setelah penambahan...");
        const freshAddresses = await refreshAddresses();
        console.log(
          "Data alamat telah diperbarui setelah penambahan. Jumlah:",
          freshAddresses.length
        );

        // Panggil callback jika ada
        if (onAddressSubmitted) {
          console.log("Memanggil onAddressSubmitted callback...");
          await onAddressSubmitted(walletAddress || undefined);
        }
      } else {
        console.log("Alamat sudah ada di database.");
        setError("This address has already been added.");
        setIsDuplicate(true);
      }
    } catch (err) {
      console.error("Error saat menambahkan alamat:", err);
      setError("Failed to add address. Please try again.");
    } finally {
      setIsSubmitting(false);

      if (successMessage) {
        setTimeout(() => {
          setSuccessMessage("");
        }, 3000);
      }
    }
  };

  // Toggle auto-rotate
  const toggleAutoRotate = () => {
    setAutoRotateEnabled((prev) => !prev);
  };

  // Calculate start and end index for current page
  const startIndex = searchTerm ? 1 : currentPage * 1000 + 1;
  const endIndex = searchTerm
    ? searchResults.length
    : Math.min(startIndex + internalAddresses.length - 1, totalAddressCount);

  // Clear search and return to page view
  const clearSearch = () => {
    setSearchTerm("");
    setSearchResults([]);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  return (
    <div className={styles.kycContainer}>
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

        {/* Notice about KYC submissions being closed */}
        <div
          className={styles.notification}
          style={{
            backgroundColor: "rgba(255, 152, 0, 0.1)",
            borderLeft: "3px solid #ff9800",
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ff9800"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          KYC Address submissions are now closed. Please try our Token Swap or
          Package Staking features!
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="address" className={styles.formLabel}>
              Ethereum Address
            </label>
            <div className={styles.inputContainer}>
              <div className={styles.inputWrapper}>
                <input
                  id="address"
                  type="text"
                  value={newAddress}
                  onChange={handleAddressChange}
                  placeholder="Address submissions are closed"
                  className={styles.formControl}
                  style={{
                    backgroundColor: "rgba(0, 0, 0, 0.1)",
                    color: "var(--text-tertiary)",
                  }}
                  disabled={true}
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
                className={styles.addButton}
                style={{ opacity: 0.6, cursor: "not-allowed" }}
                disabled={true}
              >
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
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                  <line x1="12" y1="8" x2="12" y2="16"></line>
                </svg>
                Closed
              </button>
            </div>
            {error && <p className={styles.errorMessage}>{error}</p>}
          </div>
        </form>
      </div>

      <div className="card mt-4">
        <div className={styles.stakingPromo}>
          <div className={styles.stakingPromoHeader}>
            <h2 className="subtitle">Important KYC Address Updates! 📢</h2>
            <span className={styles.stakingDateBadge}>{currentDateTime}</span>
          </div>

          <div className={styles.stakingPromoContent}>
            <p>
              <b>
                Dear{" "}
                {currentUser ||
                  (walletAddress ? "OpenBrew Community" : "valued users")}
                !
              </b>{" "}
              Thank you so much for participating in our OpenBrew trials! Your
              feedback and enthusiasm have been incredibly valuable to our
              project&apos;s development.
            </p>

            <div className={styles.stakingMessage}>
              <p>
                &quot;We&apos;re excited to announce that in the next 10 days,
                all addresses will be verified using the common zkPass API for
                enhanced security. Please note that{" "}
                <strong>KYC address submissions are now closed</strong>. We
                invite you to explore our Token Swap feature and Package Staking
                options which are fully operational and waiting for you to
                experience!&quot;
              </p>
            </div>

            {/* Using stakingCTA and stakingButton classes from existing CSS */}
            <div
              className={styles.stakingCTA}
              style={{ display: "flex", gap: "12px" }}
            >
              <button
                className={styles.stakingButton}
                style={{
                  background: "linear-gradient(135deg, #3494e6, #6a82fb)",
                  marginRight: "12px",
                }}
                onClick={() => {
                  if (setActiveTab) {
                    setActiveTab("swap");
                  } else {
                    console.warn("setActiveTab not provided to KycAddressList");
                  }
                }}
              >
                Try Token Swap
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
                  style={{ marginLeft: "8px" }}
                >
                  <path d="M16 3l-4 4-4-4"></path>
                  <path d="M12 3v14"></path>
                  <path d="M8 17l4 4 4-4"></path>
                </svg>
              </button>

              <button
                className={styles.stakingButton}
                onClick={() => {
                  if (setActiveTab) {
                    setActiveTab("staking");
                  } else {
                    console.warn("setActiveTab not provided to KycAddressList");
                  }
                }}
              >
                Try Package Staking
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
                  style={{ marginLeft: "8px" }}
                >
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
            </div>

            <div className={styles.stakingStats}>
              <div className={styles.stakingStatItem}>
                <span className={styles.stakingStatValue}>9.5%</span>
                <span className={styles.stakingStatLabel}>AVG APY</span>
              </div>
              <div className={styles.stakingStatItem}>
                <span className={styles.stakingStatValue}>2989</span>
                <span className={styles.stakingStatLabel}>ACTIVE STAKERS</span>
              </div>
            </div>

            <div className={styles.stakingThanks}>
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
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
              <span>
                We&apos;re grateful for your support in testing OpenBrew. Your
                participation has made our platform stronger and more secure for
                everyone!
              </span>
            </div>
          </div>
        </div>

        <div className={styles.headerContainer}>
          <div className={styles.headerSection}>
            <div className={styles.headerTitle}>
              <h2 className="subtitle">KYC Verified Addresses</h2>
              <span className={styles.badgePrimary}>
                {totalAddressCount > 0
                  ? formatDisplayNumber(totalAddressCount)
                  : formatDisplayNumber(displayAddresses.length)}{" "}
                {totalAddressCount === 1 || displayAddresses.length === 1
                  ? "Address"
                  : "Addresses"}
              </span>
            </div>

            <div className={styles.headerInfo}>
              {lastRefreshed && (
                <span className={styles.infoItem}>
                  Last updated: {lastRefreshed}
                </span>
              )}

              {!searchTerm && totalPages > 0 && (
                <span className={styles.infoItem}>
                  Page {currentPage + 1} of {totalPages}{" "}
                  <span className={styles.badgeSecondary}>
                    #{formatDisplayNumber(startIndex)}-
                    {formatDisplayNumber(endIndex)}
                  </span>
                </span>
              )}

              {searchTerm && (
                <span className={styles.infoItem}>
                  <span className={styles.badgeSecondary}>
                    Search results: {searchResults.length} matches
                  </span>
                </span>
              )}

              <span className={styles.infoItem}>
                <button
                  className={`${styles.autorotateToggle} ${
                    autoRotateEnabled ? styles.enabled : styles.disabled
                  }`}
                  onClick={toggleAutoRotate}
                  title={
                    autoRotateEnabled
                      ? "Disable auto rotation"
                      : "Enable auto rotation"
                  }
                >
                  {autoRotateEnabled ? "Auto Rotate: ON" : "Auto Rotate: OFF"}
                </button>
              </span>

              {autoRotateEnabled && !searchTerm && (
                <span className={styles.infoItem}>
                  <span className={styles.alignCenter}>
                    ⏭ Next page in{" "}
                    <span className={styles.autoRotateTimer}>
                      {secondsToRotation}s
                    </span>
                  </span>
                </span>
              )}
            </div>
          </div>

          <div className={styles.actionButtons}>
            <button
              onClick={copyAddresses}
              className={styles.copyButton}
              title="Copy all addresses with their numbers"
            >
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
                    <rect
                      x="9"
                      y="9"
                      width="13"
                      height="13"
                      rx="2"
                      ry="2"
                    ></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                  Copy All
                </>
              )}
            </button>
            <button
              onClick={refreshAddresses}
              className={styles.refreshButton}
              disabled={isRefreshing}
            >
              {refreshSuccess ? (
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
                  Updated
                </>
              ) : isRefreshing ? (
                <>
                  <span className={styles.loadingSpinner}></span>
                  Refreshing...
                </>
              ) : (
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
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                  </svg>
                  Refresh
                </>
              )}
            </button>
          </div>
        </div>

        {refreshSuccess && (
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
            Data refreshed successfully!
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
              ref={searchInputRef}
              type="text"
              placeholder="Search addresses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
              autoComplete="off"
            />
            {isSearching && (
              <span
                className={`${styles.loadingSpinner} ${styles.searchSpinner}`}
              ></span>
            )}
          </div>
        </div>

        {!searchTerm && (
          <div className={styles.paginationControls}>
            <button
              className={styles.paginationBtn}
              onClick={fetchPreviousPage}
              disabled={isRefreshing || searchTerm !== ""}
            >
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
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
              Previous
            </button>

            <span className="text-sm text-gray-500">
              Page {currentPage + 1} of {totalPages}
            </span>

            <button
              className={styles.paginationBtn}
              onClick={fetchNextPage}
              disabled={isRefreshing || searchTerm !== ""}
            >
              Next
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
                className="ml-1"
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        )}

        <div className={styles.addressList}>
          {isRefreshing ? (
            <div className="flex justify-center items-center py-4">
              <div className={styles.loadingSpinner}></div>
              <span className="ml-2">Refreshing addresses...</span>
            </div>
          ) : displayAddresses.length > 0 ? (
            <>
              <ul className={styles.addressListUl}>
                {displayAddresses.map((address, index) => {
                  // Calculate absolute index for display
                  const displayIndex = searchTerm
                    ? index + 1
                    : startIndex + index;

                  // Format display index with K for thousands
                  const formattedIndex =
                    displayIndex >= 1000
                      ? formatDisplayNumber(displayIndex)
                      : displayIndex;

                  return (
                    <li key={index} className={styles.addressItem}>
                      <div className={styles.addressLeft}>
                        <span className={styles.addressNumber}>
                          {formattedIndex}.
                        </span>
                        <span
                          className={styles.addressText}
                          title={address}
                          data-address={address}
                        >
                          {address}
                        </span>
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
                  );
                })}
              </ul>

              {searchTerm && searchResults.length > 0 && (
                <div className={styles.statusText}>
                  <p>Found {searchResults.length} matching addresses</p>
                  <p className="mt-1">
                    <button
                      className={styles.clearSearchBtn}
                      onClick={clearSearch}
                    >
                      Clear search and return to page view
                    </button>
                  </p>
                </div>
              )}

              {!searchTerm && totalAddressCount > internalAddresses.length && (
                <div className={styles.statusText}>
                  <p>
                    Showing addresses {formatDisplayNumber(startIndex)}-
                    {formatDisplayNumber(endIndex)} of{" "}
                    {formatDisplayNumber(totalAddressCount)}
                  </p>
                  <p className="mt-1">
                    Pages will automatically rotate every 60 seconds
                  </p>
                </div>
              )}
            </>
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
                  <p className="mt-2">
                    <button
                      className={styles.clearSearchBtn}
                      onClick={clearSearch}
                    >
                      Clear search
                    </button>
                  </p>
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
                    <rect
                      x="3"
                      y="3"
                      width="18"
                      height="18"
                      rx="2"
                      ry="2"
                    ></rect>
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
    </div>
  );
}
