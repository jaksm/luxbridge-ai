import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { registerGetAssetMetadataTool } from "../../lib/tools/get-asset-metadata-tool";
import { ToolTester, type ToolTestResult } from "./tool-test-helpers";
import { enableAuthBypass, mockAuthenticateRequest } from "../test-environment/test-auth-bypass";

export async function testGetAssetMetadataTool(verbose: boolean = false): Promise<ToolTestResult[]> {
  console.log("📊 Testing get_asset_metadata tool...");
  
  // Enable auth bypass for testing
  enableAuthBypass();
  
  // Create MCP server and register tool
  const server = new Server({
    name: "test-get-asset-metadata",
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
  registerGetAssetMetadataTool({ accessToken })(server);

  // Create tool tester
  const tester = new ToolTester(server, { verbose, accessToken });

  const tests = [
    {
      toolName: "get_asset_metadata",
      arguments: {
        platform: "splint_invest",
        assetId: "WINE-TEST-001",
      },
    },
    {
      toolName: "get_asset_metadata",
      arguments: {
        platform: "masterworks", 
        assetId: "ART-TEST-001",
      },
    },
    {
      toolName: "get_asset_metadata",
      arguments: {
        platform: "realt",
        assetId: "RE-TEST-001",
      },
    },
    // Test non-existent asset (should handle gracefully)
    {
      toolName: "get_asset_metadata",
      arguments: {
        platform: "splint_invest",
        assetId: "NON-EXISTENT-001",
      },
    },
    // Test invalid platform (should fail)
    {
      toolName: "get_asset_metadata",
      arguments: {
        platform: "invalid_platform",
        assetId: "WINE-TEST-001",
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
  testGetAssetMetadataTool(true)
    .then((results) => {
      const successCount = results.filter(r => r.success).length;
      console.log(`\n✅ get_asset_metadata test completed: ${successCount}/${results.length} passed`);
      process.exit(successCount === results.length ? 0 : 1);
    })
    .catch((error) => {
      console.error("❌ Test failed:", error);
      process.exit(1);
    });
}