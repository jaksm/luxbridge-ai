import { ethers } from "hardhat";
import { LuxBridgeSDK } from "../index";
import { loadContractAddresses } from "../test-environment/setup-local-chain";

async function debugContracts() {
  console.log("🔍 Debugging Contract State...");

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

  console.log("📋 Contract Addresses:");
  console.log(`  Factory: ${contracts.factory}`);
  console.log(`  AMM: ${contracts.amm}`);
  console.log(`  Oracle: ${contracts.oracle}`);
  console.log(`  Automation: ${contracts.automation}`);

  try {
    // Test oracle state
    console.log("\n🔮 Oracle State:");
    const [price1, timestamp1] = await sdk.oracle.getPrice(
      "splint_invest",
      "BORDEAUX-2019",
    );
    console.log(
      `  splint_invest:BORDEAUX-2019 = ${ethers.formatEther(price1)} @ ${timestamp1}`,
    );
  } catch (error: any) {
    console.log(`  Oracle getPrice error: ${error.message}`);

    // Try to set a price and then read it
    console.log("  Setting a test price...");
    try {
      await sdk.oracle.mockPriceUpdate(
        "splint_invest",
        "BORDEAUX-2019",
        ethers.parseEther("100000"),
      );
      console.log("  ✅ Price set successfully");

      const [price2, timestamp2] = await sdk.oracle.getPrice(
        "splint_invest",
        "BORDEAUX-2019",
      );
      console.log(
        `  After update: ${ethers.formatEther(price2)} @ ${timestamp2}`,
      );
    } catch (err: any) {
      console.log(`  ❌ Failed to set/read price: ${err.message}`);
    }
  }

  try {
    // Test factory state
    console.log("\n🏭 Factory State:");
    const platformInfo = await sdk.factory.getPlatformInfo("splint_invest");
    console.log(`  splint_invest platform:`, {
      name: platformInfo.name,
      isActive: platformInfo.isActive,
      totalAssets: platformInfo.totalAssetsTokenized.toString(),
    });
  } catch (error: any) {
    console.log(`  Factory getPlatformInfo error: ${error.message}`);
  }

  try {
    // Test automation state
    console.log("\n🤖 Automation State:");
    const signerAddress = await sdk.signer!.getAddress();
    console.log(`  Signer address: ${signerAddress}`);

    // Check if we have trading permissions
    const permissions = await sdk.automation.tradingPermissions(signerAddress);
    console.log(`  Trading permissions:`, {
      maxTradeSize: permissions.maxTradeSize.toString(),
      dailyLimit: permissions.dailyLimit.toString(),
      isActive: permissions.isActive,
    });
  } catch (error: any) {
    console.log(`  Automation state error: ${error.message}`);
  }
}

debugContracts().catch(console.error);
