import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { registerAddLiquidityTool } from "../../lib/tools/add-liquidity-tool";
import { ToolTester, type ToolTestResult } from "./tool-test-helpers";
import { enableAuthBypass, mockAuthenticateRequest } from "../test-environment/test-auth-bypass";

export async function testAddLiquidityTool(verbose: boolean = false): Promise<ToolTestResult[]> {
  console.log("💧 Testing add_liquidity tool...");
  
  // Enable auth bypass for testing
  enableAuthBypass();
  
  // Create MCP server and register tool
  const server = new Server({
    name: "test-add-liquidity",
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
  registerAddLiquidityTool({ accessToken })(server);

  // Create tool tester
  const tester = new ToolTester(server, { verbose, accessToken });

  // Get contract addresses for testing
  const contracts = tester.getContractAddresses();

  const tests = [
    {
      toolName: "add_liquidity",
      arguments: {
        tokenA: "splint_invest:WINE-TEST-001",
        tokenB: "masterworks:ART-TEST-001",
        amountADesired: "1000",
        amountBDesired: "1000",
        amountAMin: "950",
        amountBMin: "950",
      },
    },
    {
      toolName: "add_liquidity",
      arguments: {
        tokenA: "masterworks:ART-TEST-001",
        tokenB: "realt:RE-TEST-001", 
        amountADesired: "500",
        amountBDesired: "750",
        amountAMin: "475",
        amountBMin: "712",
      },
    },
    {
      toolName: "add_liquidity",
      arguments: {
        tokenA: "splint_invest:WINE-TEST-001",
        tokenB: "realt:RE-TEST-001",
        amountADesired: "2000",
        amountBDesired: "1500",
        amountAMin: "1900",
        amountBMin: "1425",
      },
    },
    // Test with zero amounts (should fail)
    {
      toolName: "add_liquidity",
      arguments: {
        tokenA: "splint_invest:WINE-TEST-001",
        tokenB: "masterworks:ART-TEST-001",
        amountADesired: "0",
        amountBDesired: "1000",
        amountAMin: "0",
        amountBMin: "950",
      },
    },
    // Test with invalid token identifier (should fail)
    {
      toolName: "add_liquidity",
      arguments: {
        tokenA: "invalid:TOKEN-001",
        tokenB: "masterworks:ART-TEST-001", 
        amountADesired: "1000",
        amountBDesired: "1000",
        amountAMin: "950",
        amountBMin: "950",
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
  testAddLiquidityTool(true)
    .then((results) => {
      const successCount = results.filter(r => r.success).length;
      console.log(`\n✅ add_liquidity test completed: ${successCount}/${results.length} passed`);
      process.exit(successCount === results.length ? 0 : 1);
    })
    .catch((error) => {
      console.error("❌ Test failed:", error);
      process.exit(1);
    });
}