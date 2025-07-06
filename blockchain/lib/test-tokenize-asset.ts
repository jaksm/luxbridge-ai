import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { registerTokenizeAssetTool } from "../../lib/tools/tokenize-asset-tool";
import { ToolTester, createSampleAssetData, type ToolTestResult } from "./tool-test-helpers";
import { enableAuthBypass, mockAuthenticateRequest } from "../test-environment/test-auth-bypass";

export async function testTokenizeAssetTool(verbose: boolean = false): Promise<ToolTestResult[]> {
  console.log("🪙 Testing tokenize_asset tool...");
  
  // Enable auth bypass for testing
  enableAuthBypass();
  
  // Create MCP server and register tool
  const server = new Server({
    name: "test-tokenize-asset",
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

  // Register the tool
  registerTokenizeAssetTool({ accessToken })(server);

  // Create tool tester
  const tester = new ToolTester(server, { verbose, accessToken });

  const tests = [
    {
      toolName: "tokenize_asset",
      arguments: {
        platform: "splint_invest",
        assetId: "WINE-TEST-001",
        apiAssetData: createSampleAssetData("splint_invest", "WINE-TEST-001"),
      },
    },
    {
      toolName: "tokenize_asset", 
      arguments: {
        platform: "masterworks",
        assetId: "ART-TEST-001",
        apiAssetData: createSampleAssetData("masterworks", "ART-TEST-001"),
      },
    },
    {
      toolName: "tokenize_asset",
      arguments: {
        platform: "realt",
        assetId: "RE-TEST-001", 
        apiAssetData: createSampleAssetData("realt", "RE-TEST-001"),
      },
    },
    // Test duplicate tokenization (should fail)
    {
      toolName: "tokenize_asset",
      arguments: {
        platform: "splint_invest",
        assetId: "WINE-TEST-001", // Same as first test
        apiAssetData: createSampleAssetData("splint_invest", "WINE-TEST-001"),
      },
    },
    // Test invalid platform (should fail)
    {
      toolName: "tokenize_asset",
      arguments: {
        platform: "invalid_platform",
        assetId: "INVALID-001",
        apiAssetData: createSampleAssetData("invalid_platform", "INVALID-001"),
      },
    },
  ];

  const results = await tester.testMultipleTools(tests);
  
  if (verbose) {
    tester.printSummary(results);
  }

  return results;
}

// Run test if called directly
if (require.main === module) {
  testTokenizeAssetTool(true)
    .then((results) => {
      const successCount = results.filter(r => r.success).length;
      console.log(`\n✅ tokenize_asset test completed: ${successCount}/${results.length} passed`);
      process.exit(successCount === results.length ? 0 : 1);
    })
    .catch((error) => {
      console.error("❌ Test failed:", error);
      process.exit(1);
    });
}