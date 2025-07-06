import { SimpleToolTester } from "./simple-tool-test";

async function runComprehensiveTests() {
  const tester = new SimpleToolTester(true); // verbose mode
  const results = [];

  console.log("🚀 Starting Comprehensive LuxBridge Testing");
  console.log("==============================================");
  console.log("Testing Oracle, Automation & Platform Management");
  console.log("");

  // Phase 1: Oracle Operations Testing
  console.log("📊 Phase 1: Oracle Operations Testing");
  console.log("=====================================");

  // Test 1.1: Mock Price Updates
  console.log("\n🔮 Testing Mock Price Updates...");
  results.push(
    await tester.testMockPriceUpdate(
      "splint_invest",
      "BORDEAUX-2019",
      "100000",
    ),
  );
  results.push(
    await tester.testMockPriceUpdate("masterworks", "PICASSO-042", "105000"),
  );
  results.push(
    await tester.testMockPriceUpdate("realt", "DETROIT-001", "95000"),
  );

  // Test 1.2: Price Retrieval
  console.log("\n📊 Testing Price Retrieval...");
  results.push(await tester.testGetPrice("splint_invest", "BORDEAUX-2019"));
  results.push(await tester.testGetPrice("masterworks", "PICASSO-042"));
  results.push(await tester.testGetPrice("realt", "DETROIT-001"));

  // Test 1.3: Cross-Platform Price Requests
  console.log("\n🌐 Testing Cross-Platform Price Requests...");
  results.push(
    await tester.testCrossPlatformPrices("LUXURY-001", [
      "splint_invest",
      "masterworks",
      "realt",
    ]),
  );

  // Test 1.4: Arbitrage Detection
  console.log("\n⚖️ Testing Arbitrage Detection...");
  results.push(
    await tester.testArbitrageSpread(
      "BORDEAUX-2019",
      "splint_invest",
      "masterworks",
    ),
  );
  results.push(
    await tester.testArbitrageSpread("PICASSO-042", "masterworks", "realt"),
  );

  // Phase 2: Automation Features Testing
  console.log("\n\n🤖 Phase 2: Automation Features Testing");
  console.log("========================================");

  // Test 2.1: Trading Delegation
  console.log("\n🤖 Testing Trading Delegation...");
  results.push(
    await tester.testDelegateTrading(
      "50000", // $50k max trade size
      "200000", // $200k daily limit
      ["BORDEAUX-2019", "PICASSO-042", "DETROIT-001"],
    ),
  );

  // Test 2.2: Automated Trade Queue
  console.log("\n📋 Testing Automated Trade Queue...");
  const signerAddress = await tester.sdk?.signer?.getAddress();
  if (signerAddress) {
    results.push(
      await tester.testQueueAutomatedTrade({
        user: signerAddress,
        sellPlatform: "splint_invest",
        sellAsset: "BORDEAUX-2019",
        buyPlatform: "masterworks",
        buyAsset: "PICASSO-042",
        amount: "1000",
        deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour deadline
      }),
    );
  } else {
    console.log("⚠️ Skipping queue test - no signer address available");
    results.push({
      toolName: "queue_automated_trade",
      success: false,
      error: "No signer address available",
      executionTime: 0,
    });
  }

  // Phase 3: Platform Management Testing
  console.log("\n\n🏢 Phase 3: Platform Management Testing");
  console.log("========================================");

  // Test 3.1: Platform Registration
  console.log("\n🏢 Testing Platform Registration...");
  results.push(
    await tester.testRegisterPlatform(
      "test_platform",
      "https://api.test-platform.com",
    ),
  );

  // Test 3.2: Platform Info Retrieval
  console.log("\n📋 Testing Platform Info Retrieval...");
  results.push(await tester.testGetPlatformInfo("splint_invest"));
  results.push(await tester.testGetPlatformInfo("masterworks"));
  results.push(await tester.testGetPlatformInfo("realt"));

  // Summary
  console.log("\n\n" + "=".repeat(60));
  tester.printSummary(results);

  // Phase-specific summaries
  const oracleResults = results.slice(0, 7);
  const automationResults = results.slice(7, 9);
  const platformResults = results.slice(9);

  console.log("📊 Phase-specific Results:");
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

  return { results, allPassed };
}

// Run if called directly
if (require.main === module) {
  runComprehensiveTests()
    .then(({ allPassed }) => {
      process.exit(allPassed ? 0 : 1);
    })
    .catch((error) => {
      console.error("💥 Test runner failed:", error);
      process.exit(1);
    });
}

export { runComprehensiveTests };
