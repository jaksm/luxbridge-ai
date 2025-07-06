import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { registerTokenizeAssetTool } from "../../lib/tools/tokenize-asset-tool";
import { registerGetAssetMetadataTool } from "../../lib/tools/get-asset-metadata-tool";
import { registerAddLiquidityTool } from "../../lib/tools/add-liquidity-tool";
import { registerSwapTokensTool } from "../../lib/tools/swap-tokens-tool";
import { ToolTester, createSampleAssetData, type ToolTestResult } from "../test-tools/tool-test-helpers";
import { enableAuthBypass, mockAuthenticateRequest } from "../test-environment/test-auth-bypass";

export async function testEndToEndTrading(verbose: boolean = false): Promise<ToolTestResult[]> {
  console.log("🔄 Testing end-to-end trading workflow...");
  console.log("Flow: Tokenize → Add Liquidity → Swap → Verify");
  
  // Enable auth bypass for testing
  enableAuthBypass();
  
  // Create MCP server and register all needed tools
  const server = new Server({
    name: "test-end-to-end-trading",
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

  // Register all tools needed for the workflow
  registerTokenizeAssetTool({ accessToken })(server);
  registerGetAssetMetadataTool({ accessToken })(server);
  registerAddLiquidityTool({ accessToken })(server);
  registerSwapTokensTool({ accessToken })(server);

  // Create tool tester
  const tester = new ToolTester(server, { verbose, accessToken });

  const results: ToolTestResult[] = [];

  try {
    // Step 1: Tokenize wine asset
    console.log("\n1️⃣ Tokenizing wine asset...");
    const tokenizeWineResult = await tester.testTool("tokenize_asset", {
      platform: "splint_invest",
      assetId: "WINE-E2E-001",
      apiAssetData: createSampleAssetData("splint_invest", "WINE-E2E-001"),
    });
    results.push(tokenizeWineResult);

    if (!tokenizeWineResult.success) {
      throw new Error(`Failed to tokenize wine: ${tokenizeWineResult.error}`);
    }

    // Step 2: Tokenize art asset  
    console.log("\n2️⃣ Tokenizing art asset...");
    const tokenizeArtResult = await tester.testTool("tokenize_asset", {
      platform: "masterworks",
      assetId: "ART-E2E-001",
      apiAssetData: createSampleAssetData("masterworks", "ART-E2E-001"),
    });
    results.push(tokenizeArtResult);

    if (!tokenizeArtResult.success) {
      throw new Error(`Failed to tokenize art: ${tokenizeArtResult.error}`);
    }

    // Step 3: Verify asset metadata
    console.log("\n3️⃣ Verifying wine asset metadata...");
    const metadataWineResult = await tester.testTool("get_asset_metadata", {
      platform: "splint_invest",
      assetId: "WINE-E2E-001",
    });
    results.push(metadataWineResult);

    console.log("\n4️⃣ Verifying art asset metadata...");
    const metadataArtResult = await tester.testTool("get_asset_metadata", {
      platform: "masterworks", 
      assetId: "ART-E2E-001",
    });
    results.push(metadataArtResult);

    // Step 4: Add liquidity to create trading pool
    console.log("\n5️⃣ Adding liquidity to create WINE/ART pool...");
    const addLiquidityResult = await tester.testTool("add_liquidity", {
      tokenA: "splint_invest:WINE-E2E-001",
      tokenB: "masterworks:ART-E2E-001",
      amountADesired: "5000",
      amountBDesired: "5000", 
      amountAMin: "4750",
      amountBMin: "4750",
    });
    results.push(addLiquidityResult);

    if (!addLiquidityResult.success) {
      throw new Error(`Failed to add liquidity: ${addLiquidityResult.error}`);
    }

    // Step 5: Execute swap from wine to art
    console.log("\n6️⃣ Swapping WINE for ART...");
    const swapResult = await tester.testTool("swap_tokens", {
      tokenIn: "splint_invest:WINE-E2E-001",
      tokenOut: "masterworks:ART-E2E-001",
      amountIn: "1000",
      amountOutMin: "950",
    });
    results.push(swapResult);

    if (!swapResult.success) {
      throw new Error(`Failed to swap tokens: ${swapResult.error}`);
    }

    // Step 6: Verify final state with metadata check
    console.log("\n7️⃣ Final verification - checking asset states...");
    const finalWineCheck = await tester.testTool("get_asset_metadata", {
      platform: "splint_invest",
      assetId: "WINE-E2E-001",
    });
    results.push(finalWineCheck);

    const finalArtCheck = await tester.testTool("get_asset_metadata", {
      platform: "masterworks",
      assetId: "ART-E2E-001", 
    });
    results.push(finalArtCheck);

    console.log("\n✅ End-to-end trading workflow completed successfully!");

  } catch (error) {
    console.log(`\n❌ End-to-end workflow failed: ${error}`);
    
    // Add error result if workflow fails
    results.push({
      toolName: "end_to_end_workflow",
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
  testEndToEndTrading(true)
    .then((results) => {
      const successCount = results.filter(r => r.success).length;
      console.log(`\n✅ End-to-end trading test completed: ${successCount}/${results.length} steps passed`);
      process.exit(successCount === results.length ? 0 : 1);
    })
    .catch((error) => {
      console.error("❌ Test failed:", error);
      process.exit(1);
    });
}