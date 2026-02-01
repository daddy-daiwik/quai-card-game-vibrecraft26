/**
 * @type import('hardhat/config').HardhatUserConfig
 */

require('@nomicfoundation/hardhat-toolbox')
require('dotenv').config()

module.exports = {
  defaultNetwork: 'cyprus1',
  networks: {
    cyprus1: {
      url: `${process.env.RPC_URL}/cyprus1`,
      accounts: [process.env.CYPRUS1_PK],
      chainId: Number(process.env.CHAIN_ID),
    },
  },

  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
      evmVersion: 'london',
    },
  },

  paths: {
    sources: './contracts',
    cache: './cache',
    artifacts: './artifacts',
  },
  mocha: {
    timeout: 20000,
  },
}
