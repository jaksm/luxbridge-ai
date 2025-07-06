import { LuxBridgeSDK } from "../index";
import {
  loadContractAddresses,
  type DeployedContracts,
} from "../test-environment/setup-local-chain";
import { createMockAccessToken } from "../test-environment/mock-access-token";
import { AssetDataBridge } from "../../lib/utils/assetDataBridge";
import { ethers } from "hardhat";
import { ethers as ethersLib } from "ethers";

export interface SimpleToolTestResult {
  toolName: string;
  success: boolean;
  result?: any;
  error?: any;
  executionTime: number;
}

export class SimpleToolTester {
  public sdk: LuxBridgeSDK;
  private contracts: DeployedContracts;
  private verbose: boolean;

  constructor(verbose: boolean = false) {
    this.verbose = verbose;

    // We'll initialize the SDK later with fresh contract addresses
    this.sdk = null as any;
    this.contracts = null as any;
  }

  private async initializeSdk() {
    if (this.sdk) return; // Already initialized

    // Force reload contract addresses from file
    const fs = require("fs");
    const path = require("path");
    const addressesPath = path.join(
      __dirname,
      "..",
      "test-environment",
      "contract-addresses.json",
    );

    let contracts;
    if (fs.existsSync(addressesPath)) {
      contracts = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
    } else {
      throw new Error(
        "No contract addresses found. Run setup-local-chain.ts first.",
      );
    }

    this.contracts = contracts;

    // Initialize SDK for testing with hardhat provider (which works)
    this.sdk = new LuxBridgeSDK({
      network: "localhost",
      provider: ethers.provider, // Use hardhat provider (known to work)
      privateKey:
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // Hardhat account #0
      contracts: {
        factory: contracts.factory,
        amm: contracts.amm,
        oracle: contracts.oracle,
        automation: contracts.automation,
      },
    });

    if (this.verbose) {
      console.log("🔧 SDK initialized with contracts:", {
        factory: contracts.factory,
        amm: contracts.amm,
        oracle: contracts.oracle,
        automation: contracts.automation,
      });
    }
  }

  async testTokenizeAsset(
    platform: string,
    assetId: string,
  ): Promise<SimpleToolTestResult> {
    await this.initializeSdk();
    const startTime = Date.now();

    if (this.verbose) {
      console.log(`🪙 Testing tokenize_asset: ${platform}:${assetId}`);
    }

    try {
      // Create sample asset data
      const apiAssetData = this.createSampleAssetData(platform, assetId);

      // Use AssetDataBridge to prepare data
      const bridgeResult = AssetDataBridge.prepareForTokenization(apiAssetData);

      if (bridgeResult.validationErrors.length > 0) {
        throw new Error(
          `Validation errors: ${bridgeResult.validationErrors.join(", ")}`,
        );
      }

      const contractData = bridgeResult.contractData;

      // Debug: log the contract data before calling SDK
      if (this.verbose) {
        console.log("Contract data:", {
          platform: platform,
          assetId: contractData.assetId,
          totalSupply: contractData.totalSupply,
          assetType: contractData.assetType,
          subcategory: contractData.subcategory,
          legalHash: contractData.legalHash,
          valuation: contractData.valuation,
          sharePrice: contractData.sharePrice,
          currency: contractData.currency,
        });
      }

      // Call SDK directly with the correct platform override
      const result = await this.sdk.tokenizeAsset({
        platform: platform, // Use the platform parameter instead of contractData.platform
        assetId: contractData.assetId,
        totalSupply: contractData.totalSupply,
        assetType: contractData.assetType,
        subcategory: contractData.subcategory,
        legalHash: contractData.legalHash,
        valuation: contractData.valuation,
        sharePrice: contractData.sharePrice,
        currency: contractData.currency,
      });

      const executionTime = Date.now() - startTime;

      if (this.verbose) {
        console.log(`✅ tokenize_asset succeeded in ${executionTime}ms`);
        console.log(`📤 Transaction hash: ${result.transactionHash}`);
      }

      return {
        toolName: "tokenize_asset",
        success: true,
        result,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (this.verbose) {
        console.log(`❌ tokenize_asset failed in ${executionTime}ms`);
        console.log(`💥 Error:`, error);
      }

      return {
        toolName: "tokenize_asset",
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      };
    }
  }

  async testGetAssetMetadata(
    platform: string,
    assetId: string,
  ): Promise<SimpleToolTestResult> {
    await this.initializeSdk();
    const startTime = Date.now();

    if (this.verbose) {
      console.log(`📊 Testing get_asset_metadata: ${platform}:${assetId}`);
    }

    try {
      const result = await this.sdk.getTokenAddress({ platform, assetId });

      if (result.tokenAddress) {
        // If token exists, get its metadata
        const metadata = await this.sdk.getAssetMetadata({ platform, assetId });

        const executionTime = Date.now() - startTime;

        if (this.verbose) {
          console.log(`✅ get_asset_metadata succeeded in ${executionTime}ms`);
          console.log(`📤 Token address: ${result.tokenAddress}`);
        }

        return {
          toolName: "get_asset_metadata",
          success: true,
          result: { tokenAddress: result.tokenAddress, metadata },
          executionTime,
        };
      } else {
        throw new Error(`Asset ${platform}:${assetId} not found`);
      }
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (this.verbose) {
        console.log(`❌ get_asset_metadata failed in ${executionTime}ms`);
        console.log(`💥 Error:`, error);
      }

      return {
        toolName: "get_asset_metadata",
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      };
    }
  }

  async testAddLiquidity(
    tokenA: string,
    tokenB: string,
    amountA: string,
    amountB: string,
  ): Promise<SimpleToolTestResult> {
    await this.initializeSdk();
    const startTime = Date.now();

    if (this.verbose) {
      console.log(`💧 Testing add_liquidity: ${tokenA} + ${tokenB}`);
    }

    try {
      // Parse token identifiers (platform:assetId format)
      const [platformA, assetIdA] = tokenA.split(":");
      const [platformB, assetIdB] = tokenB.split(":");

      // Get token addresses
      const tokenAddressA = await this.sdk.getTokenAddress({
        platform: platformA,
        assetId: assetIdA,
      });
      const tokenAddressB = await this.sdk.getTokenAddress({
        platform: platformB,
        assetId: assetIdB,
      });

      if (!tokenAddressA.tokenAddress || !tokenAddressB.tokenAddress) {
        throw new Error("One or both tokens not found");
      }

      // First check if pool exists, if not create it
      try {
        await this.sdk.createPool({
          tokenA: tokenAddressA.tokenAddress,
          tokenB: tokenAddressB.tokenAddress,
          swapFee: 0.3,
        });
      } catch (error) {
        // Pool might already exist, continue
        if (this.verbose) {
          console.log(
            "Pool might already exist, continuing with add liquidity...",
          );
        }
      }

      // Get token contracts and approve the AMM to spend tokens
      const tokenContractA = await this.sdk.getTokenContract(
        tokenAddressA.tokenAddress,
      );
      const tokenContractB = await this.sdk.getTokenContract(
        tokenAddressB.tokenAddress,
      );
      const ammAddress = this.sdk.getContractAddresses().amm;

      // Approve AMM to spend tokens
      await tokenContractA.approve(ammAddress, ethersLib.parseEther(amountA));
      await tokenContractB.approve(ammAddress, ethersLib.parseEther(amountB));

      if (this.verbose) {
        console.log("✅ Token approvals granted to AMM");
      }

      // Add liquidity
      const result = await this.sdk.addLiquidity({
        tokenA: tokenAddressA.tokenAddress,
        tokenB: tokenAddressB.tokenAddress,
        amountADesired: amountA,
        amountBDesired: amountB,
        amountAMin: Math.floor(parseFloat(amountA) * 0.95).toString(), // 5% slippage
        amountBMin: Math.floor(parseFloat(amountB) * 0.95).toString(),
      });

      const executionTime = Date.now() - startTime;

      if (this.verbose) {
        console.log(`✅ add_liquidity succeeded in ${executionTime}ms`);
        console.log(`📤 Transaction hash: ${result.transactionHash}`);
      }

      return {
        toolName: "add_liquidity",
        success: true,
        result,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (this.verbose) {
        console.log(`❌ add_liquidity failed in ${executionTime}ms`);
        console.log(`💥 Error:`, error);
      }

      return {
        toolName: "add_liquidity",
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      };
    }
  }

  createSampleAssetData(platform: string, assetId: string) {
    const assetTypes = {
      splint_invest: { type: "wine", subcategory: "bordeaux" },
      masterworks: { type: "art", subcategory: "painting" },
      realt: { type: "real_estate", subcategory: "residential" },
    };

    const config =
      assetTypes[platform as keyof typeof assetTypes] ||
      assetTypes.splint_invest;

    return {
      assetId,
      name: `Test ${config.type} ${assetId}`,
      category: config.type,
      subcategory: config.subcategory,

      valuation: {
        currentValue: 1000, // Much smaller values to avoid overflow
        sharePrice: 10, // Smaller values
        totalShares: 100, // Smaller values
        availableShares: 50,
        currency: "USD" as const,
        lastValuationDate: "2024-01-01T00:00:00Z",
        valuationFrequency: "quarterly" as const,
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
          overallRiskScore: 65,
          riskCategory: "moderate" as const,
          returnCategory: "growth" as const,
          riskFactors: ["Market volatility", "Economic conditions"],
          mitigationStrategies: "Diversification and professional management",
        },
        yieldProjections: {
          conservativeAnnualYield: 0.05,
          realisticAnnualYield: 0.08,
          optimisticAnnualYield: 0.12,
          yieldAssumptions: "Based on historical performance",
          lastReviewDate: "2024-01-01",
        },
        expertProfile: {
          verifyingExpert: "Test Expert",
          expertSpecialization: [config.type, "Investment Analysis"],
          trackRecord: "10 years experience",
          performanceHistory: "Consistent returns",
          certifications: ["Investment Certification"],
          yearsExperience: 10,
        },
      },

      physicalAttributes: {
        description: `Test ${config.type} asset for testing purposes`,
        characteristics: "High-quality test asset",
        condition: "excellent",
        provenance: "Test provenance",
      },

      metadata: {
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        version: "1.0",
        dataSource: "test",
        lastSyncedAt: "2024-01-01T00:00:00Z",
      },
    };
  }

  // Oracle Testing Methods

  async testMockPriceUpdate(
    platform: string,
    assetId: string,
    price: string,
  ): Promise<SimpleToolTestResult> {
    await this.initializeSdk();
    const startTime = Date.now();

    if (this.verbose) {
      console.log(
        `🔮 Testing mock_price_update: ${platform}:${assetId} @ $${price}`,
      );
    }

    try {
      const result = await this.sdk.mockPriceUpdate({
        platform,
        assetId,
        price,
      });

      const executionTime = Date.now() - startTime;

      if (this.verbose) {
        console.log(`✅ mock_price_update succeeded in ${executionTime}ms`);
        console.log(`📤 Transaction hash: ${result.transactionHash}`);
      }

      return {
        toolName: "mock_price_update",
        success: true,
        result,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (this.verbose) {
        console.log(`❌ mock_price_update failed in ${executionTime}ms`);
        console.log(`💥 Error:`, error);
      }

      return {
        toolName: "mock_price_update",
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      };
    }
  }

  async testGetPrice(
    platform: string,
    assetId: string,
  ): Promise<SimpleToolTestResult> {
    await this.initializeSdk();
    const startTime = Date.now();

    if (this.verbose) {
      console.log(`📊 Testing get_price: ${platform}:${assetId}`);
    }

    try {
      const result = await this.sdk.getPrice({ platform, assetId });

      const executionTime = Date.now() - startTime;

      if (this.verbose) {
        console.log(`✅ get_price succeeded in ${executionTime}ms`);
        console.log(
          `💰 Price: $${result.price}, Timestamp: ${result.timestamp}`,
        );
      }

      return {
        toolName: "get_price",
        success: true,
        result,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (this.verbose) {
        console.log(`❌ get_price failed in ${executionTime}ms`);
        console.log(`💥 Error:`, error);
      }

      return {
        toolName: "get_price",
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      };
    }
  }

  async testCrossPlatformPrices(
    assetId: string,
    platforms: string[],
  ): Promise<SimpleToolTestResult> {
    await this.initializeSdk();
    const startTime = Date.now();

    if (this.verbose) {
      console.log(
        `🌐 Testing cross_platform_prices: ${assetId} across [${platforms.join(", ")}]`,
      );
    }

    try {
      const result = await this.sdk.requestCrossPlatformPrices({
        assetId,
        platforms,
      });

      const executionTime = Date.now() - startTime;

      if (this.verbose) {
        console.log(`✅ cross_platform_prices succeeded in ${executionTime}ms`);
        console.log(`📤 Transaction hash: ${result.transactionHash}`);
      }

      return {
        toolName: "cross_platform_prices",
        success: true,
        result,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (this.verbose) {
        console.log(`❌ cross_platform_prices failed in ${executionTime}ms`);
        console.log(`💥 Error:`, error);
      }

      return {
        toolName: "cross_platform_prices",
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      };
    }
  }

  async testArbitrageSpread(
    assetId: string,
    platformA: string,
    platformB: string,
  ): Promise<SimpleToolTestResult> {
    await this.initializeSdk();
    const startTime = Date.now();

    if (this.verbose) {
      console.log(
        `⚖️ Testing arbitrage_spread: ${assetId} between ${platformA} and ${platformB}`,
      );
    }

    try {
      const result = await this.sdk.calculateArbitrageSpread({
        assetId,
        platformA,
        platformB,
      });

      const executionTime = Date.now() - startTime;

      if (this.verbose) {
        console.log(`✅ arbitrage_spread succeeded in ${executionTime}ms`);
        console.log(
          `📈 Spread: ${result.spread} basis points (${result.spreadPercentage}%)`,
        );
      }

      return {
        toolName: "arbitrage_spread",
        success: true,
        result,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (this.verbose) {
        console.log(`❌ arbitrage_spread failed in ${executionTime}ms`);
        console.log(`💥 Error:`, error);
      }

      return {
        toolName: "arbitrage_spread",
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      };
    }
  }

  // Automation Testing Methods

  async testDelegateTrading(
    maxTradeSize: string,
    maxDailyVolume: string,
    allowedAssets: string[],
  ): Promise<SimpleToolTestResult> {
    await this.initializeSdk();
    const startTime = Date.now();

    if (this.verbose) {
      console.log(
        `🤖 Testing delegate_trading: maxTrade=$${maxTradeSize}, dailyLimit=$${maxDailyVolume}`,
      );
    }

    try {
      const result = await this.sdk.delegateTrading({
        maxTradeSize,
        maxDailyVolume,
        allowedAssets,
      });

      const executionTime = Date.now() - startTime;

      if (this.verbose) {
        console.log(`✅ delegate_trading succeeded in ${executionTime}ms`);
        console.log(`📤 Transaction hash: ${result.transactionHash}`);
      }

      return {
        toolName: "delegate_trading",
        success: true,
        result,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (this.verbose) {
        console.log(`❌ delegate_trading failed in ${executionTime}ms`);
        console.log(`💥 Error:`, error);
      }

      return {
        toolName: "delegate_trading",
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      };
    }
  }

  async testQueueAutomatedTrade(params: {
    user: string;
    sellPlatform: string;
    sellAsset: string;
    buyPlatform: string;
    buyAsset: string;
    amount: string;
    deadline: number;
  }): Promise<SimpleToolTestResult> {
    await this.initializeSdk();
    const startTime = Date.now();

    if (this.verbose) {
      console.log(
        `📋 Testing queue_automated_trade: ${params.sellPlatform}:${params.sellAsset} → ${params.buyPlatform}:${params.buyAsset}`,
      );
    }

    try {
      const result = await this.sdk.queueAutomatedTrade({
        user: params.user,
        sellPlatform: params.sellPlatform,
        sellAsset: params.sellAsset,
        buyPlatform: params.buyPlatform,
        buyAsset: params.buyAsset,
        amount: params.amount,
        deadline: params.deadline,
      });

      const executionTime = Date.now() - startTime;

      if (this.verbose) {
        console.log(`✅ queue_automated_trade succeeded in ${executionTime}ms`);
        console.log(`📤 Transaction hash: ${result.transactionHash}`);
      }

      return {
        toolName: "queue_automated_trade",
        success: true,
        result,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (this.verbose) {
        console.log(`❌ queue_automated_trade failed in ${executionTime}ms`);
        console.log(`💥 Error:`, error);
      }

      return {
        toolName: "queue_automated_trade",
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      };
    }
  }

  // Platform Management Testing Methods

  async testRegisterPlatform(
    name: string,
    apiEndpoint: string,
  ): Promise<SimpleToolTestResult> {
    await this.initializeSdk();
    const startTime = Date.now();

    if (this.verbose) {
      console.log(`🏢 Testing register_platform: ${name} at ${apiEndpoint}`);
    }

    try {
      const result = await this.sdk.registerPlatform({
        name,
        apiEndpoint,
      });

      const executionTime = Date.now() - startTime;

      if (this.verbose) {
        console.log(`✅ register_platform succeeded in ${executionTime}ms`);
        console.log(`📤 Transaction hash: ${result.transactionHash}`);
      }

      return {
        toolName: "register_platform",
        success: true,
        result,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (this.verbose) {
        console.log(`❌ register_platform failed in ${executionTime}ms`);
        console.log(`💥 Error:`, error);
      }

      return {
        toolName: "register_platform",
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      };
    }
  }

  async testGetPlatformInfo(platform: string): Promise<SimpleToolTestResult> {
    await this.initializeSdk();
    const startTime = Date.now();

    if (this.verbose) {
      console.log(`📋 Testing get_platform_info: ${platform}`);
    }

    try {
      const result = await this.sdk.getPlatformInfo({ platform });

      const executionTime = Date.now() - startTime;

      if (this.verbose) {
        console.log(`✅ get_platform_info succeeded in ${executionTime}ms`);
        console.log(
          `📊 Platform: ${result.name}, Active: ${result.isActive}, Assets: ${result.totalAssetsTokenized}`,
        );
      }

      return {
        toolName: "get_platform_info",
        success: true,
        result,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      if (this.verbose) {
        console.log(`❌ get_platform_info failed in ${executionTime}ms`);
        console.log(`💥 Error:`, error);
      }

      return {
        toolName: "get_platform_info",
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      };
    }
  }

  printSummary(results: SimpleToolTestResult[]): void {
    console.log("\n📊 Test Summary");
    console.log("===============");

    const successCount = results.filter((r) => r.success).length;
    const totalCount = results.length;
    const avgTime =
      results.reduce((sum, r) => sum + r.executionTime, 0) / totalCount;

    console.log(`✅ Passed: ${successCount}/${totalCount}`);
    console.log(`⏱️  Average execution time: ${Math.round(avgTime)}ms`);

    if (successCount < totalCount) {
      console.log("\n❌ Failed tests:");
      results
        .filter((r) => !r.success)
        .forEach((r) => {
          console.log(`  - ${r.toolName}: ${r.error}`);
        });
    }

    console.log();
  }
}
