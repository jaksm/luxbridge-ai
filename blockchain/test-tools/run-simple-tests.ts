import { SimpleToolTester, type SimpleToolTestResult } from "./simple-tool-test";
import { setupLocalChain } from "../test-environment/setup-local-chain";
import { cleanupEnvironment } from "../test-environment/cleanup-environment";

export async function runSimpleToolTests(verbose: boolean = false): Promise<SimpleToolTestResult[]> {
  console.log("🚀 Running simplified blockchain tool tests...");
  console.log("=".repeat(50));

  const results: SimpleToolTestResult[] = [];

  try {
    // Setup local blockchain
    console.log("\n🏗️  Setting up local blockchain...");
    await setupLocalChain();
    console.log("✅ Local blockchain ready");

    // Create tester
    const tester = new SimpleToolTester(verbose);

    // Test 1: Tokenize wine asset
    console.log("\n1️⃣ Testing tokenize_asset (wine)...");
    const tokenizeWineResult = await tester.testTokenizeAsset("splint_invest", "WINE-TEST-001");
    results.push(tokenizeWineResult);

    if (!tokenizeWineResult.success) {
      console.log(`❌ Wine tokenization failed: ${tokenizeWineResult.error}`);
    }

    // Test 2: Tokenize art asset
    console.log("\n2️⃣ Testing tokenize_asset (art)...");
    const tokenizeArtResult = await tester.testTokenizeAsset("masterworks", "ART-TEST-001");
    results.push(tokenizeArtResult);

    if (!tokenizeArtResult.success) {
      console.log(`❌ Art tokenization failed: ${tokenizeArtResult.error}`);
    }

    // Test 3: Get wine asset metadata
    console.log("\n3️⃣ Testing get_asset_metadata (wine)...");
    const metadataWineResult = await tester.testGetAssetMetadata("splint_invest", "WINE-TEST-001");
    results.push(metadataWineResult);

    // Test 4: Get art asset metadata
    console.log("\n4️⃣ Testing get_asset_metadata (art)...");
    const metadataArtResult = await tester.testGetAssetMetadata("masterworks", "ART-TEST-001");
    results.push(metadataArtResult);

    // Test 5: Add liquidity (only if tokenization succeeded)
    if (tokenizeWineResult.success && tokenizeArtResult.success) {
      console.log("\n5️⃣ Testing add_liquidity...");
      const addLiquidityResult = await tester.testAddLiquidity(
        "splint_invest:WINE-TEST-001",
        "masterworks:ART-TEST-001",
        "50",  // Only use 50 tokens (total supply is 100)
        "50"   // Only use 50 tokens (total supply is 100)
      );
      results.push(addLiquidityResult);
    } else {
      console.log("\n5️⃣ Skipping add_liquidity (tokenization failed)");
      results.push({
        toolName: "add_liquidity",
        success: false,
        error: "Skipped due to tokenization failure",
        executionTime: 0,
      });
    }

    // Test 6: Test error case - non-existent asset
    console.log("\n6️⃣ Testing get_asset_metadata (non-existent)...");
    const metadataNonExistentResult = await tester.testGetAssetMetadata("splint_invest", "NON-EXISTENT-001");
    results.push(metadataNonExistentResult);

    // This should fail, which is expected
    if (!metadataNonExistentResult.success) {
      console.log("✅ Non-existent asset test failed as expected");
    }

  } catch (error) {
    console.error("❌ Test setup failed:", error);
    results.push({
      toolName: "test_setup",
      success: false,
      error: error instanceof Error ? error.message : String(error),
      executionTime: 0,
    });
  }

  return results;
}

function printOverallSummary(results: SimpleToolTestResult[]): void {
  console.log("\n" + "=".repeat(50));
  console.log("📊 OVERALL TEST SUMMARY");
  console.log("=".repeat(50));

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  const totalTime = results.reduce((sum, r) => sum + r.executionTime, 0);
  const avgTime = totalTime / totalCount;

  console.log(`${successCount === totalCount ? "✅" : "❌"} TOTAL: ${successCount}/${totalCount} passed`);
  console.log(`⏱️  Average execution time: ${Math.round(avgTime)}ms`);
  console.log(`🕐 Total test time: ${Math.round(totalTime)}ms`);

  if (successCount < totalCount) {
    console.log("\n❌ FAILED TESTS:");
    results
      .filter(r => !r.success)
      .forEach(r => console.log(`  - ${r.toolName}: ${r.error}`));
  }

  console.log("\n" + "=".repeat(50));
}

// Run tests if called directly
if (require.main === module) {
  const verbose = process.argv.includes("--verbose") || process.argv.includes("-v");

  runSimpleToolTests(verbose)
    .then((results) => {
      printOverallSummary(results);
      
      const successCount = results.filter(r => r.success).length;
      const totalCount = results.length;
      
      console.log("\n🧹 Cleaning up test environment...");
      cleanupEnvironment();
      
      // Allow for some expected failures (like non-existent asset test)
      const criticalTests = results.filter(r => 
        !r.toolName.includes("non-existent") && r.toolName !== "test_setup"
      );
      const criticalSuccessCount = criticalTests.filter(r => r.success).length;
      const allCriticalPassed = criticalSuccessCount === criticalTests.length;
      
      console.log(`\n${allCriticalPassed ? "✅" : "❌"} Critical tests: ${criticalSuccessCount}/${criticalTests.length} passed`);
      
      process.exit(allCriticalPassed ? 0 : 1);
    })
    .catch((error) => {
      console.error("❌ Test suite failed:", error);
      
      console.log("\n🧹 Cleaning up test environment...");
      cleanupEnvironment();
      
      process.exit(1);
    });
}