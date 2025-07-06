import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Verifying Zircuit Testnet Deployment");
  console.log("=======================================");

  const [deployer] = await ethers.getSigners();
  console.log("Verifying with account:", deployer.address);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);

  // Contract addresses from deployment
  const addresses = {
    factory: "0x6E52943b3Be391f7245f5f3c8F8A16238aEC8F3B",
    amm: "0xa59F5257cFf701aEc174425dBcEa1Ce4C94704EE", 
    oracle: "0xdb38b00cb3052ED861C2782787700539d08F8F99",
    automation: "0x20D527BB5a9601bBd8750567a020dcdC6c7D8b0b",
  };

  console.log("\n📋 Checking Contract Deployment...");

  for (const [name, address] of Object.entries(addresses)) {
    try {
      const code = await ethers.provider.getCode(address);
      const hasCode = code !== "0x";
      
      console.log(`${name.toUpperCase()}:`);
      console.log(`   Address: ${address}`);
      console.log(`   Has Code: ${hasCode ? '✅ YES' : '❌ NO'}`);
      console.log(`   Code Length: ${code.length - 2} bytes`);
      
      if (hasCode) {
        console.log(`   Explorer: https://explorer.zircuit.com/address/${address}`);
      }
      console.log("");
      
    } catch (error: any) {
      console.log(`❌ ${name.toUpperCase()}: Error checking - ${error.message}`);
    }
  }

  // Test contract interactions
  console.log("🧪 Testing Contract Interactions...");
  
  try {
    const factory = await ethers.getContractAt("RWATokenFactory", addresses.factory);
    
    // Test basic read functions
    const owner = await factory.owner();
    console.log(`✅ Factory Owner: ${owner}`);
    
    const isRegistered = await factory.isPlatformRegistered("splint_invest");
    console.log(`✅ Splint Invest Platform Registered: ${isRegistered}`);
    
  } catch (error: any) {
    console.log(`❌ Contract interaction failed: ${error.message}`);
  }

  // Check account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`\n💰 Account Balance: ${ethers.formatEther(balance)} ETH`);

  // Get recent transactions
  console.log("\n📊 Recent Deployment Transactions:");
  try {
    const currentBlock = await ethers.provider.getBlockNumber();
    console.log(`Current Block: ${currentBlock}`);
    
    // Check last few blocks for our transactions
    for (let i = 0; i < 10; i++) {
      const block = await ethers.provider.getBlock(currentBlock - i, true);
      if (block && block.transactions) {
        const ourTxs = block.transactions.filter(tx => 
          typeof tx === 'object' && tx.from === deployer.address
        );
        
        if (ourTxs.length > 0) {
          console.log(`Block ${block.number}: ${ourTxs.length} transactions from our account`);
          ourTxs.forEach((tx: any, index: number) => {
            console.log(`   TX ${index + 1}: ${tx.hash}`);
            console.log(`   To: ${tx.to || 'Contract Creation'}`);
            console.log(`   Value: ${ethers.formatEther(tx.value)} ETH`);
          });
        }
      }
    }
  } catch (error: any) {
    console.log(`❌ Error fetching transaction history: ${error.message}`);
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Verification failed:", error);
      process.exit(1);
    });
}