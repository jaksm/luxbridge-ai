#!/usr/bin/env tsx

// Simple debug script to test tokenization
import { LuxBridgeSDK } from "./index";
import { loadContractAddresses } from "./test-environment/setup-local-chain";

async function main() {
  console.log("🔍 Debug tokenization test...");
  
  // Load contract addresses
  const contracts = loadContractAddresses();
  if (!contracts) {
    console.error("❌ No contract addresses found. Run setup first.");
    process.exit(1);
  }
  
  console.log("📄 Contract addresses:", contracts);
  
  // Initialize SDK
  const sdk = new LuxBridgeSDK({
    network: "localhost",
    privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // Hardhat account #0
    contracts: {
      factory: contracts.factory,
      amm: contracts.amm,
      oracle: contracts.oracle,
      automation: contracts.automation,
    },
  });
  
  console.log("🔧 SDK initialized");
  
  try {
    // Test tokenization with minimal data
    console.log("🪙 Testing tokenization...");
    const result = await sdk.tokenizeAsset({
      platform: "splint_invest",
      assetId: "DEBUG-001",
      totalSupply: "100",  // smaller values
      assetType: "wine",
      subcategory: "bordeaux",
      legalHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
      valuation: "1000",   // smaller values
      sharePrice: "10",    // smaller values
      currency: "USD",
    });
    
    console.log("✅ Tokenization successful!");
    console.log("📤 Result:", result);
    
  } catch (error) {
    console.error("❌ Tokenization failed:", error);
  }
}

main().catch(console.error);