# 🧪 Open Brew — DEX Analytics for TEA Protocol

Open Brew is a decentralized analytics and staking platform built on top of [TEA Protocol](https://www.tea.xyz/). This project aims to provide contributors and users with a clean dashboard to track packages, stake tokens, monitor transactions, and view KYC-verified addresses.

## 🚀 Features

- 📊 Dashboard for package analytics
- 📦 Package Staking System
- 💳 Transaction Tracker
- 🔍 KYC Address Viewer
- 🛠️ Built using Next.js + TailwindCSS

## 🌐 Live Preview

Check it out here: [https://open-brew.vercel.app](https://open-brew.vercel.app)

![Open Brew Live Dashboard](app/assets/Dex.png)

## 📞 Contact

- Telegram: [https://t.me/madsrepo](https://t.me/madsrepo)

## 📁 Folder Structure
```plaintext
open-brew/
├── app/                # Next.js app directory
│   ├── images/         # Contains dashboard images 
│   └── assets/         # Contains other assets
├── components/         # Reusable React components
├── lib/                # API and utility functions
├── pages/              # Route-based components (legacy)
├── public/             # Static files
├── styles/             # Tailwind & global CSS
├── .env.example        # Environment variables template
├── tailwind.config.js  # TailwindCSS configuration
└── README.md