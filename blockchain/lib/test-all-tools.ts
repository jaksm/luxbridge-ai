import { testTokenizeAssetTool } from "./test-tokenize-asset";
import { testGetAssetMetadataTool } from "./test-get-asset-metadata";
import { testAddLiquidityTool } from "./test-add-liquidity";
import { setupLocalChain } from "../test-environment/setup-local-chain";
import { cleanupEnvironment } from "../test-environment/cleanup-environment";
import type { ToolTestResult } from "./tool-test-helpers";

interface ToolTestSuite {
  name: string;
  testFunction: (verbose: boolean) => Promise<ToolTestResult[]>;
}

const ALL_TOOL_TESTS: ToolTestSuite[] = [
  { name: "tokenize_asset", testFunction: testTokenizeAssetTool },
  { name: "get_asset_metadata", testFunction: testGetAssetMetadataTool },
  { name: "add_liquidity", testFunction: testAddLiquidityTool },
  // TODO: Add other tool tests as they are implemented
  // { name: "remove_liquidity", testFunction: testRemoveLiquidityTool },
  // { name: "swap_tokens", testFunction: testSwapTokensTool },
  // { name: "get_swap_quote", testFunction: testGetSwapQuoteTool },
  // { name: "delegate_trading_permissions", testFunction: testDelegateTradingPermissionsTool },
  // { name: "queue_automated_trade", testFunction: testQueueAutomatedTradeTool },
  // { name: "execute_automated_trade", testFunction: testExecuteAutomatedTradeTool },
  // { name: "calculate_arbitrage_opportunity", testFunction: testCalculateArbitrageOpportunityTool },
  // { name: "rebalance_portfolio", testFunction: testRebalancePortfolioTool },
];

export async function testAllBlockchainTools(
  verbose: boolean = false,
  setupChain: boolean = true
): Promise<{ [toolName: string]: ToolTestResult[] }> {
  console.log("🚀 Starting comprehensive blockchain tools test suite...");
  console.log(`📋 Testing ${ALL_TOOL_TESTS.length} tool suites`);
  console.log("=".repeat(60));

  let allResults: { [toolName: string]: ToolTestResult[] } = {};

  try {
    // Setup local blockchain if requested
    if (setupChain) {
      console.log("\n🏗️  Setting up local blockchain...");
      await setupLocalChain();
      console.log("✅ Local blockchain ready");
    }

    // Run all tool tests
    for (const toolTest of ALL_TOOL_TESTS) {
      console.log(`\n🔧 Testing ${toolTest.name} tool suite...`);
      
      try {
        const results = await toolTest.testFunction(verbose);
        allResults[toolTest.name] = results;
        
        const successCount = results.filter(r => r.success).length;
        const totalCount = results.length;
        const avgTime = results.reduce((sum, r) => sum + r.executionTime, 0) / totalCount;
        
        console.log(`✅ ${toolTest.name}: ${successCount}/${totalCount} passed (avg: ${Math.round(avgTime)}ms)`);
        
        if (successCount < totalCount) {
          console.log(`❌ Failed tests: ${results.filter(r => !r.success).map(r => r.error).join(", ")}`);
        }
      } catch (error) {
        console.log(`❌ ${toolTest.name} suite failed: ${error}`);
        allResults[toolTest.name] = [{
          toolName: toolTest.name,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          executionTime: 0,
        }];
      }
    }

  } catch (error) {
    console.error("❌ Test suite setup failed:", error);
    throw error;
  }

  return allResults;
}

export function printOverallSummary(results: { [toolName: string]: ToolTestResult[] }): void {
  console.log("\n" + "=".repeat(60));
  console.log("📊 OVERALL TEST SUMMARY");
  console.log("=".repeat(60));

  let totalTests = 0;
  let totalPassed = 0;
  let totalTime = 0;

  Object.entries(results).forEach(([toolName, toolResults]) => {
    const passed = toolResults.filter(r => r.success).length;
    const total = toolResults.length;
    const avgTime = toolResults.reduce((sum, r) => sum + r.executionTime, 0) / total;

    totalTests += total;
    totalPassed += passed;
    totalTime += toolResults.reduce((sum, r) => sum + r.executionTime, 0);

    const status = passed === total ? "✅" : "❌";
    console.log(`${status} ${toolName.padEnd(25)} ${passed}/${total} passed (avg: ${Math.round(avgTime)}ms)`);
  });

  const overallSuccess = totalPassed === totalTests;
  const avgOverallTime = totalTime / totalTests;

  console.log("-".repeat(60));
  console.log(`${overallSuccess ? "✅" : "❌"} TOTAL: ${totalPassed}/${totalTests} passed`);
  console.log(`⏱️  Average execution time: ${Math.round(avgOverallTime)}ms`);
  console.log(`🕐 Total test time: ${Math.round(totalTime)}ms`);

  if (!overallSuccess) {
    console.log("\n❌ FAILED TESTS:");
    Object.entries(results).forEach(([toolName, toolResults]) => {
      const failed = toolResults.filter(r => !r.success);
      if (failed.length > 0) {
        console.log(`\n${toolName}:`);
        failed.forEach(f => console.log(`  - ${f.error}`));
      }
    });
  }

  console.log("\n" + "=".repeat(60));
}

// Run comprehensive test if called directly
if (require.main === module) {
  const verbose = process.argv.includes("--verbose") || process.argv.includes("-v");
  const noSetup = process.argv.includes("--no-setup");

  testAllBlockchainTools(verbose, !noSetup)
    .then((results) => {
      printOverallSummary(results);
      
      const allPassed = Object.values(results).every(toolResults => 
        toolResults.every(r => r.success)
      );
      
      if (!noSetup) {
        console.log("\n🧹 Cleaning up test environment...");
        cleanupEnvironment();
      }
      
      process.exit(allPassed ? 0 : 1);
    })
    .catch((error) => {
      console.error("❌ Test suite failed:", error);
      
      if (!noSetup) {
        console.log("\n🧹 Cleaning up test environment...");
        cleanupEnvironment();
      }
      
      process.exit(1);
    });
}