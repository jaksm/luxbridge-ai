import { ethers } from "hardhat";
import { LuxBridgeSDK } from "../index";
import { SimpleToolTestResult } from "./simple-tool-test";

async function runFinalComprehensiveTest() {
  const results: SimpleToolTestResult[] = [];

  console.log("🚀 Final Comprehensive LuxBridge Testing");
  console.log("==========================================");
  console.log(
    "Oracle, Automation & Platform Management with Fresh Deployments",
  );
  console.log("");

  // Deploy all contracts fresh to ensure they work
  console.log("🏗️ Deploying fresh contracts...");

  const [deployer] = await ethers.getSigners();

  // Deploy Factory
  const RWATokenFactory = await ethers.getContractFactory("RWATokenFactory");
  const factory = await RWATokenFactory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log(`✅ Factory: ${factoryAddress}`);

  // Register platforms
  await factory.registerPlatform(
    "splint_invest",
    "https://api.splint-invest.com",
  );
  await factory.registerPlatform("masterworks", "https://api.masterworks.io");
  await factory.registerPlatform("realt", "https://api.realt.co");

  // Deploy AMM
  const LuxBridgeAMM = await ethers.getContractFactory("LuxBridgeAMM");
  const amm = await LuxBridgeAMM.deploy();
  await amm.waitForDeployment();
  const ammAddress = await amm.getAddress();
  console.log(`✅ AMM: ${ammAddress}`);

  // Deploy Oracle
  const LuxBridgePriceOracle = await ethers.getContractFactory(
    "LuxBridgePriceOracle",
  );
  const oracle = await LuxBridgePriceOracle.deploy(
    ethers.ZeroAddress, // mock router
    ethers.ZeroHash, // mock donId
    1, // subscriptionId
    500000, // gasLimit
  );
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log(`✅ Oracle: ${oracleAddress}`);

  // Deploy Automation
  const LuxBridgeAutomation = await ethers.getContractFactory(
    "LuxBridgeAutomation",
  );
  const automation = await LuxBridgeAutomation.deploy(
    ammAddress,
    factoryAddress,
    deployer.address, // AI agent
  );
  await automation.waitForDeployment();
  const automationAddress = await automation.getAddress();
  console.log(`✅ Automation: ${automationAddress}`);

  // Initialize SDK
  const sdk = new LuxBridgeSDK({
    network: "localhost",
    provider: ethers.provider,
    privateKey:
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    contracts: {
      factory: factoryAddress,
      amm: ammAddress,
      oracle: oracleAddress,
      automation: automationAddress,
    },
  });

  console.log("\n📊 Phase 1: Oracle Operations Testing");
  console.log("=====================================");

  // Test 1.1: Mock Price Updates
  console.log("\n🔮 Testing Mock Price Updates...");

  const testMockPriceUpdate = async (
    platform: string,
    assetId: string,
    price: string,
  ) => {
    const startTime = Date.now();
    try {
      const result = await sdk.mockPriceUpdate({ platform, assetId, price });
      const executionTime = Date.now() - startTime;
      console.log(`✅ ${platform}:${assetId} @ $${price} (${executionTime}ms)`);
      return {
        toolName: "mock_price_update",
        success: true,
        result,
        executionTime,
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      console.log(
        `❌ ${platform}:${assetId} failed (${executionTime}ms): ${error.message}`,
      );
      return {
        toolName: "mock_price_update",
        success: false,
        error: error.message,
        executionTime,
      };
    }
  };

  results.push(
    await testMockPriceUpdate("splint_invest", "BORDEAUX-2019", "100000"),
  );
  results.push(
    await testMockPriceUpdate("masterworks", "PICASSO-042", "105000"),
  );
  results.push(await testMockPriceUpdate("realt", "DETROIT-001", "95000"));

  // Test 1.2: Price Retrieval
  console.log("\n📊 Testing Price Retrieval...");

  const testGetPrice = async (platform: string, assetId: string) => {
    const startTime = Date.now();
    try {
      const result = await sdk.getPrice({ platform, assetId });
      const executionTime = Date.now() - startTime;
      console.log(
        `✅ ${platform}:${assetId} = $${result.price} (${executionTime}ms)`,
      );
      return { toolName: "get_price", success: true, result, executionTime };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      console.log(
        `❌ ${platform}:${assetId} failed (${executionTime}ms): ${error.message}`,
      );
      return {
        toolName: "get_price",
        success: false,
        error: error.message,
        executionTime,
      };
    }
  };

  results.push(await testGetPrice("splint_invest", "BORDEAUX-2019"));
  results.push(await testGetPrice("masterworks", "PICASSO-042"));
  results.push(await testGetPrice("realt", "DETROIT-001"));

  // Test 1.3: Cross-Platform Price Requests
  console.log("\n🌐 Testing Cross-Platform Price Requests...");

  const testCrossPlatformPrices = async (
    assetId: string,
    platforms: string[],
  ) => {
    const startTime = Date.now();
    try {
      const result = await sdk.requestCrossPlatformPrices({
        assetId,
        platforms,
      });
      const executionTime = Date.now() - startTime;
      console.log(
        `✅ ${assetId} across [${platforms.join(", ")}] (${executionTime}ms)`,
      );
      return {
        toolName: "cross_platform_prices",
        success: true,
        result,
        executionTime,
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      console.log(
        `❌ ${assetId} failed (${executionTime}ms): ${error.message}`,
      );
      return {
        toolName: "cross_platform_prices",
        success: false,
        error: error.message,
        executionTime,
      };
    }
  };

  results.push(
    await testCrossPlatformPrices("LUXURY-001", [
      "splint_invest",
      "masterworks",
      "realt",
    ]),
  );

  // Test 1.4: Arbitrage Detection
  console.log("\n⚖️ Testing Arbitrage Detection...");

  const testArbitrageSpread = async (
    assetId: string,
    platformA: string,
    platformB: string,
  ) => {
    const startTime = Date.now();
    try {
      const result = await sdk.calculateArbitrageSpread({
        assetId,
        platformA,
        platformB,
      });
      const executionTime = Date.now() - startTime;
      console.log(
        `✅ ${assetId}: ${platformA} vs ${platformB} = ${result.spreadPercentage}% (${executionTime}ms)`,
      );
      return {
        toolName: "arbitrage_spread",
        success: true,
        result,
        executionTime,
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      console.log(
        `❌ ${assetId} arbitrage failed (${executionTime}ms): ${error.message}`,
      );
      return {
        toolName: "arbitrage_spread",
        success: false,
        error: error.message,
        executionTime,
      };
    }
  };

  results.push(
    await testArbitrageSpread("BORDEAUX-2019", "splint_invest", "masterworks"),
  );
  results.push(
    await testArbitrageSpread("PICASSO-042", "masterworks", "realt"),
  );

  // Phase 2: Automation Features Testing
  console.log("\n\n🤖 Phase 2: Automation Features Testing");
  console.log("========================================");

  // Test 2.1: Trading Delegation
  console.log("\n🤖 Testing Trading Delegation...");

  const testDelegateTrading = async () => {
    const startTime = Date.now();
    try {
      const result = await sdk.delegateTrading({
        maxTradeSize: "50000",
        maxDailyVolume: "200000",
        allowedAssets: ["BORDEAUX-2019", "PICASSO-042", "DETROIT-001"],
      });
      const executionTime = Date.now() - startTime;
      console.log(`✅ Trading delegation successful (${executionTime}ms)`);
      return {
        toolName: "delegate_trading",
        success: true,
        result,
        executionTime,
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      console.log(
        `❌ Trading delegation failed (${executionTime}ms): ${error.message}`,
      );
      return {
        toolName: "delegate_trading",
        success: false,
        error: error.message,
        executionTime,
      };
    }
  };

  results.push(await testDelegateTrading());

  // Test 2.2: Automated Trade Queue
  console.log("\n📋 Testing Automated Trade Queue...");

  const testQueueAutomatedTrade = async () => {
    const startTime = Date.now();
    try {
      const signerAddress = await sdk.signer!.getAddress();
      const result = await sdk.queueAutomatedTrade({
        user: signerAddress,
        sellPlatform: "splint_invest",
        sellAsset: "BORDEAUX-2019",
        buyPlatform: "masterworks",
        buyAsset: "PICASSO-042",
        amount: "1000",
        deadline: Math.floor(Date.now() / 1000) + 3600,
      });
      const executionTime = Date.now() - startTime;
      console.log(`✅ Trade queue successful (${executionTime}ms)`);
      return {
        toolName: "queue_automated_trade",
        success: true,
        result,
        executionTime,
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      console.log(
        `❌ Trade queue failed (${executionTime}ms): ${error.message}`,
      );
      return {
        toolName: "queue_automated_trade",
        success: false,
        error: error.message,
        executionTime,
      };
    }
  };

  results.push(await testQueueAutomatedTrade());

  // Phase 3: Platform Management Testing
  console.log("\n\n🏢 Phase 3: Platform Management Testing");
  console.log("========================================");

  // Test 3.1: Platform Registration
  console.log("\n🏢 Testing Platform Registration...");

  const testRegisterPlatform = async () => {
    const startTime = Date.now();
    try {
      const result = await sdk.registerPlatform({
        name: "test_platform",
        apiEndpoint: "https://api.test-platform.com",
      });
      const executionTime = Date.now() - startTime;
      console.log(`✅ Platform registration successful (${executionTime}ms)`);
      return {
        toolName: "register_platform",
        success: true,
        result,
        executionTime,
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      console.log(
        `❌ Platform registration failed (${executionTime}ms): ${error.message}`,
      );
      return {
        toolName: "register_platform",
        success: false,
        error: error.message,
        executionTime,
      };
    }
  };

  results.push(await testRegisterPlatform());

  // Test 3.2: Platform Info Retrieval
  console.log("\n📋 Testing Platform Info Retrieval...");

  const testGetPlatformInfo = async (platform: string) => {
    const startTime = Date.now();
    try {
      const result = await sdk.getPlatformInfo({ platform });
      const executionTime = Date.now() - startTime;
      console.log(
        `✅ ${platform}: ${result.name}, Active: ${result.isActive} (${executionTime}ms)`,
      );
      return {
        toolName: "get_platform_info",
        success: true,
        result,
        executionTime,
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      console.log(
        `❌ ${platform} info failed (${executionTime}ms): ${error.message}`,
      );
      return {
        toolName: "get_platform_info",
        success: false,
        error: error.message,
        executionTime,
      };
    }
  };

  results.push(await testGetPlatformInfo("splint_invest"));
  results.push(await testGetPlatformInfo("masterworks"));
  results.push(await testGetPlatformInfo("realt"));

  // Summary
  console.log("\n\n" + "=".repeat(60));

  const successCount = results.filter((r) => r.success).length;
  const totalCount = results.length;
  const avgTime =
    results.reduce((sum, r) => sum + r.executionTime, 0) / totalCount;

  console.log("📊 Final Test Summary");
  console.log("====================");
  console.log(`✅ Passed: ${successCount}/${totalCount}`);
  console.log(`⏱️  Average execution time: ${Math.round(avgTime)}ms`);

  if (successCount < totalCount) {
    console.log("\n❌ Failed tests:");
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`  - ${r.toolName}: ${r.error}`);
      });
  }

  // Phase-specific summaries
  const oracleResults = results.slice(0, 7);
  const automationResults = results.slice(7, 9);
  const platformResults = results.slice(9);

  console.log("\n📊 Phase-specific Results:");
  console.log(
    `   Oracle Operations: ${oracleResults.filter((r) => r.success).length}/${oracleResults.length} passed`,
  );
  console.log(
    `   Automation Features: ${automationResults.filter((r) => r.success).length}/${automationResults.length} passed`,
  );
  console.log(
    `   Platform Management: ${platformResults.filter((r) => r.success).length}/${platformResults.length} passed`,
  );

  const allPassed = results.every((r) => r.success);
  if (allPassed) {
    console.log(
      "\n🎉 All tests passed! System ready for production deployment.",
    );
  } else {
    console.log("\n⚠️ Some tests failed. Review errors before proceeding.");
  }

  // Save the working contract addresses
  const addresses = {
    factory: factoryAddress,
    amm: ammAddress,
    oracle: oracleAddress,
    automation: automationAddress,
  };

  const fs = require("fs");
  const path = require("path");
  const addressesPath = path.join(
    __dirname,
    "..",
    "test-environment",
    "contract-addresses.json",
  );
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log("\n💾 Saved working contract addresses");

  return { results, allPassed };
}

// Run if called directly
if (require.main === module) {
  runFinalComprehensiveTest()
    .then(({ allPassed }) => {
      process.exit(allPassed ? 0 : 1);
    })
    .catch((error) => {
      console.error("💥 Test runner failed:", error);
      process.exit(1);
    });
}

export { runFinalComprehensiveTest };
