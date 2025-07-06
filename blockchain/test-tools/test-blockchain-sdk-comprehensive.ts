import { ethers } from "hardhat";
import { LuxBridgeSDK } from "..";
import { setupLocalChain, type DeployedContracts } from "../test-environment/setup-local-chain";
import { createMockAccessToken, DEFAULT_TEST_USERS } from "../test-environment/mock-access-token";

interface TestResult {
  functionName: string;
  success: boolean;
  result?: any;
  error?: any;
  executionTime: number;
  gasUsed?: string;
}

class BlockchainSDKTester {
  private sdk: LuxBridgeSDK;
  private contracts: DeployedContracts;
  private tokenizedAssets: Array<{
    platform: string;
    assetId: string;
    tokenAddress: string;
  }> = [];

  constructor(contracts: DeployedContracts) {
    this.contracts = contracts;
    this.sdk = new LuxBridgeSDK({
      network: "localhost",
      privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // Default hardhat account
    });
  }

  private async executeFunction(
    functionName: string,
    asyncFunction: () => Promise<any>
  ): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🔧 Testing ${functionName}...`);
      const result = await asyncFunction();
      const executionTime = Date.now() - startTime;

      // Extract gas used if available
      let gasUsed: string | undefined;
      if (result.receipt) {
        gasUsed = result.receipt.gasUsed?.toString();
      }

      console.log(`✅ ${functionName} succeeded in ${executionTime}ms${gasUsed ? ` (Gas: ${gasUsed})` : ''}`);

      return {
        functionName,
        success: true,
        result,
        executionTime,
        gasUsed,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      console.log(`❌ ${functionName} failed in ${executionTime}ms: ${error instanceof Error ? error.message : String(error)}`);

      return {
        functionName,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      };
    }
  }

  async runAllTests(): Promise<TestResult[]> {
    console.log("\n🚀 Starting comprehensive blockchain SDK test...");
    
    const results: TestResult[] = [];

    // Test 1: Asset Tokenization
    console.log("\n=== Testing Asset Tokenization ===");
    const tokenizeResults = await this.testTokenization();
    results.push(...tokenizeResults);

    // Test 2: Asset Metadata
    console.log("\n=== Testing Asset Metadata ===");
    const metadataResults = await this.testAssetMetadata();
    results.push(...metadataResults);

    // Test 3: AMM Operations
    console.log("\n=== Testing AMM Operations ===");
    const ammResults = await this.testAMMOperations();
    results.push(...ammResults);

    // Test 4: Oracle Operations
    console.log("\n=== Testing Oracle Operations ===");
    const oracleResults = await this.testOracle();
    results.push(...oracleResults);

    // Test 5: Automation Features
    console.log("\n=== Testing Automation Features ===");
    const automationResults = await this.testAutomation();
    results.push(...automationResults);

    // Test 6: Platform Management
    console.log("\n=== Testing Platform Management ===");
    const platformResults = await this.testPlatformManagement();
    results.push(...platformResults);

    return results;
  }

  private async testTokenization(): Promise<TestResult[]> {
    const results: TestResult[] = [];
    
    // Test tokenizing different asset types
    const assetsToTokenize = [
      { platform: "splint_invest", assetId: "WINE-001", assetType: "wine", subcategory: "bordeaux" },
      { platform: "masterworks", assetId: "ART-001", assetType: "art", subcategory: "painting" },
      { platform: "realt", assetId: "REAL-001", assetType: "real_estate", subcategory: "residential" },
    ];

    for (const asset of assetsToTokenize) {
      const result = await this.executeFunction(
        `tokenize_asset_${asset.platform}`,
        async () => {
          return await this.sdk.tokenizeAsset({
            platform: asset.platform,
            assetId: asset.assetId,
            totalSupply: "1000",
            assetType: asset.assetType,
            subcategory: asset.subcategory,
            legalHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
            valuation: "100000",
            sharePrice: "100",
            currency: "USD",
          });
        }
      );
      
      results.push(result);

      if (result.success) {
        // Store tokenized asset info for later tests
        this.tokenizedAssets.push({
          platform: asset.platform,
          assetId: asset.assetId,
          tokenAddress: result.result.tokenAddress,
        });
      }
    }

    return results;
  }

  private async testAssetMetadata(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const asset of this.tokenizedAssets) {
      const result = await this.executeFunction(
        `get_metadata_${asset.platform}`,
        async () => {
          return await this.sdk.getAssetMetadata({
            platform: asset.platform,
            assetId: asset.assetId,
          });
        }
      );
      results.push(result);
    }

    return results;
  }

  private async testAMMOperations(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    if (this.tokenizedAssets.length < 2) {
      console.log("⚠️ Not enough tokenized assets for AMM tests");
      return results;
    }

    const [tokenA, tokenB] = this.tokenizedAssets.slice(0, 2);

    // Test create pool
    const createPoolResult = await this.executeFunction(
      "create_pool",
      async () => {
        return await this.sdk.createPool({
          tokenA: tokenA.tokenAddress,
          tokenB: tokenB.tokenAddress,
          swapFee: 0.3,
        });
      }
    );
    results.push(createPoolResult);

    // Test add liquidity
    const addLiquidityResult = await this.executeFunction(
      "add_liquidity",
      async () => {
        return await this.sdk.addLiquidity({
          tokenA: tokenA.tokenAddress,
          tokenB: tokenB.tokenAddress,
          amountADesired: "100",
          amountBDesired: "200",
          amountAMin: "90",
          amountBMin: "180",
        });
      }
    );
    results.push(addLiquidityResult);

    // Test get amount out
    const getAmountOutResult = await this.executeFunction(
      "get_amount_out",
      async () => {
        return await this.sdk.getAmountOut({
          tokenIn: tokenA.tokenAddress,
          tokenOut: tokenB.tokenAddress,
          amountIn: "10",
        });
      }
    );
    results.push(getAmountOutResult);

    // Test swap
    const swapResult = await this.executeFunction(
      "swap_tokens",
      async () => {
        return await this.sdk.swap({
          tokenIn: tokenA.tokenAddress,
          tokenOut: tokenB.tokenAddress,
          amountIn: "5",
          amountOutMin: "1",
        });
      }
    );
    results.push(swapResult);

    // Test remove liquidity
    const removeLiquidityResult = await this.executeFunction(
      "remove_liquidity",
      async () => {
        return await this.sdk.removeLiquidity({
          tokenA: tokenA.tokenAddress,
          tokenB: tokenB.tokenAddress,
          liquidity: "10",
          amountAMin: "1",
          amountBMin: "1",
        });
      }
    );
    results.push(removeLiquidityResult);

    return results;
  }

  private async testOracle(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    if (this.tokenizedAssets.length === 0) {
      console.log("⚠️ No tokenized assets for oracle tests");
      return results;
    }

    const asset = this.tokenizedAssets[0];

    // Test mock price update
    const mockPriceResult = await this.executeFunction(
      "mock_price_update",
      async () => {
        return await this.sdk.mockPriceUpdate({
          platform: asset.platform,
          assetId: asset.assetId,
          price: "105000", // 5% increase
        });
      }
    );
    results.push(mockPriceResult);

    // Test get price
    const getPriceResult = await this.executeFunction(
      "get_price",
      async () => {
        return await this.sdk.getPrice({
          platform: asset.platform,
          assetId: asset.assetId,
        });
      }
    );
    results.push(getPriceResult);

    // Test arbitrage calculation
    if (this.tokenizedAssets.length >= 2) {
      const [assetA, assetB] = this.tokenizedAssets.slice(0, 2);
      
      const arbitrageResult = await this.executeFunction(
        "calculate_arbitrage",
        async () => {
          return await this.sdk.calculateArbitrageSpread({
            assetId: assetA.assetId,
            platformA: assetA.platform,
            platformB: assetB.platform,
          });
        }
      );
      results.push(arbitrageResult);
    }

    return results;
  }

  private async testAutomation(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test delegate trading
    const delegateResult = await this.executeFunction(
      "delegate_trading",
      async () => {
        return await this.sdk.delegateTrading({
          maxTradeSize: "1000",
          maxDailyVolume: "5000",
          allowedAssets: this.tokenizedAssets.map(asset => asset.tokenAddress),
        });
      }
    );
    results.push(delegateResult);

    if (this.tokenizedAssets.length >= 2) {
      const [sellAsset, buyAsset] = this.tokenizedAssets.slice(0, 2);

      // Test queue automated trade
      const queueResult = await this.executeFunction(
        "queue_automated_trade",
        async () => {
          return await this.sdk.queueAutomatedTrade({
            user: DEFAULT_TEST_USERS[0].walletAddress,
            sellPlatform: sellAsset.platform,
            sellAsset: sellAsset.assetId,
            buyPlatform: buyAsset.platform,
            buyAsset: buyAsset.assetId,
            amount: "10",
            minAmountOut: "5",
            deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
          });
        }
      );
      results.push(queueResult);
    }

    return results;
  }

  private async testPlatformManagement(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    // Test get platform info
    const platforms = ["splint_invest", "masterworks", "realt"];
    
    for (const platform of platforms) {
      const result = await this.executeFunction(
        `get_platform_info_${platform}`,
        async () => {
          return await this.sdk.getPlatformInfo({ platform });
        }
      );
      results.push(result);
    }

    // Test get token addresses
    for (const asset of this.tokenizedAssets) {
      const result = await this.executeFunction(
        `get_token_address_${asset.platform}`,
        async () => {
          return await this.sdk.getTokenAddress({
            platform: asset.platform,
            assetId: asset.assetId,
          });
        }
      );
      results.push(result);
    }

    return results;
  }

  printResults(results: TestResult[]): void {
    console.log("\n📊 COMPREHENSIVE BLOCKCHAIN SDK TEST RESULTS");
    console.log("=============================================");
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    const avgTime = results.reduce((sum, r) => sum + r.executionTime, 0) / totalCount;
    const totalGasUsed = results
      .filter(r => r.gasUsed)
      .reduce((sum, r) => sum + parseInt(r.gasUsed!), 0);
    
    console.log(`✅ Passed: ${successCount}/${totalCount} (${Math.round(successCount/totalCount*100)}%)`);
    console.log(`⏱️  Average execution time: ${Math.round(avgTime)}ms`);
    console.log(`⛽ Total gas used: ${totalGasUsed.toLocaleString()}`);
    console.log(`📦 Tokenized assets: ${this.tokenizedAssets.length}`);
    
    console.log("\n📋 Detailed Results:");
    results.forEach((result, index) => {
      const status = result.success ? "✅" : "❌";
      const time = `${result.executionTime}ms`;
      const gas = result.gasUsed ? ` (Gas: ${parseInt(result.gasUsed).toLocaleString()})` : '';
      console.log(`${index + 1}. ${status} ${result.functionName} (${time})${gas}`);
      
      if (!result.success) {
        console.log(`   Error: ${result.error}`);
      }
    });

    if (successCount < totalCount) {
      console.log("\n❌ Failed Functions:");
      results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`  - ${r.functionName}: ${r.error}`);
        });
    }

    console.log("\n🎯 Test Summary by Category:");
    const categories = {
      "Asset Tokenization": results.filter(r => r.functionName.includes('tokenize')),
      "Asset Metadata": results.filter(r => r.functionName.includes('metadata')),
      "AMM Operations": results.filter(r => 
        r.functionName.includes('pool') || 
        r.functionName.includes('liquidity') || 
        r.functionName.includes('swap') || 
        r.functionName.includes('amount')
      ),
      "Oracle Operations": results.filter(r => 
        r.functionName.includes('price') || 
        r.functionName.includes('arbitrage')
      ),
      "Automation": results.filter(r => 
        r.functionName.includes('delegate') || 
        r.functionName.includes('queue')
      ),
      "Platform Management": results.filter(r => 
        r.functionName.includes('platform') || 
        r.functionName.includes('token_address')
      ),
    };

    Object.entries(categories).forEach(([category, categoryResults]) => {
      if (categoryResults.length > 0) {
        const categorySuccess = categoryResults.filter(r => r.success).length;
        const categoryTotal = categoryResults.length;
        const categoryPercent = Math.round(categorySuccess / categoryTotal * 100);
        const categoryGas = categoryResults
          .filter(r => r.gasUsed)
          .reduce((sum, r) => sum + parseInt(r.gasUsed!), 0);
        console.log(`  ${category}: ${categorySuccess}/${categoryTotal} (${categoryPercent}%) - Gas: ${categoryGas.toLocaleString()}`);
      }
    });

    console.log("\n🏗️ Contract Addresses:");
    console.log(`  Factory: ${this.contracts.factory}`);
    console.log(`  AMM: ${this.contracts.amm}`);
    console.log(`  Oracle: ${this.contracts.oracle}`);
    console.log(`  Automation: ${this.contracts.automation}`);

    console.log("\n🪙 Tokenized Assets:");
    this.tokenizedAssets.forEach((asset, index) => {
      console.log(`  ${index + 1}. ${asset.platform}:${asset.assetId} → ${asset.tokenAddress}`);
    });
    
    console.log();
  }
}

export async function runComprehensiveSDKTest(): Promise<void> {
  console.log("🚀 Starting comprehensive blockchain SDK test...");
  
  try {
    // Setup local blockchain environment
    console.log("\n📦 Setting up local blockchain environment...");
    const contracts = await setupLocalChain();
    
    // Initialize tester
    const tester = new BlockchainSDKTester(contracts);
    
    // Run all tests
    const results = await tester.runAllTests();
    
    // Print results
    tester.printResults(results);
    
    // Exit with appropriate code
    const allPassed = results.every(r => r.success);
    if (allPassed) {
      console.log("🎉 All blockchain SDK tests passed!");
      process.exit(0);
    } else {
      console.log("💥 Some blockchain SDK tests failed!");
      process.exit(1);
    }
    
  } catch (error) {
    console.error("❌ Test execution failed:", error);
    process.exit(1);
  }
}

// Run the test if called directly
if (require.main === module) {
  runComprehensiveSDKTest();
}