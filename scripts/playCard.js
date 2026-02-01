const quais = require('quais')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

async function playCard() {
    const args = process.argv.slice(2)
    const cardIndex = args[0] ? parseInt(args[0]) : 0
    const usePlayer2 = args.includes('--player2') || args.includes('-p2')

    const deploymentPath = path.join(__dirname, '..', 'deployment.json')
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))

    const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'CardGame.sol', 'CardGame.json')
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'))

    const BASE_RPC_URL = 'https://orchard.rpc.quai.network'
    const provider = new quais.JsonRpcProvider(BASE_RPC_URL, undefined, { usePathing: true })

    // Select wallet based on flag
    let pk = process.env.CYPRUS1_PK
    if (usePlayer2) {
        pk = process.env.CYPRUS2_PK || process.env.CYPRUS1_PK_2 || process.env.PLAYER2_PK
        if (!pk) {
            console.error("❌ Error: Player 2 private key not found in .env (CYPRUS2_PK or CYPRUS1_PK_2)")
            process.exit(1)
        }
    }

    const wallet = new quais.Wallet(pk, provider)
    const contract = new quais.Contract(deployment.address, artifact.abi, wallet)

    try {
        console.log(`\n🃏 ${usePlayer2 ? "PLAYER 2" : "PLAYER 1"} Playing Card #${cardIndex}`)
        console.log(`   Account: ${wallet.address}`)

        // Play card
        const tx = await contract.playCard(cardIndex, { gasLimit: 5000000 })
        console.log(`   Transaction sent: ${tx.hash}`)

        console.log('⏳ Waiting for confirmation...')
        const receipt = await tx.wait()

        console.log('✅ Card played successfully!')

    } catch (error) {
        console.error('\n❌ Failed to play card:', error.message)
        if (error.message.includes("Invalid card index")) console.log("   👉 You don't have a card at that index.")
        if (error.message.includes("Not your turn")) console.log("   👉 It's not your turn!")
        if (error.message.includes("Game not active")) console.log("   👉 The game hasn't started yet.")
    }
}

playCard()
