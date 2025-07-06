import { ethers } from "hardhat";
import { LuxBridgeSDK } from "../index";
import { loadContractAddresses } from "../test-environment/setup-local-chain";

async function focusedOracleTest() {
  console.log("🎯 Focused Oracle Test");

  const contracts = loadContractAddresses();
  if (!contracts) {
    console.error("❌ No contract addresses found");
    return;
  }

  const sdk = new LuxBridgeSDK({
    network: "localhost",
    provider: ethers.provider,
    privateKey:
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    contracts: contracts,
  });

  console.log("📋 Testing exact same data flow as comprehensive test...");

  // Step 1: Use SDK to set the price (exactly like the comprehensive test)
  console.log("1️⃣ Setting price via SDK mockPriceUpdate...");
  try {
    const result1 = await sdk.mockPriceUpdate({
      platform: "splint_invest",
      assetId: "BORDEAUX-2019",
      price: "100000",
    });
    console.log(`✅ SDK price set: ${result1.transactionHash}`);
  } catch (error: any) {
    console.log(`❌ SDK price set failed: ${error.message}`);
    return;
  }

  // Step 2: Use SDK to read the price (exactly like the comprehensive test)
  console.log("2️⃣ Reading price via SDK getPrice...");
  try {
    const result2 = await sdk.getPrice({
      platform: "splint_invest",
      assetId: "BORDEAUX-2019",
    });
    console.log(`✅ SDK price read: $${result2.price} at ${result2.timestamp}`);
  } catch (error: any) {
    console.log(`❌ SDK price read failed: ${error.message}`);

    // Try direct oracle call to see if that works
    console.log("3️⃣ Trying direct oracle call...");
    try {
      const [price, timestamp] = await sdk.oracle.getPrice(
        "splint_invest",
        "BORDEAUX-2019",
      );
      console.log(
        `✅ Direct oracle call: ${ethers.formatEther(price)} at ${timestamp}`,
      );
    } catch (directError: any) {
      console.log(`❌ Direct oracle call also failed: ${directError.message}`);
    }
  }

  // Step 3: Try arbitrage calculation
  console.log("4️⃣ Testing arbitrage calculation...");
  try {
    // Set a second price
    await sdk.mockPriceUpdate({
      platform: "masterworks",
      assetId: "BORDEAUX-2019",
      price: "105000",
    });

    const spread = await sdk.calculateArbitrageSpread({
      assetId: "BORDEAUX-2019",
      platformA: "splint_invest",
      platformB: "masterworks",
    });
    console.log(
      `✅ Arbitrage spread: ${spread.spread} basis points (${spread.spreadPercentage}%)`,
    );
  } catch (error: any) {
    console.log(`❌ Arbitrage calculation failed: ${error.message}`);
  }

  // Step 4: Check what data is actually stored
  console.log("5️⃣ Debugging stored data...");
  try {
    const oracleContract = sdk.oracle;
    console.log(
      `Oracle contract address: ${await oracleContract.getAddress()}`,
    );

    // Try to read the platformAssets mapping directly
    const assetData = await oracleContract.platformAssets(
      "splint_invest",
      "BORDEAUX-2019",
    );
    console.log("Platform asset data:", {
      platform: assetData.platform,
      assetId: assetData.assetId,
      lastPrice: assetData.lastPrice.toString(),
      lastUpdate: assetData.lastUpdate.toString(),
    });
  } catch (error: any) {
    console.log(`❌ Debug storage failed: ${error.message}`);
  }
}

focusedOracleTest().catch(console.error);
