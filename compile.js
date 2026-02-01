const solc = require('solc');
const fs = require('fs');
const path = require('path');

// Read the contract
const contractPath = path.join(__dirname, 'contracts', 'CardGame.sol');
const source = fs.readFileSync(contractPath, 'utf8');

// Prepare input for solc
const input = {
    language: 'Solidity',
    sources: {
        'CardGame.sol': {
            content: source
        }
    },
    settings: {
        outputSelection: {
            '*': {
                '*': ['*']
            }
        },
        optimizer: {
            enabled: true,
            runs: 200
        }
    }
};

console.log('Compiling CardGame.sol...');

// Compile
const output = JSON.parse(solc.compile(JSON.stringify(input)));

// Check for errors
if (output.errors) {
    output.errors.forEach(error => {
        console.log(error.formattedMessage);
    });
    
    const hasError = output.errors.some(e => e.severity === 'error');
    if (hasError) {
        console.error('Compilation failed with errors');
        process.exit(1);
    }
}

// Extract contract
const contract = output.contracts['CardGame.sol']['CardGame'];

// Create artifacts directory
const artifactsDir = path.join(__dirname, 'artifacts');
if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
}

// Save ABI and Bytecode
const artifact = {
    contractName: 'CardGame',
    abi: contract.abi,
    bytecode: contract.evm.bytecode.object
};

fs.writeFileSync(
    path.join(artifactsDir, 'CardGame.json'),
    JSON.stringify(artifact, null, 2)
);

console.log('✅ Compilation successful!');
console.log(`   ABI and bytecode saved to artifacts/CardGame.json`);
console.log(`   Bytecode size: ${contract.evm.bytecode.object.length / 2} bytes`);
