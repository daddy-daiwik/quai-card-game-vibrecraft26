const quais = require('quais')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

async function deployCardGame() {
  console.log('\n🚀 Deploying CardGame to QUAI Orchard Testnet (cyprus1)...\n')
  
  // Try using the BASE URL with usePathing: true
  const BASE_RPC_URL = 'https://orchard.rpc.quai.network'
  const PRIVATE_KEY = process.env.CYPRUS1_PK
  const DUMMY_IPFS_HASH = "QmPZ9gcCEpqKTo6aq61g2nXGXhXhy9T79sDkAxXv71f111"
  
  console.log('Configuration:')
  console.log('   Base RPC URL:', BASE_RPC_URL)
  
  if (!PRIVATE_KEY) {
    console.error('❌ Error: CYPRUS1_PK not set in .env')
    process.exit(1)
  }
  
  // Load compiled contract artifact
  const artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'CardGame.sol', 'CardGame.json')
  const CardGameJson = JSON.parse(fs.readFileSync(artifactPath, 'utf8'))
  console.log('✅ Contract artifact loaded')
  
  try {
    console.log('📡 Creating provider...')
    // usePathing: true means the provider will handle zone routing
    const provider = new quais.JsonRpcProvider(BASE_RPC_URL, undefined, { usePathing: true })
    
    console.log('📡 Creating wallet...')
    const wallet = new quais.Wallet(PRIVATE_KEY, provider)
    console.log('   Wallet address:', wallet.address)
    
    console.log('📦 Creating ContractFactory...')
    const CardGame = new quais.ContractFactory(CardGameJson.abi, CardGameJson.bytecode, wallet, DUMMY_IPFS_HASH)

    console.log('📦 Deploying contract...')
    
    // Manual gas overrides
    const overrides = {
        gasLimit: 5000000
    }
    
    const cardGame = await CardGame.deploy(overrides)
    
    const deployTx = cardGame.deploymentTransaction()
    console.log('✅ Transaction broadcasted!')
    console.log('   Hash:', deployTx?.hash)

    console.log('⏳ Waiting for confirmation...')
    const receipt = await cardGame.waitForDeployment()
    
    const contractAddress = await cardGame.getAddress()
    
    console.log('\n' + '='.repeat(60))
    console.log('🚀 CardGame deployed successfully!')
    console.log('='.repeat(60))
    console.log('Contract Address:', contractAddress)
    console.log('Explorer: https://quaiscan.io/address/' + contractAddress)
    console.log('='.repeat(60))
    
    // Save deployment info
    const deploymentInfo = {
      contractName: 'CardGame',
      address: contractAddress,
      network: 'quai-orchard-testnet',
      zone: 'cyprus1',
      deployedAt: new Date().toISOString(),
      transactionHash: deployTx?.hash,
      ipfsHash: DUMMY_IPFS_HASH
    }
    
    fs.writeFileSync(path.join(__dirname, '..', 'deployment.json'), JSON.stringify(deploymentInfo, null, 2))
    console.log('\n📝 Deployment info saved to deployment.json')
    
  } catch (error) {
    console.error('\n❌ Deployment failed!')
    console.error('Error:', error.message)
    if (error.code) console.error('Code:', error.code)
    process.exit(1)
  }
}

deployCardGame()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Uncaught error:', error)
    process.exit(1)
  })
