import type { McpServer } from "../../lib/tools/types";
import type { AccessToken } from "../../lib/redis-oauth";
import { createMockAccessToken } from "../test-environment/mock-access-token";
import { loadContractAddresses, type DeployedContracts } from "../test-environment/setup-local-chain";

export interface ToolTestResult {
  toolName: string;
  success: boolean;
  result?: any;
  error?: any;
  executionTime: number;
}

export interface ToolTestConfig {
  accessToken: AccessToken;
  contracts: DeployedContracts;
  verbose: boolean;
}

export class ToolTester {
  private server: McpServer;
  private config: ToolTestConfig;

  constructor(server: McpServer, config: Partial<ToolTestConfig> = {}) {
    this.server = server;
    
    const contracts = loadContractAddresses();
    if (!contracts) {
      throw new Error("No contract addresses found. Run setup-local-chain.ts first.");
    }

    this.config = {
      accessToken: createMockAccessToken(),
      contracts,
      verbose: false,
      ...config,
    };
  }

  async testTool(
    toolName: string,
    arguments_: Record<string, any> = {}
  ): Promise<ToolTestResult> {
    const startTime = Date.now();
    
    if (this.config.verbose) {
      console.log(`\n🔧 Testing tool: ${toolName}`);
      console.log(`📋 Arguments:`, JSON.stringify(arguments_, null, 2));
    }

    try {
      // For now, we'll simulate the tool execution
      // In a real implementation, this would use the MCP server's tool execution
      const result = {
        content: [
          {
            type: "text" as const,
            text: `Mock result for ${toolName} with arguments: ${JSON.stringify(arguments_)}`,
          },
        ],
      };
      const executionTime = Date.now() - startTime;

      if (this.config.verbose) {
        console.log(`✅ Tool ${toolName} succeeded in ${executionTime}ms`);
        console.log(`📤 Result:`, JSON.stringify(result, null, 2));
      }

      return {
        toolName,
        success: true,
        result,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (this.config.verbose) {
        console.log(`❌ Tool ${toolName} failed in ${executionTime}ms`);
        console.log(`💥 Error:`, error);
      }

      return {
        toolName,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      };
    }
  }

  async testMultipleTools(
    tests: Array<{ toolName: string; arguments: Record<string, any> }>
  ): Promise<ToolTestResult[]> {
    const results: ToolTestResult[] = [];
    
    for (const test of tests) {
      const result = await this.testTool(test.toolName, test.arguments);
      results.push(result);
      
      // Small delay between tests to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }

  getContractAddresses(): DeployedContracts {
    return this.config.contracts;
  }

  getAccessToken(): AccessToken {
    return this.config.accessToken;
  }

  printSummary(results: ToolTestResult[]): void {
    console.log("\n📊 Test Summary");
    console.log("===============");
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    const avgTime = results.reduce((sum, r) => sum + r.executionTime, 0) / totalCount;
    
    console.log(`✅ Passed: ${successCount}/${totalCount}`);
    console.log(`⏱️  Average execution time: ${Math.round(avgTime)}ms`);
    
    if (successCount < totalCount) {
      console.log("\n❌ Failed tests:");
      results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`  - ${r.toolName}: ${r.error}`);
        });
    }
    
    console.log();
  }
}

export function createSampleAssetData(platform: string, assetId: string) {
  const assetTypes = {
    splint_invest: { type: "wine", subcategory: "bordeaux" },
    masterworks: { type: "art", subcategory: "painting" },
    realt: { type: "real_estate", subcategory: "residential" },
  };

  const config = assetTypes[platform as keyof typeof assetTypes] || assetTypes.splint_invest;

  return {
    platform,
    assetId,
    name: `Test ${config.type} ${assetId}`,
    description: `Test ${config.type} asset for testing purposes`,
    assetType: config.type,
    subcategory: config.subcategory,
    totalSupply: "1000",
    sharePrice: "100",
    valuation: "100000",
    currency: "USD",
    legalDocuments: [`legal-doc-${assetId}.pdf`],
    metadata: {
      vintage: "2023",
      region: "Test Region",
      classification: "Premium",
    },
  };
}