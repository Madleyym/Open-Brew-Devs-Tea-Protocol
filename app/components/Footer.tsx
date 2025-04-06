"use client";
import React from "react";
import Link from "next/link";
import styles from "@/styles/Footer.module.css";
import { FaGithub, FaTelegram, FaTwitter } from "react-icons/fa"; // Import icons

interface FooterProps {
  showFooter: boolean;
}

const Footer: React.FC<FooterProps> = ({ showFooter }) => {
  // Menambahkan inline style untuk animasi transform
  const footerStyles = {
    transform: showFooter ? "translateY(0)" : "translateY(100%)",
  };

  return (
    <footer className={styles.footer} style={footerStyles}>
      <div className={styles.container}>
        <div className={styles.footerContent}>
          <div className={styles.copyright}>
            © {new Date().getFullYear()} OpenBrew | Companion
          </div>
          <div className={styles.links}>
            <a
              href="https://github.com/Madleyym/Open-Brew-Tea-Protocol"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
              title="GitHub"
            >
              <FaGithub className={styles.icon} />
            </a>
            <a
              href="https://t.me/zshcss"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
              title="Telegram"
            >
              <FaTelegram className={styles.icon} />
            </a>
            <a
              href="https://twitter.com/OpenBrew_xyz"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
              title="Twitter"
            >
              <FaTwitter className={styles.icon} />
            </a>
            {/* <Link href="/docs" className={styles.link}>
              Documentation
            </Link> */}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
