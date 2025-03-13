# On-chain Commerce Demo

Try out deployed version: https://commerce-nine-alpha-48.vercel.app/ Sandbox coming soon.

Overivew: Creating a merchant account & checkout flow demo powered by bindpay api

Features

- Multi-chain Support: Accept payments on Ethereum, Base, Optimism, Arbitrum, Avalanche, and Polygon networks
- Coming Soon: Support for Solana, Linea, and Scroll networks
- Multiple Token Options: Accept various stablecoins and native tokens
- Merchant Dashboard: Create and manage merchant accounts

# Getting Started

Prerequisites
- Node.js 18+
- npm or yarn
- A web3 wallet (MetaMask, Coinbase Wallet, etc.)

# Clone the repository
git clone https://github.com/bindhunter/commerce.git
cd commerce

# Install dependencies
npm install or yarn install

# Start the development server
npm run dev or yarn dev

The application will be available at http://localhost:3000.

# Usage - stateless experience that resets with each page refresh or new visit

Creating a Test Merchant
1. Fill in the merchant details:
- Merchant Name
- Network (select from available options)
- Settlement Token
- Wallet Address
  
Click "Create Merchant" & your subpayee will be generated. https://docs.bindpay.xyz/sub-payees/create-sub-payee

2. Testing Payments
- After creating a merchant, connect your wallet
- Enter the payment amount
- Select a payment method (token and network)

Complete the payment. https://docs.bindpay.xyz/api/request-quote

# Architecture

The application is built with:
- bindpay API: Payment Orchestration API
- Next.js: React framework for the frontend
- TypeScript: Type-safe JavaScript
- Wagmi: React hooks for Ethereum
- Viem: TypeScript interface for Ethereum
- Tailwind CSS: Utility-first CSS framework
