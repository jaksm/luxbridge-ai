import { ethers } from "hardhat";
import { LuxBridgeSDK } from "..";
import { setupLocalChain, type DeployedContracts } from "../test-environment/setup-local-chain";
import { createMockAccessToken, DEFAULT_TEST_USERS } from "../test-environment/mock-access-token";
import { AssetDataBridge } from "../../lib/utils/assetDataBridge";
import type { AccessToken } from "../../lib/redis-oauth";
import type { PlatformAsset } from "../../lib/types/platformAsset";

// Import all blockchain tools
import { registerTokenizeAssetTool } from "../../lib/tools/tokenize-asset-tool";
import { registerGetAssetMetadataTool } from "../../lib/tools/get-asset-metadata-tool";
import { registerAddLiquidityTool } from "../../lib/tools/add-liquidity-tool";
import { registerRemoveLiquidityTool } from "../../lib/tools/remove-liquidity-tool";
import { registerSwapTokensTool } from "../../lib/tools/swap-tokens-tool";
import { registerGetSwapQuoteTool } from "../../lib/tools/get-swap-quote-tool";
import { registerDelegateTradingPermissionsTool } from "../../lib/tools/delegate-trading-permissions-tool";
import { registerQueueAutomatedTradeTool } from "../../lib/tools/queue-automated-trade-tool";
import { registerExecuteAutomatedTradeTool } from "../../lib/tools/execute-automated-trade-tool";
import { registerCalculateArbitrageOpportunityTool } from "../../lib/tools/calculate-arbitrage-opportunity-tool";
import { registerRebalancePortfolioTool } from "../../lib/tools/rebalance-portfolio-tool";

interface TestResult {
  toolName: string;
  success: boolean;
  result?: any;
  error?: any;
  executionTime: number;
}

interface MockMcpServer {
  tools: Map<string, any>;
  tool(name: string, description: string, schema: any, handler: Function): void;
}

interface BlockchainTestState {
  contracts: DeployedContracts;
  accessToken: AccessToken;
  sdk: LuxBridgeSDK;
  tokenizedAssets: Array<{
    platform: string;
    assetId: string;
    tokenAddress: string;
    tokenData: any;
  }>;
  pools: Array<{
    tokenA: string;
    tokenB: string;
    poolId: string;
  }>;
  automatedTrades: Array<{
    tradeId: string;
    user: string;
    sellPlatform: string;
    sellAsset: string;
    buyPlatform: string;
    buyAsset: string;
  }>;
}

class BlockchainToolTester {
  private server: MockMcpServer;
  private state: BlockchainTestState;

  constructor(contracts: DeployedContracts, accessToken: AccessToken, sdk: LuxBridgeSDK) {
    this.server = {
      tools: new Map(),
      tool(name: string, description: string, schema: any, handler: Function) {
        this.tools.set(name, { description, schema, handler });
      }
    };

    this.state = {
      contracts,
      accessToken,
      sdk,
      tokenizedAssets: [],
      pools: [],
      automatedTrades: [],
    };
  }

  private async registerAllTools() {
    console.log("📋 Registering all blockchain tools...");
    
    // Register all tools with mock server
    registerTokenizeAssetTool({ accessToken: this.state.accessToken })(this.server as any);
    registerGetAssetMetadataTool({ accessToken: this.state.accessToken })(this.server as any);
    registerAddLiquidityTool({ accessToken: this.state.accessToken })(this.server as any);
    registerRemoveLiquidityTool({ accessToken: this.state.accessToken })(this.server as any);
    registerSwapTokensTool({ accessToken: this.state.accessToken })(this.server as any);
    registerGetSwapQuoteTool({ accessToken: this.state.accessToken })(this.server as any);
    registerDelegateTradingPermissionsTool({ accessToken: this.state.accessToken })(this.server as any);
    registerQueueAutomatedTradeTool({ accessToken: this.state.accessToken })(this.server as any);
    registerExecuteAutomatedTradeTool({ accessToken: this.state.accessToken })(this.server as any);
    registerCalculateArbitrageOpportunityTool({ accessToken: this.state.accessToken })(this.server as any);
    registerRebalancePortfolioTool({ accessToken: this.state.accessToken })(this.server as any);

    console.log(`✅ Registered ${this.server.tools.size} blockchain tools`);
  }

  private async executeTool(toolName: string, params: any): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const tool = this.server.tools.get(toolName);
      if (!tool) {
        throw new Error(`Tool ${toolName} not found`);
      }

      console.log(`🔧 Testing ${toolName}...`);
      const result = await tool.handler(params);
      const executionTime = Date.now() - startTime;

      return {
        toolName,
        success: true,
        result,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        toolName,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      };
    }
  }

  async runAllTests(): Promise<TestResult[]> {
    console.log("\n🚀 Starting comprehensive blockchain tools test...");
    
    await this.registerAllTools();
    
    const results: TestResult[] = [];

    // Test 1: Tokenize Assets
    console.log("\n=== Testing Asset Tokenization ===");
    const tokenizeResults = await this.testTokenizeAssets();
    results.push(...tokenizeResults);

    // Test 2: Get Asset Metadata
    console.log("\n=== Testing Asset Metadata Retrieval ===");
    const metadataResults = await this.testGetAssetMetadata();
    results.push(...metadataResults);

    // Test 3: AMM Operations
    console.log("\n=== Testing AMM Operations ===");
    const ammResults = await this.testAMMOperations();
    results.push(...ammResults);

    // Test 4: Swap Operations
    console.log("\n=== Testing Swap Operations ===");
    const swapResults = await this.testSwapOperations();
    results.push(...swapResults);

    // Test 5: Automation Tools
    console.log("\n=== Testing Automation Tools ===");
    const automationResults = await this.testAutomationTools();
    results.push(...automationResults);

    // Test 6: Advanced Tools
    console.log("\n=== Testing Advanced Tools ===");
    const advancedResults = await this.testAdvancedTools();
    results.push(...advancedResults);

    return results;
  }

  private createMockPlatformAsset(platform: string, assetId: string, assetType: string): PlatformAsset {
    return {
      assetId,
      name: `Test ${assetType} ${assetId}`,
      category: assetType,
      subcategory: assetType === "wine" ? "bordeaux" : assetType === "art" ? "painting" : "residential",
      valuation: {
        currentValue: 100000,
        sharePrice: 100,
        totalShares: 1000,
        availableShares: 500,
        currency: "USD",
        lastValuationDate: "2024-01-01",
        valuationFrequency: "quarterly",
      },
      expertAnalysis: {
        investmentHorizon: {
          minimumYears: 3,
          optimalYears: 5,
          maximumYears: 10,
          rationale: "Long-term appreciation expected",
          liquidityExpectation: "Moderate liquidity through platform",
        },
        riskProfile: {
          overallRiskScore: 50,
          riskCategory: "moderate",
          returnCategory: "growth",
          riskFactors: ["Market volatility", "Economic conditions"],
          mitigationStrategies: "Professional management and diversification",
        },
        yieldProjections: {
          conservativeAnnualYield: 500, // 5%
          realisticAnnualYield: 700, // 7%
          optimisticAnnualYield: 1000, // 10%
          yieldAssumptions: "Based on historical performance",
          lastReviewDate: "2024-01-01",
        },
        expertProfile: {
          verifyingExpert: "Investment Specialist",
          expertSpecialization: [assetType, "Investment Analysis"],
          trackRecord: "15 years experience",
          performanceHistory: "Consistent returns",
          certifications: ["Investment Certification"],
          yearsExperience: 15,
        },
      },
      physicalAttributes: {
        description: `High-quality ${assetType} asset`,
        characteristics: "Premium characteristics",
        condition: "excellent",
        provenance: "Verified ownership history",
      },
      metadata: {
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        version: "1.0",
        dataSource: "mock-api",
        lastSyncedAt: "2024-01-01T00:00:00Z",
      },
    };
  }

  private async testTokenizeAssets(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    // Test tokenizing different asset types
    const assetsToTokenize = [
      { platform: "splint_invest", assetId: "WINE-001", assetType: "wine" },
      { platform: "masterworks", assetId: "ART-001", assetType: "art" },
      { platform: "realt", assetId: "REAL-001", assetType: "real_estate" },
    ];

    for (const asset of assetsToTokenize) {
      const assetData = this.createMockPlatformAsset(asset.platform, asset.assetId, asset.assetType);
      const { contractData } = AssetDataBridge.prepareForTokenization(assetData);

      const params = {
        platform: asset.platform,
        assetId: asset.assetId,
        apiAssetData: assetData,
      };

      const result = await this.executeTool("tokenize_asset", params);
      results.push(result);

      if (result.success) {
        // Store tokenized asset info for later tests
        const tokenAddress = await this.state.sdk.factory.getTokenAddress(
          asset.platform,
          asset.assetId
        );
        
        this.state.tokenizedAssets.push({
          platform: asset.platform,
          assetId: asset.assetId,
          tokenAddress,
          tokenData: contractData,
        });
      }
    }

    return results;
  }

  private async testGetAssetMetadata(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const asset of this.state.tokenizedAssets) {
      const params = {
        platform: asset.platform,
        assetId: asset.assetId,
      };

      const result = await this.executeTool("get_asset_metadata", params);
      results.push(result);
    }

    return results;
  }

  private async testAMMOperations(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    if (this.state.tokenizedAssets.length < 2) {
      console.log("⚠️ Not enough tokenized assets for AMM tests");
      return results;
    }

    const [tokenA, tokenB] = this.state.tokenizedAssets.slice(0, 2);

    // Test add liquidity
    const addLiquidityParams = {
      tokenA: tokenA.tokenAddress,
      tokenB: tokenB.tokenAddress,
      amountA: "100",
      amountB: "200",
      slippage: 0.5,
    };

    const addLiquidityResult = await this.executeTool("add_liquidity", addLiquidityParams);
    results.push(addLiquidityResult);

    if (addLiquidityResult.success) {
      // Store pool info
      const poolId = await this.state.sdk.amm.getPoolId(tokenA.tokenAddress, tokenB.tokenAddress);
      this.state.pools.push({
        tokenA: tokenA.tokenAddress,
        tokenB: tokenB.tokenAddress,
        poolId: poolId.toString(),
      });
    }

    // Test remove liquidity (if pool was created)
    if (this.state.pools.length > 0) {
      const removeLiquidityParams = {
        tokenA: tokenA.tokenAddress,
        tokenB: tokenB.tokenAddress,
        liquidity: "10",
        slippage: 0.5,
      };

      const removeLiquidityResult = await this.executeTool("remove_liquidity", removeLiquidityParams);
      results.push(removeLiquidityResult);
    }

    return results;
  }

  private async testSwapOperations(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    if (this.state.tokenizedAssets.length < 2) {
      console.log("⚠️ Not enough tokenized assets for swap tests");
      return results;
    }

    const [tokenA, tokenB] = this.state.tokenizedAssets.slice(0, 2);

    // Test get swap quote
    const getQuoteParams = {
      tokenIn: tokenA.tokenAddress,
      tokenOut: tokenB.tokenAddress,
      amountIn: "10",
    };

    const getQuoteResult = await this.executeTool("get_swap_quote", getQuoteParams);
    results.push(getQuoteResult);

    // Test swap tokens
    const swapParams = {
      tokenIn: tokenA.tokenAddress,
      tokenOut: tokenB.tokenAddress,
      amountIn: "5",
      slippage: 0.5,
    };

    const swapResult = await this.executeTool("swap_tokens", swapParams);
    results.push(swapResult);

    return results;
  }

  private async testAutomationTools(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test delegate trading permissions
    const delegateParams = {
      maxTradeSize: "1000",
      maxDailyVolume: "5000",
      allowedAssets: this.state.tokenizedAssets.map(asset => 
        `${asset.platform}:${asset.assetId}`
      ),
    };

    const delegateResult = await this.executeTool("delegate_trading_permissions", delegateParams);
    results.push(delegateResult);

    if (this.state.tokenizedAssets.length >= 2) {
      const [sellAsset, buyAsset] = this.state.tokenizedAssets.slice(0, 2);

      // Test queue automated trade
      const queueParams = {
        sellPlatform: sellAsset.platform,
        sellAsset: sellAsset.assetId,
        buyPlatform: buyAsset.platform,
        buyAsset: buyAsset.assetId,
        amount: "10",
        deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      };

      const queueResult = await this.executeTool("queue_automated_trade", queueParams);
      results.push(queueResult);

      if (queueResult.success) {
        // Mock trade ID for execution test
        const mockTradeId = "0x" + "1".repeat(64);
        this.state.automatedTrades.push({
          tradeId: mockTradeId,
          user: this.state.accessToken.userData?.walletAddress || "",
          sellPlatform: sellAsset.platform,
          sellAsset: sellAsset.assetId,
          buyPlatform: buyAsset.platform,
          buyAsset: buyAsset.assetId,
        });

        // Test execute automated trade
        const executeParams = {
          tradeId: mockTradeId,
        };

        const executeResult = await this.executeTool("execute_automated_trade", executeParams);
        results.push(executeResult);
      }
    }

    return results;
  }

  private async testAdvancedTools(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    if (this.state.tokenizedAssets.length >= 2) {
      const [assetA, assetB] = this.state.tokenizedAssets.slice(0, 2);

      // Test calculate arbitrage opportunity
      const arbitrageParams = {
        assetId: assetA.assetId,
        platformA: assetA.platform,
        platformB: assetB.platform,
      };

      const arbitrageResult = await this.executeTool("calculate_arbitrage_opportunity", arbitrageParams);
      results.push(arbitrageResult);

      // Test rebalance portfolio
      const rebalanceParams = {
        targetAllocations: [
          {
            platform: assetA.platform,
            assetId: assetA.assetId,
            targetPercentage: 60,
          },
          {
            platform: assetB.platform,
            assetId: assetB.assetId,
            targetPercentage: 40,
          },
        ],
        maxSlippage: 0.5,
      };

      const rebalanceResult = await this.executeTool("rebalance_portfolio", rebalanceParams);
      results.push(rebalanceResult);
    }

    return results;
  }

  printResults(results: TestResult[]): void {
    console.log("\n📊 BLOCKCHAIN TOOLS TEST RESULTS");
    console.log("=================================");
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    const avgTime = results.reduce((sum, r) => sum + r.executionTime, 0) / totalCount;
    
    console.log(`✅ Passed: ${successCount}/${totalCount} (${Math.round(successCount/totalCount*100)}%)`);
    console.log(`⏱️  Average execution time: ${Math.round(avgTime)}ms`);
    console.log(`📦 Tokenized assets: ${this.state.tokenizedAssets.length}`);
    console.log(`🏊 Liquidity pools: ${this.state.pools.length}`);
    console.log(`🤖 Automated trades: ${this.state.automatedTrades.length}`);
    
    console.log("\n📋 Detailed Results:");
    results.forEach((result, index) => {
      const status = result.success ? "✅" : "❌";
      const time = `${result.executionTime}ms`;
      console.log(`${index + 1}. ${status} ${result.toolName} (${time})`);
      
      if (!result.success) {
        console.log(`   Error: ${result.error}`);
      }
    });

    if (successCount < totalCount) {
      console.log("\n❌ Failed Tools:");
      results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`  - ${r.toolName}: ${r.error}`);
        });
    }

    console.log("\n🎯 Test Summary by Category:");
    const categories = {
      "Asset Tokenization": results.filter(r => r.toolName.includes('tokenize') || r.toolName.includes('metadata')),
      "AMM Operations": results.filter(r => r.toolName.includes('liquidity')),
      "Swap Operations": results.filter(r => r.toolName.includes('swap')),
      "Automation": results.filter(r => r.toolName.includes('automated') || r.toolName.includes('delegate')),
      "Advanced": results.filter(r => r.toolName.includes('arbitrage') || r.toolName.includes('rebalance')),
    };

    Object.entries(categories).forEach(([category, categoryResults]) => {
      if (categoryResults.length > 0) {
        const categorySuccess = categoryResults.filter(r => r.success).length;
        const categoryTotal = categoryResults.length;
        const categoryPercent = Math.round(categorySuccess / categoryTotal * 100);
        console.log(`  ${category}: ${categorySuccess}/${categoryTotal} (${categoryPercent}%)`);
      }
    });
    
    console.log();
  }
}

export async function runComprehensiveBlockchainToolsTest(): Promise<void> {
  console.log("🚀 Starting comprehensive blockchain tools test...");
  
  try {
    // Setup local blockchain environment
    console.log("\n📦 Setting up local blockchain environment...");
    const contracts = await setupLocalChain();
    
    // Create mock access token with wallet address
    const accessToken = createMockAccessToken(DEFAULT_TEST_USERS[0]);
    
    // Initialize SDK
    const sdk = new LuxBridgeSDK({
      network: "localhost",
      privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // Default hardhat account
    });
    
    // Initialize tester
    const tester = new BlockchainToolTester(contracts, accessToken, sdk);
    
    // Run all tests
    const results = await tester.runAllTests();
    
    // Print results
    tester.printResults(results);
    
    // Exit with appropriate code
    const allPassed = results.every(r => r.success);
    if (allPassed) {
      console.log("🎉 All blockchain tools tests passed!");
      process.exit(0);
    } else {
      console.log("💥 Some blockchain tools tests failed!");
      process.exit(1);
    }
    
  } catch (error) {
    console.error("❌ Test execution failed:", error);
    process.exit(1);
  }
}

// Run the test if called directly
if (require.main === module) {
  runComprehensiveBlockchainToolsTest();
}