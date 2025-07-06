import { ethers } from "hardhat";
import { LuxBridgeSDK } from "../index";

async function liveDeployTest() {
  console.log("🎯 Live Deploy and Test Oracle");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Deploy fresh oracle
  const LuxBridgePriceOracle = await ethers.getContractFactory("LuxBridgePriceOracle");
  
  const MOCK_ROUTER = ethers.ZeroAddress;
  const MOCK_DON_ID = ethers.ZeroHash;
  const MOCK_SUBSCRIPTION_ID = 1;
  const GAS_LIMIT = 500000;

  console.log("1️⃣ Deploying oracle...");
  const oracle = await LuxBridgePriceOracle.deploy(
    MOCK_ROUTER,
    MOCK_DON_ID,
    MOCK_SUBSCRIPTION_ID,
    GAS_LIMIT,
  );
  
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  
  console.log(`✅ Oracle deployed to: ${oracleAddress}`);
  
  // Verify deployment
  const code = await ethers.provider.getCode(oracleAddress);
  console.log(`📋 Contract code length: ${code.length}`);
  
  if (code === "0x") {
    console.log("❌ Deployment failed - no bytecode");
    return;
  }

  // Initialize SDK with the fresh oracle address
  const sdk = new LuxBridgeSDK({
    network: "localhost",
    provider: ethers.provider,
    privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    contracts: {
      factory: "0xc0F115A19107322cFBf1cDBC7ea011C19EbDB4F8", // Use existing factory
      amm: "0x07882Ae1ecB7429a84f1D53048d35c4bB2056877", // Use existing AMM
      oracle: oracleAddress, // Use fresh oracle
      automation: "0x5bf5b11053e734690269C6B9D438F8C9d48F528A" // Use existing automation
    }
  });

  // Test the SDK workflow that was failing
  console.log("2️⃣ Testing SDK price update...");
  try {
    const result1 = await sdk.mockPriceUpdate({
      platform: "splint_invest",
      assetId: "BORDEAUX-2019",
      price: "100000"
    });
    console.log(`✅ SDK price set: ${result1.transactionHash}`);
  } catch (error: any) {
    console.log(`❌ SDK price set failed: ${error.message}`);
    return;
  }

  console.log("3️⃣ Testing SDK price read...");
  try {
    const result2 = await sdk.getPrice({
      platform: "splint_invest",
      assetId: "BORDEAUX-2019"
    });
    console.log(`✅ SDK price read: $${result2.price} at ${result2.timestamp}`);
  } catch (error: any) {
    console.log(`❌ SDK price read failed: ${error.message}`);
    return;
  }

  console.log("4️⃣ Testing arbitrage spread...");
  try {
    // Set second price
    await sdk.mockPriceUpdate({
      platform: "masterworks",
      assetId: "BORDEAUX-2019",
      price: "105000"
    });

    const spread = await sdk.calculateArbitrageSpread({
      assetId: "BORDEAUX-2019",
      platformA: "splint_invest",
      platformB: "masterworks"
    });
    console.log(`✅ Arbitrage spread: ${spread.spread} basis points (${spread.spreadPercentage}%)`);
  } catch (error: any) {
    console.log(`❌ Arbitrage calculation failed: ${error.message}`);
    return;
  }

  console.log("🎉 All tests passed! Saving working addresses...");
  
  // Update the addresses file with working oracle
  const fs = require("fs");
  const path = require("path");
  
  const addressesPath = path.join(__dirname, "..", "test-environment", "contract-addresses.json");
  const addresses = {
    factory: "0xc0F115A19107322cFBf1cDBC7ea011C19EbDB4F8",
    amm: "0x07882Ae1ecB7429a84f1D53048d35c4bB2056877",
    oracle: oracleAddress,
    automation: "0x5bf5b11053e734690269C6B9D438F8C9d48F528A"
  };
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  
  console.log(`✅ Updated oracle address to: ${oracleAddress}`);
  return oracleAddress;
}

liveDeployTest().catch(console.error);