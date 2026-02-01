const quais = require('quais')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

async function joinGame() {
    const deploymentPath = path.join(__dirname, '..', 'deployment.json')
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))

    const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'CardGame.sol', 'CardGame.json')
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'))

    const BASE_RPC_URL = 'https://orchard.rpc.quai.network'
    const provider = new quais.JsonRpcProvider(BASE_RPC_URL, undefined, { usePathing: true })

    // Load Player 2 Private Key
    // Try common names if one isn't found
    const pk = process.env.CYPRUS2_PK || process.env.CYPRUS1_PK_2 || process.env.PLAYER2_PK

    if (!pk) {
        console.error('❌ Error: Could not find player 2 key in .env')
        console.error('   Please add CYPRUS1_PK_2=... to your .env file')
        process.exit(1)
    }

    const wallet = new quais.Wallet(pk, provider)

    console.log(`\n🎮 Connecting to Game at: ${deployment.address}`)
    console.log(`   Player 2: ${wallet.address}`)

    const contract = new quais.Contract(deployment.address, artifact.abi, wallet)

    try {
        console.log('👉 Attempting to join game...')

        // Check if user is already in game (skipping if read fails to avoid hangs)
        try {
            const p2 = await contract.player2()
            if (p2 === wallet.address) {
                console.log('   ℹ️  You have already joined as Player 2')
                return
            }
        } catch (e) { }

        const tx = await contract.joinGame({ gasLimit: 5000000 })
        console.log(`   Transaction sent: ${tx.hash}`)

        console.log('⏳ Waiting for confirmation...')
        await tx.wait()

        console.log('✅ Successfully joined the game!')
        console.log('⚔️  GAME STARTED! Ready to battle.')

    } catch (error) {
        console.error('\n❌ Failed to join game:', error.message)
        if (error.data) console.error('   Reason:', error.data)
    }
}

joinGame()
