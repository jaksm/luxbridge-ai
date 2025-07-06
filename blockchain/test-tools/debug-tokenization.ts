import { ethers } from "hardhat";
import { LuxBridgeSDK } from "..";
import { setupLocalChain, type DeployedContracts } from "../test-environment/setup-local-chain";

async function debugTokenization() {
  console.log("🔍 Debugging tokenization issues...");
  
  try {
    // Setup environment
    const contracts = await setupLocalChain();
    
    // Create SDK
    const sdk = new LuxBridgeSDK({
      network: "localhost",
      privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    });

    console.log("\n📋 Contract addresses:");
    console.log(`Factory: ${contracts.factory}`);
    console.log(`AMM: ${contracts.amm}`);
    console.log(`Oracle: ${contracts.oracle}`);
    console.log(`Automation: ${contracts.automation}`);

    // Check platform registration
    console.log("\n🔍 Checking platform registrations...");
    
    const platforms = ["splint_invest", "masterworks", "realt"];
    for (const platform of platforms) {
      try {
        const info = await sdk.getPlatformInfo({ platform });
        console.log(`✅ ${platform}: ${info.name} - Active: ${info.isActive} - Assets: ${info.totalAssetsTokenized}`);
      } catch (error) {
        console.log(`❌ ${platform}: ${error instanceof Error ? error.message : 'Error'}`);
      }
    }

    // Try to call the factory contract directly
    console.log("\n🔍 Direct contract calls...");
    
    try {
      // Call the contract directly with simple parameters
      const tx = await sdk.factory.tokenizeAsset(
        "splint_invest",
        "TEST-001",
        ethers.parseEther("1000"),
        "wine",
        "bordeaux",
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        100000n,
        100n,
        "USD",
        { gasLimit: 500000 }
      );
      
      console.log("✅ Direct contract call succeeded!");
      const receipt = await tx.wait();
      console.log(`Gas used: ${receipt?.gasUsed}`);
      
    } catch (error) {
      console.log(`❌ Direct contract call failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Try to get more detailed error info
      if (error instanceof Error && error.message.includes('execution reverted')) {
        console.log("\n🔍 Trying to get revert reason...");
        try {
          // Try to estimate gas to get the actual error
          await sdk.factory.tokenizeAsset.estimateGas(
            "splint_invest",
            "TEST-001",
            ethers.parseEther("1000"),
            "wine",
            "bordeaux",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            100000n,
            100n,
            "USD"
          );
        } catch (gasError) {
          console.log(`Gas estimation error: ${gasError instanceof Error ? gasError.message : 'Unknown'}`);
        }
      }
    }

    // Check the contract state
    console.log("\n🔍 Checking contract state...");
    try {
      const owner = await sdk.factory.owner();
      console.log(`Contract owner: ${owner}`);
      
      const oracle = await sdk.factory.priceOracle();
      console.log(`Price oracle: ${oracle}`);
      
      // Check deployer address
      const [deployer] = await ethers.getSigners();
      console.log(`Deployer address: ${deployer.address}`);
      console.log(`Owner matches deployer: ${owner.toLowerCase() === deployer.address.toLowerCase()}`);
      
    } catch (error) {
      console.log(`Error checking contract state: ${error instanceof Error ? error.message : 'Unknown'}`);
    }

  } catch (error) {
    console.error("Debug failed:", error);
  }
}

debugTokenization();