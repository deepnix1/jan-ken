# JaN KeN! - Rock Paper Scissors on Base Network

A decentralized Rock Paper Scissors game built on Base Network (Base Sepolia testnet) with Farcaster Mini App integration.

## 🎮 Features

- **Onchain Gameplay**: All game logic and payments handled by smart contracts
- **Farcaster Integration**: Native Farcaster Mini App with wallet integration
- **Real-time Matchmaking**: Automatic player matching based on bet amount
- **Dynamic Bet Levels**: ETH amounts automatically adjust based on current ETH price ($5, $10, $50, $100, $500, $1000)
- **Tax System**: 5% tax collected from each player, sent to contract owner
- **Mobile Responsive**: Fully optimized for mobile devices
- **Gaming UI**: Modern, gaming-themed interface with animations

## 🚀 Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Blockchain**: Base Sepolia (Ethereum L2)
- **Smart Contracts**: Solidity, Hardhat
- **Wallet**: Wagmi, Farcaster Mini App SDK
- **Styling**: Tailwind CSS v4

## 📁 Project Structure

```
jan-ken/
├── contracts/          # Smart contracts
│   ├── src/           # Solidity source files
│   ├── scripts/       # Deployment scripts
│   └── test/          # Contract tests
├── jan-ken-app1/      # Frontend application
│   ├── app/           # Next.js app directory
│   ├── components/    # React components
│   ├── lib/           # Utilities and configs
│   └── public/        # Static assets
└── README.md
```

## 🛠️ Setup

### Prerequisites

- Node.js 22.11.0 or higher
- npm, pnpm, or yarn
- MetaMask or Farcaster wallet
- Base Sepolia testnet ETH

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd jan-ken
```

2. Install contract dependencies:
```bash
cd contracts
npm install
```

3. Install frontend dependencies:
```bash
cd ../jan-ken-app1
npm install
```

4. Set up environment variables:
```bash
# Copy env.example and fill in your values
cp contracts/env.example contracts/.env
```

5. Deploy the smart contract (see contracts/README.md for details)

6. Update contract address in `jan-ken-app1/lib/contract.ts`

7. Start the frontend:
```bash
cd jan-ken-app1
npm run dev
```

## 🎯 How to Play

1. Connect your wallet (Farcaster Mini App or MetaMask)
2. Select a bet amount ($5, $10, $50, $100, $500, or $1000)
3. Wait for matchmaking (another player with same bet amount)
4. Make your choice (Rock, Paper, or Scissors) within 20 seconds
5. Winner takes all (minus 5% tax)

## 📝 Smart Contract

The game logic is implemented in `contracts/src/RockPaperScissors.sol`:

- **joinQueue**: Join matchmaking queue with bet amount
- **makeChoice**: Submit your choice (1=Rock, 2=Paper, 3=Scissors)
- **getMyGame**: Get current game status
- **Tax System**: 5% tax collected from each player

## 🔒 Security

- All game logic is onchain and verifiable
- Smart contract handles all payments
- No central server required
- Tax sent directly to contract owner

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📧 Contact

For questions or support, please open an issue on GitHub.
