import { ethers } from "hardhat";

async function deployAndTestOracle() {
  console.log("🚀 Deploy and Test Oracle");
  
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

  // Test setting price
  console.log("2️⃣ Setting test price...");
  try {
    const tx = await oracle.mockPriceUpdate(
      "splint_invest",
      "BORDEAUX-2019",
      ethers.parseEther("12000"),
    );
    await tx.wait();
    console.log(`✅ Price set successfully: ${tx.hash}`);
  } catch (error: any) {
    console.log(`❌ Failed to set price: ${error.message}`);
    return;
  }

  // Test reading price
  console.log("3️⃣ Reading price...");
  try {
    const [price, timestamp] = await oracle.getPrice("splint_invest", "BORDEAUX-2019");
    console.log(`✅ Price read successfully: ${ethers.formatEther(price)} at ${timestamp}`);
  } catch (error: any) {
    console.log(`❌ Failed to read price: ${error.message}`);
    return;
  }

  // Test arbitrage calculation
  console.log("4️⃣ Testing arbitrage calculation...");
  try {
    // Set different prices for two platforms
    await oracle.mockPriceUpdate("masterworks", "BORDEAUX-2019", ethers.parseEther("13000"));
    
    const spread = await oracle.calculateArbitrageSpread(
      "BORDEAUX-2019",
      "splint_invest", 
      "masterworks"
    );
    console.log(`✅ Arbitrage spread: ${spread} basis points`);
  } catch (error: any) {
    console.log(`❌ Failed to calculate arbitrage: ${error.message}`);
  }

  // Save working address
  console.log("5️⃣ Saving working oracle address...");
  const fs = require("fs");
  const path = require("path");
  
  const addressesPath = path.join(__dirname, "..", "test-environment", "contract-addresses.json");
  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
  addresses.oracle = oracleAddress;
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  
  console.log(`✅ Updated oracle address to: ${oracleAddress}`);
  console.log("🎉 Oracle deployment and testing complete!");
}

deployAndTestOracle().catch(console.error);