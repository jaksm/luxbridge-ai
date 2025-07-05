#!/usr/bin/env node
/**
 * LuxBridge Deployment Verification Script
 * 
 * Run this after deployment to verify all contracts are working correctly
 * Usage: node scripts/verify-deployment.js <network>
 * Example: node scripts/verify-deployment.js zircuit
 */

const { ethers } = require('hardhat');

async function main() {
  const network = process.argv[2] || 'localhost';
  console.log(`🔍 Verifying LuxBridge deployment on ${network}...`);
  console.log('='.repeat(50));

  const [deployer] = await ethers.getSigners();
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH\n`);

  // You'll need to update these addresses after deployment
  const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS || '';
  const AMM_ADDRESS = process.env.AMM_ADDRESS || '';
  const ORACLE_ADDRESS = process.env.ORACLE_ADDRESS || '';
  const AUTOMATION_ADDRESS = process.env.AUTOMATION_ADDRESS || '';

  if (!FACTORY_ADDRESS) {
    console.log('❌ Missing contract addresses. Please set environment variables:');
    console.log('   FACTORY_ADDRESS=0x...');
    console.log('   AMM_ADDRESS=0x...');
    console.log('   ORACLE_ADDRESS=0x...');
    console.log('   AUTOMATION_ADDRESS=0x...');
    console.log('\\nOr run deployment first: npm run blockchain:deploy');
    return;
  }

  try {
    // Verify Factory
    console.log('🏭 Verifying RWATokenFactory...');
    const factory = await ethers.getContractAt('RWATokenFactory', FACTORY_ADDRESS);
    const totalAssets = await factory.getTotalAssets();
    console.log(`   ✅ Total assets: ${totalAssets}`);
    
    // Check demo assets
    const platforms = ['splint_invest', 'masterworks', 'realt'];
    const assetIds = ['BORDEAUX-2019', 'PICASSO-042', 'DETROIT-HOUSE-001'];
    
    for (let i = 0; i < platforms.length; i++) {
      try {
        const tokenAddress = await factory.getTokenAddress(platforms[i], assetIds[i]);
        console.log(`   ✅ ${platforms[i]}/${assetIds[i]}: ${tokenAddress}`);
      } catch (e) {
        console.log(`   ❌ ${platforms[i]}/${assetIds[i]}: Not found`);
      }
    }

    // Verify AMM
    console.log('\\n🌊 Verifying LuxBridgeAMM...');
    const amm = await ethers.getContractAt('LuxBridgeAMM', AMM_ADDRESS);
    
    // Check pool creation
    const wineToken = await factory.getTokenAddress('splint_invest', 'BORDEAUX-2019');
    const artToken = await factory.getTokenAddress('masterworks', 'PICASSO-042');
    
    try {
      const poolId = await amm.getPoolId(wineToken, artToken);
      console.log(`   ✅ Wine-Art pool: ${poolId}`);
      
      const poolInfo = await amm.getPool(poolId);
      console.log(`   ✅ Pool reserves: ${ethers.formatEther(poolInfo.reserveA)} / ${ethers.formatEther(poolInfo.reserveB)}`);
    } catch (e) {
      console.log(`   ❌ Wine-Art pool: Not found`);
    }

    // Verify Oracle
    console.log('\\n🔮 Verifying LuxBridgePriceOracle...');
    const oracle = await ethers.getContractAt('LuxBridgePriceOracle', ORACLE_ADDRESS);
    
    try {
      const [price, timestamp] = await oracle.getPrice('splint_invest', 'BORDEAUX-2019');
      console.log(`   ✅ Wine price: ${ethers.formatEther(price)} ETH (updated: ${new Date(Number(timestamp) * 1000).toLocaleString()})`);
    } catch (e) {
      console.log(`   ❌ Wine price: Not available`);
    }

    // Verify Automation
    console.log('\\n🤖 Verifying LuxBridgeAutomation...');
    const automation = await ethers.getContractAt('LuxBridgeAutomation', AUTOMATION_ADDRESS);
    
    try {
      const ammAddress = await automation.ammContract();
      const factoryAddress = await automation.factoryContract();
      console.log(`   ✅ Connected to AMM: ${ammAddress}`);
      console.log(`   ✅ Connected to Factory: ${factoryAddress}`);
    } catch (e) {
      console.log(`   ❌ Automation contract: Error reading state`);
    }

    console.log('\\n🎉 Deployment verification complete!');
    console.log('\\n📋 Next steps:');
    console.log('   1. Update MCP server with contract addresses');
    console.log('   2. Test cross-platform swaps');
    console.log('   3. Verify contracts on block explorer (optional)');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;