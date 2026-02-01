const quais = require('quais')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

async function joinGame() {
  const deploymentPath = path.join(__dirname, '..', 'deployment.json')
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))

  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'CardGame.sol', 'CardGame.json')
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'))

  // FIX: Use Base URL with usePathing: true
  const BASE_RPC_URL = 'https://orchard.rpc.quai.network'
  const provider = new quais.JsonRpcProvider(BASE_RPC_URL, undefined, { usePathing: true })
  const wallet = new quais.Wallet(process.env.CYPRUS1_PK, provider)

  console.log(`\n🎮 Connecting to Game at: ${deployment.address}`)
  const contract = new quais.Contract(deployment.address, artifact.abi, wallet)

  try {
    console.log('👉 Attempting to join game...')

    // Check if user is already in game
    // We wrap read in try/catch in case of timeout
    try {
      const p1 = await contract.player1()
      if (p1 === wallet.address) {
        console.log('   ℹ️  You have already joined as Player 1')
        return
      }
    } catch (e) {
      console.log('   (Skipping state check due to timeout)')
    }

    const tx = await contract.joinGame({ gasLimit: 5000000 })
    console.log(`   Transaction sent: ${tx.hash}`)

    console.log('⏳ Waiting for confirmation...')
    await tx.wait()

    console.log('✅ Successfully joined the game!')

  } catch (error) {
    console.error('\n❌ Failed to join game:', error.message)
  }
}

joinGame()
