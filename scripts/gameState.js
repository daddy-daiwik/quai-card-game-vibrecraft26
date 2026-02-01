const quais = require('quais')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

async function getGameState() {
  const deploymentPath = path.join(__dirname, '..', 'deployment.json')
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))

  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'CardGame.sol', 'CardGame.json')
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'))

  const BASE_RPC_URL = 'https://orchard.rpc.quai.network'
  const provider = new quais.JsonRpcProvider(BASE_RPC_URL, undefined, { usePathing: true })
  const wallet = new quais.Wallet(process.env.CYPRUS1_PK, provider)

  const contract = new quais.Contract(deployment.address, artifact.abi, wallet)

  console.log(`\n📊 GAME STATE REPORT`)
  console.log(`   Contract: ${deployment.address}`)
  console.log('='.repeat(40))

  try {
    const status = await contract.getGameStatus()
    
    const active = status[0]
    const currentTurn = status[1]
    const winner = status[2]
    const p1HP = status[3]
    const p2HP = status[4]
    const p1Cards = status[5]
    const p2Cards = status[6]

    const player1 = await contract.player1()
    const player2 = await contract.player2()

    console.log(`   Game Status: ${active ? '🟢 ACTIVE' : '🔴 INACTIVE'}`)
    if (winner !== '0x0000000000000000000000000000000000000000') {
        console.log(`   Winner:      ${winner === wallet.address ? '🏆 YOU' : winner}`)
    }

    console.log('\n   👤 Player 1 (HP: ' + p1HP + ')')
    console.log(`      Address: ${player1}`)
    console.log(`      Cards:   ${p1Cards}`)

    console.log('\n   👤 Player 2 (HP: ' + p2HP + ')')
    console.log(`      Address: ${player2}`)
    console.log(`      Cards:   ${p2Cards}`)

    if (active) {
        console.log('\n   👉 Current Turn: ' + (currentTurn === wallet.address ? 'YOUR TURN ✅' : 'Opponent Turn ⏳'))
    } else {
        if (!active && p1HP > 0 && p2HP > 0) {
             console.log('\n   ℹ️  Waiting for Player 2 to join...')
        }
    }

    if (wallet.address === player1 || wallet.address === player2) {
        console.log('\n🎴 YOUR DECK:')
        const myDeckIds = await contract.getPlayerDeck(wallet.address)
        
        if (myDeckIds.length === 0) {
            console.log('   (Empty)')
        } else {
            console.log(`   Index | Card ID | Stats`)
            console.log(`   ----- | ------- | -----`)
            for (let i = 0; i < myDeckIds.length; i++) {
                const id = myDeckIds[i]
                const card = await contract.cards(id)
                console.log(`     ${i}   |    ${id}    | ⚔️ ${card.attack} / ❤️ ${card.health}`)
            }
        }
    }

  } catch (error) {
    console.error('❌ Error fetching state:', error.message)
  }
}

getGameState()
