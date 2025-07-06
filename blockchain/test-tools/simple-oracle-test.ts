import { ethers } from "hardhat";
import { LuxBridgeSDK } from "../index";
import { loadContractAddresses } from "../test-environment/setup-local-chain";

async function simpleOracleTest() {
  console.log("🔮 Simple Oracle Test");

  const contracts = loadContractAddresses();
  if (!contracts) {
    console.error("❌ No contract addresses found");
    return;
  }

  console.log("📋 Loaded contract addresses:", contracts);

  const sdk = new LuxBridgeSDK({
    network: "localhost",
    provider: ethers.provider,
    privateKey:
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    contracts: contracts,
  });

  // Try direct oracle contract call
  try {
    console.log("1️⃣ Testing Oracle directly...");
    const oracle = sdk.oracle;

    // First, let's see what's at the contract address
    const oracleAddress = await oracle.getAddress();
    console.log(`Oracle address: ${oracleAddress}`);

    const code = await ethers.provider.getCode(oracleAddress);
    console.log(`Oracle contract code length: ${code.length}`);

    // Also check the fresh deployed address directly
    const freshCode = await ethers.provider.getCode(
      "0xffa7CA1AEEEbBc30C874d32C7e22F052BbEa0429",
    );
    console.log(`Fresh oracle code length: ${freshCode.length}`);

    if (code === "0x") {
      console.log("❌ No contract deployed at oracle address!");
      return;
    }

    // Try to call the contract method directly
    console.log("2️⃣ Calling getPrice directly...");
    const result = await oracle.getPrice("splint_invest", "BORDEAUX-2019");
    console.log("✅ Direct call result:", result);
  } catch (error: any) {
    console.log("❌ Direct oracle call failed:", error.message);

    // Try using the SDK method
    console.log("3️⃣ Testing SDK getPrice method...");
    try {
      const sdkResult = await sdk.getPrice({
        platform: "splint_invest",
        assetId: "BORDEAUX-2019",
      });
      console.log("✅ SDK call result:", sdkResult);
    } catch (sdkError: any) {
      console.log("❌ SDK call also failed:", sdkError.message);
    }
  }

  // Try setting and then reading a price
  console.log("4️⃣ Testing price setting and reading...");
  try {
    console.log("Setting price via mockPriceUpdate...");
    await sdk.oracle.mockPriceUpdate(
      "test_platform",
      "TEST-001",
      ethers.parseEther("99999"),
    );
    console.log("✅ Price set successfully");

    const readResult = await sdk.oracle.getPrice("test_platform", "TEST-001");
    console.log("✅ Read back result:", readResult);
  } catch (error: any) {
    console.log("❌ Price setting/reading failed:", error.message);
  }
}

simpleOracleTest().catch(console.error);
