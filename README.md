# CardGame on QUAI Network

A decentralized card game deployed on the Quai Orchard Testnet, featuring a React frontend.

## Deployment Details

- **Network:** Quai Orchard Testnet
- **Zone:** Cyprus 1 (Chain ID: 15000)
- **Contract Address:** [See `frontend/src/constants.js`]
- **Explorer:** [View on QuaiScan](https://cyprus1.colosseum.quaiscan.io)

## 🎮 How to Play (Frontend)

1.  **Start the Website**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
2.  **Open Browser**
    Go to `http://localhost:5173`
3.  **Connect Wallet**
    Use Pelagus or MetaMask configured for Quai Orchard Testnet.

## 💻 CLI Interaction

- **Join Game**: `node scripts/joinGame.js`
- **Check Status**: `node scripts/gameState.js`
- **Play Card**: `node scripts/playCard.js <index>`

## Development Notes

- **Contract**: `contracts/CardGame.sol`
- **Frontend**: Vite + React + TailwindCSS
- **Scripts**: `scripts/` folder contains deployment and interaction tools.
