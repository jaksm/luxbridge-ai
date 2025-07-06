import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { registerTokenizeAssetTool } from "../../lib/tools/tokenize-asset-tool";
import { registerCalculateArbitrageOpportunityTool } from "../../lib/tools/calculate-arbitrage-opportunity-tool";
import { registerAddLiquidityTool } from "../../lib/tools/add-liquidity-tool";
import { ToolTester, createSampleAssetData, type ToolTestResult } from "../test-tools/tool-test-helpers";
import { enableAuthBypass, mockAuthenticateRequest } from "../test-environment/test-auth-bypass";

export async function testCrossPlatformArbitrage(verbose: boolean = false): Promise<ToolTestResult[]> {
  console.log("⚡ Testing cross-platform arbitrage detection...");
  console.log("Flow: Setup Assets → Create Price Disparities → Detect Arbitrage");
  
  // Enable auth bypass for testing
  enableAuthBypass();
  
  // Create MCP server and register needed tools
  const server = new Server({
    name: "test-cross-platform-arbitrage",
    version: "1.0.0",
  }, {
    capabilities: {
      tools: {},
    },
  });

  // Create mock access token
  const accessToken = await mockAuthenticateRequest({} as any);
  if (!accessToken) {
    throw new Error("Failed to create mock access token");
  }

  // Register tools
  registerTokenizeAssetTool({ accessToken })(server);
  registerCalculateArbitrageOpportunityTool({ accessToken })(server);
  registerAddLiquidityTool({ accessToken })(server);

  // Create tool tester
  const tester = new ToolTester(server, { verbose, accessToken });

  const results: ToolTestResult[] = [];

  try {
    // Step 1: Tokenize same asset on different platforms with different valuations
    console.log("\n1️⃣ Creating wine asset on Splint Invest ($100/share)...");
    const wineAssetSplint = createSampleAssetData("splint_invest", "WINE-ARB-001");
    wineAssetSplint.sharePrice = "100";
    wineAssetSplint.valuation = "100000";

    const tokenizeWineSplintResult = await tester.testTool("tokenize_asset", {
      platform: "splint_invest",
      assetId: "WINE-ARB-001",
      apiAssetData: wineAssetSplint,
    });
    results.push(tokenizeWineSplintResult);

    // Step 2: Create same wine asset on different platform with higher price
    console.log("\n2️⃣ Creating same wine asset on Masterworks ($120/share)...");
    const wineAssetMasterworks = createSampleAssetData("masterworks", "WINE-ARB-001");
    wineAssetMasterworks.sharePrice = "120";
    wineAssetMasterworks.valuation = "120000";
    wineAssetMasterworks.assetType = "collectible_wine"; // Different type for masterworks

    const tokenizeWineMasterworksResult = await tester.testTool("tokenize_asset", {
      platform: "masterworks", 
      assetId: "WINE-ARB-001",
      apiAssetData: wineAssetMasterworks,
    });
    results.push(tokenizeWineMasterworksResult);

    // Step 3: Create liquidity pools for both assets
    console.log("\n3️⃣ Creating reference asset for liquidity pools...");
    const ethAsset = createSampleAssetData("realt", "ETH-REF-001");
    ethAsset.sharePrice = "1";
    ethAsset.valuation = "1000000";

    const tokenizeEthResult = await tester.testTool("tokenize_asset", {
      platform: "realt",
      assetId: "ETH-REF-001", 
      apiAssetData: ethAsset,
    });
    results.push(tokenizeEthResult);

    console.log("\n4️⃣ Adding liquidity to WINE-SPLINT/ETH pool...");
    const addLiquidity1Result = await tester.testTool("add_liquidity", {
      tokenA: "splint_invest:WINE-ARB-001",
      tokenB: "realt:ETH-REF-001",
      amountADesired: "1000", // 1000 wine @ $100 = $100k
      amountBDesired: "100000", // 100k ETH ref @ $1 = $100k
      amountAMin: "950",
      amountBMin: "95000",
    });
    results.push(addLiquidity1Result);

    console.log("\n5️⃣ Adding liquidity to WINE-MASTERWORKS/ETH pool...");
    const addLiquidity2Result = await tester.testTool("add_liquidity", {
      tokenA: "masterworks:WINE-ARB-001", 
      tokenB: "realt:ETH-REF-001",
      amountADesired: "833", // 833 wine @ $120 = ~$100k
      amountBDesired: "100000", // 100k ETH ref @ $1 = $100k
      amountAMin: "790",
      amountBMin: "95000",
    });
    results.push(addLiquidity2Result);

    // Step 4: Detect arbitrage opportunities
    console.log("\n6️⃣ Detecting arbitrage opportunities...");
    const arbitrageResult = await tester.testTool("calculate_arbitrage_opportunity", {
      assetId: "WINE-ARB-001",
      platforms: ["splint_invest", "masterworks"],
      amount: "100",
    });
    results.push(arbitrageResult);

    if (arbitrageResult.success && arbitrageResult.result?.content?.[0]?.text) {
      const arbitrageData = arbitrageResult.result.content[0].text;
      console.log("📊 Arbitrage analysis result:", arbitrageData);
      
      // Check if arbitrage was detected
      if (arbitrageData.includes("profitable") || arbitrageData.includes("spread")) {
        console.log("✅ Arbitrage opportunity detected as expected!");
      }
    }

    // Step 5: Test arbitrage with small spread (should detect minimal opportunity)
    console.log("\n7️⃣ Testing arbitrage with smaller amounts...");
    const smallArbitrageResult = await tester.testTool("calculate_arbitrage_opportunity", {
      assetId: "WINE-ARB-001",
      platforms: ["splint_invest", "masterworks"],
      amount: "10",
    });
    results.push(smallArbitrageResult);

    // Step 6: Test arbitrage with non-existent asset (should handle gracefully)
    console.log("\n8️⃣ Testing arbitrage with non-existent asset...");
    const noArbitrageResult = await tester.testTool("calculate_arbitrage_opportunity", {
      assetId: "NON-EXISTENT-001",
      platforms: ["splint_invest", "masterworks"],
      amount: "100",
    });
    results.push(noArbitrageResult);

    console.log("\n✅ Cross-platform arbitrage detection completed!");

  } catch (error) {
    console.log(`\n❌ Arbitrage test workflow failed: ${error}`);
    
    results.push({
      toolName: "arbitrage_workflow",
      success: false,
      error: error instanceof Error ? error.message : String(error),
      executionTime: 0,
    });
  }

  if (verbose) {
    tester.printSummary(results);
  }

  return results;
}

// Run test if called directly
if (require.main === module) {
  testCrossPlatformArbitrage(true)
    .then((results) => {
      const successCount = results.filter(r => r.success).length;
      console.log(`\n✅ Cross-platform arbitrage test completed: ${successCount}/${results.length} steps passed`);
      process.exit(successCount === results.length ? 0 : 1);
    })
    .catch((error) => {
      console.error("❌ Test failed:", error);
      process.exit(1);
    });
}