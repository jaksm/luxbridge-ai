#!/usr/bin/env tsx

// Compare SDK vs direct contract calls
import { ethers } from "hardhat";
import { LuxBridgeSDK } from "./index";

async function main() {
  console.log("🔍 Comparing SDK vs Direct calls...");
  
  // Get signers
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  // Deploy contract fresh
  const RWATokenFactory = await ethers.getContractFactory("RWATokenFactory");
  const factory = await RWATokenFactory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  
  console.log("Factory deployed at:", factoryAddress);
  
  // Register platform
  await factory.registerPlatform("splint_invest", "https://mock-api.luxbridge.ai/splint");
  console.log("Platform registered");
  
  // Test parameters
  const testParams = {
    platform: "splint_invest",
    assetId: "DEBUG-001",
    totalSupply: "100",
    assetType: "wine",
    subcategory: "bordeaux",
    legalHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
    valuation: "1000",
    sharePrice: "10",
    currency: "USD"
  };
  
  console.log("Test parameters:", testParams);
  
  // Test 1: Direct contract call (should work)
  try {
    console.log("\n1️⃣ Testing direct contract call...");
    
    const directTx = await factory.tokenizeAsset(
      testParams.platform,
      testParams.assetId + "-DIRECT",
      ethers.parseEther(testParams.totalSupply),
      testParams.assetType,
      testParams.subcategory,
      testParams.legalHash,
      BigInt(testParams.valuation),
      BigInt(testParams.sharePrice),
      testParams.currency
    );
    
    console.log("✅ Direct call succeeded:", directTx.hash);
    await directTx.wait();
    console.log("✅ Direct call confirmed");
    
  } catch (error) {
    console.error("❌ Direct call failed:", error);
  }
  
  // Test 2: Manual call with same format as SDK
  try {
    console.log("\n2️⃣ Testing manual call with SDK format...");
    
    // Create factory connection with the SDK signer
    const wallet = new ethers.Wallet("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", ethers.provider);
    const factoryWithWallet = factory.connect(wallet);
    
    const manualTx = await factoryWithWallet.tokenizeAsset(
      testParams.platform,
      testParams.assetId + "-MANUAL",
      ethers.parseEther(testParams.totalSupply), // Same as SDK
      testParams.assetType,
      testParams.subcategory,
      testParams.legalHash,
      BigInt(testParams.valuation), // Same as SDK
      BigInt(testParams.sharePrice), // Same as SDK
      testParams.currency
    );
    
    console.log("✅ Manual call with SDK format succeeded:", manualTx.hash);
    await manualTx.wait();
    console.log("✅ Manual call confirmed");
    
  } catch (error) {
    console.error("❌ Manual call failed:", error);
  }
  
  // Test 3: SDK call (currently failing)
  try {
    console.log("\n3️⃣ Testing SDK call...");
    
    const sdk = new LuxBridgeSDK({
      network: "localhost",
      privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      contracts: {
        factory: factoryAddress,
        amm: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
        oracle: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
        automation: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
      },
    });
    
    console.log("SDK contract addresses:", sdk.getContractAddresses());
    
    const sdkResult = await sdk.tokenizeAsset({
      ...testParams,
      assetId: testParams.assetId + "-SDK"
    });
    
    console.log("✅ SDK call succeeded:", sdkResult.transactionHash);
    
  } catch (error: any) {
    console.error("❌ SDK call failed:", error.message);
  }
  
  // Test 4: SDK call but with hardhat provider
  try {
    console.log("\n4️⃣ Testing SDK call with hardhat provider...");
    
    const sdkWithProvider = new LuxBridgeSDK({
      network: "localhost",
      provider: ethers.provider, // Use hardhat provider
      privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      contracts: {
        factory: factoryAddress,
        amm: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
        oracle: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
        automation: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
      },
    });
    
    const sdkResult2 = await sdkWithProvider.tokenizeAsset({
      ...testParams,
      assetId: testParams.assetId + "-SDK2"
    });
    
    console.log("✅ SDK with hardhat provider succeeded:", sdkResult2.transactionHash);
    
  } catch (error: any) {
    console.error("❌ SDK with hardhat provider failed:", error.message);
  }
}

main().catch(console.error);