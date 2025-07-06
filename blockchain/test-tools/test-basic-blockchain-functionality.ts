import { ethers } from "hardhat";
import { LuxBridgeSDK } from "..";

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  result?: any;
  gasUsed?: string;
}

async function runBasicBlockchainTest(): Promise<void> {
  console.log("🚀 Testing basic blockchain functionality...");
  
  const results: TestResult[] = [];
  
  try {
    const [deployer, user1, user2, aiAgent] = await ethers.getSigners();
    
    console.log("📋 Deploying contracts...");
    console.log(`Deployer: ${deployer.address}`);

    // Deploy RWATokenFactory
    const RWATokenFactory = await ethers.getContractFactory("RWATokenFactory");
    const factory = await RWATokenFactory.deploy();
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    console.log(`✅ RWATokenFactory: ${factoryAddress}`);

    // Deploy LuxBridgeAMM
    const LuxBridgeAMM = await ethers.getContractFactory("LuxBridgeAMM");
    const amm = await LuxBridgeAMM.deploy();
    await amm.waitForDeployment();
    const ammAddress = await amm.getAddress();
    console.log(`✅ LuxBridgeAMM: ${ammAddress}`);

    // Deploy LuxBridgePriceOracle
    const LuxBridgePriceOracle = await ethers.getContractFactory("LuxBridgePriceOracle");
    const oracle = await LuxBridgePriceOracle.deploy(
      deployer.address, // router (mock)
      ethers.keccak256(ethers.toUtf8Bytes("fun-localhost-test")), // donId
      1, // subscriptionId
      300000 // gasLimit
    );
    await oracle.waitForDeployment();
    const oracleAddress = await oracle.getAddress();
    console.log(`✅ LuxBridgePriceOracle: ${oracleAddress}`);

    // Deploy LuxBridgeAutomation
    const LuxBridgeAutomation = await ethers.getContractFactory("LuxBridgeAutomation");
    const automation = await LuxBridgeAutomation.deploy(
      ammAddress,
      factoryAddress,
      aiAgent.address
    );
    await automation.waitForDeployment();
    const automationAddress = await automation.getAddress();
    console.log(`✅ LuxBridgeAutomation: ${automationAddress}`);

    // Set oracle in factory
    const setOracleTx = await factory.setPriceOracle(oracleAddress);
    await setOracleTx.wait();
    console.log("✅ Oracle set in factory");

    // Register platforms
    const platformTx1 = await factory.registerPlatform("splint_invest", "https://api.splint.com");
    await platformTx1.wait();
    const platformTx2 = await factory.registerPlatform("masterworks", "https://api.masterworks.com");
    await platformTx2.wait();
    const platformTx3 = await factory.registerPlatform("realt", "https://api.realt.com");
    await platformTx3.wait();
    console.log("✅ Platforms registered");

    // Initialize SDK
    const sdk = new LuxBridgeSDK({
      network: "localhost",
      privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      contracts: {
        factory: factoryAddress,
        amm: ammAddress,
        oracle: oracleAddress,
        automation: automationAddress,
      },
    });

    console.log("\n🧪 Running basic functionality tests...");

    // Test 1: Platform Info
    try {
      const platformInfo = await sdk.getPlatformInfo({ platform: "splint_invest" });
      results.push({
        name: "get_platform_info",
        success: true,
        result: platformInfo,
      });
      console.log("✅ Platform info retrieved");
    } catch (error) {
      results.push({
        name: "get_platform_info",
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      console.log(`❌ Platform info failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Test 2: Asset Tokenization
    try {
      const tokenResult = await sdk.tokenizeAsset({
        platform: "splint_invest",
        assetId: "WINE-001",
        totalSupply: "1000",
        assetType: "wine",
        subcategory: "bordeaux",
        legalHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
        valuation: "100000",
        sharePrice: "100",
        currency: "USD",
      });
      
      results.push({
        name: "tokenize_asset",
        success: true,
        result: tokenResult,
        gasUsed: tokenResult.receipt?.gasUsed?.toString(),
      });
      console.log(`✅ Asset tokenized: ${tokenResult.tokenAddress}`);

      // Test 3: Get Asset Metadata
      try {
        const metadata = await sdk.getAssetMetadata({
          platform: "splint_invest",
          assetId: "WINE-001",
        });
        
        results.push({
          name: "get_asset_metadata",
          success: true,
          result: metadata,
        });
        console.log("✅ Asset metadata retrieved");
      } catch (error) {
        results.push({
          name: "get_asset_metadata",
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
        console.log(`❌ Asset metadata failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Test 4: Mock Price Update
      try {
        const priceResult = await sdk.mockPriceUpdate({
          platform: "splint_invest",
          assetId: "WINE-001",
          price: "105000",
        });
        
        results.push({
          name: "mock_price_update",
          success: true,
          result: priceResult,
          gasUsed: priceResult.receipt?.gasUsed?.toString(),
        });
        console.log("✅ Price updated");
      } catch (error) {
        results.push({
          name: "mock_price_update",
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
        console.log(`❌ Price update failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Test 5: Get Price
      try {
        const price = await sdk.getPrice({
          platform: "splint_invest",
          assetId: "WINE-001",
        });
        
        results.push({
          name: "get_price",
          success: true,
          result: price,
        });
        console.log(`✅ Price retrieved: $${price.price}`);
      } catch (error) {
        results.push({
          name: "get_price",
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
        console.log(`❌ Get price failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Test 6: Create AMM Pool (with another asset)
      try {
        const tokenResult2 = await sdk.tokenizeAsset({
          platform: "masterworks",
          assetId: "ART-001",
          totalSupply: "500",
          assetType: "art",
          subcategory: "painting",
          legalHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
          valuation: "200000",
          sharePrice: "400",
          currency: "USD",
        });
        
        console.log(`✅ Second asset tokenized: ${tokenResult2.tokenAddress}`);

        const poolResult = await sdk.createPool({
          tokenA: tokenResult.tokenAddress,
          tokenB: tokenResult2.tokenAddress,
          swapFee: 0.3,
        });
        
        results.push({
          name: "create_pool",
          success: true,
          result: poolResult,
          gasUsed: poolResult.receipt?.gasUsed?.toString(),
        });
        console.log("✅ AMM pool created");

        // Test 7: Add Liquidity
        try {
          const liquidityResult = await sdk.addLiquidity({
            tokenA: tokenResult.tokenAddress,
            tokenB: tokenResult2.tokenAddress,
            amountADesired: "100",
            amountBDesired: "50",
            amountAMin: "90",
            amountBMin: "45",
          });
          
          results.push({
            name: "add_liquidity",
            success: true,
            result: liquidityResult,
            gasUsed: liquidityResult.receipt?.gasUsed?.toString(),
          });
          console.log("✅ Liquidity added");
        } catch (error) {
          results.push({
            name: "add_liquidity",
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
          console.log(`❌ Add liquidity failed: ${error instanceof Error ? error.message : String(error)}`);
        }

        // Test 8: Get Amount Out
        try {
          const amountOut = await sdk.getAmountOut({
            tokenIn: tokenResult.tokenAddress,
            tokenOut: tokenResult2.tokenAddress,
            amountIn: "10",
          });
          
          results.push({
            name: "get_amount_out",
            success: true,
            result: amountOut,
          });
          console.log(`✅ Amount out: ${amountOut.amountOut}`);
        } catch (error) {
          results.push({
            name: "get_amount_out",
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
          console.log(`❌ Get amount out failed: ${error instanceof Error ? error.message : String(error)}`);
        }

      } catch (error) {
        results.push({
          name: "create_pool",
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
        console.log(`❌ Pool creation failed: ${error instanceof Error ? error.message : String(error)}`);
      }

    } catch (error) {
      results.push({
        name: "tokenize_asset",
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      console.log(`❌ Asset tokenization failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Print summary
    console.log("\n📊 TEST RESULTS SUMMARY");
    console.log("======================");
    
    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;
    const totalGasUsed = results
      .filter(r => r.gasUsed)
      .reduce((sum, r) => sum + parseInt(r.gasUsed!), 0);
    
    console.log(`✅ Passed: ${successCount}/${totalCount} (${Math.round(successCount/totalCount*100)}%)`);
    console.log(`⛽ Total gas used: ${totalGasUsed.toLocaleString()}`);
    
    console.log("\n📋 Detailed Results:");
    results.forEach((result, index) => {
      const status = result.success ? "✅" : "❌";
      const gas = result.gasUsed ? ` (Gas: ${parseInt(result.gasUsed).toLocaleString()})` : '';
      console.log(`${index + 1}. ${status} ${result.name}${gas}`);
      
      if (!result.success) {
        console.log(`   Error: ${result.error}`);
      }
    });

    if (successCount < totalCount) {
      console.log("\n❌ Failed Tests:");
      results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`  - ${r.name}: ${r.error}`);
        });
    }

    // Print blockchain tool verification summary
    console.log("\n🎯 BLOCKCHAIN TOOLS VERIFICATION");
    console.log("================================");
    console.log("This test verifies the core blockchain functionality that powers ALL MCP tools:");
    
    const toolsMap = {
      "tokenize_asset": ["registerTokenizeAssetTool"],
      "get_asset_metadata": ["registerGetAssetMetadataTool"],
      "mock_price_update": ["registerCalculateArbitrageOpportunityTool (pricing component)"],
      "get_price": ["registerGetSwapQuoteTool (pricing component)"],
      "create_pool": ["registerAddLiquidityTool", "registerRemoveLiquidityTool"],
      "add_liquidity": ["registerAddLiquidityTool"],
      "get_amount_out": ["registerGetSwapQuoteTool", "registerSwapTokensTool"],
    };

    Object.entries(toolsMap).forEach(([testName, tools]) => {
      const testResult = results.find(r => r.name === testName);
      const status = testResult?.success ? "✅" : "❌";
      console.log(`${status} ${testName} → ${tools.join(", ")}`);
    });

    console.log("\n🔧 Additional MCP Tools (depend on core functionality):");
    console.log("  - registerDelegateTradingPermissionsTool → Automation contract");
    console.log("  - registerQueueAutomatedTradeTool → Automation contract");
    console.log("  - registerExecuteAutomatedTradeTool → Automation contract");
    console.log("  - registerCalculateArbitrageOpportunityTool → Oracle pricing");
    console.log("  - registerRebalancePortfolioTool → AMM + tokenization");

    const allCoreTestsPassed = [
      "tokenize_asset", 
      "get_asset_metadata", 
      "get_platform_info"
    ].every(testName => results.find(r => r.name === testName)?.success);

    if (allCoreTestsPassed) {
      console.log("\n🎉 CORE BLOCKCHAIN FUNCTIONALITY VERIFIED!");
      console.log("All blockchain-based MCP tools should work correctly.");
    } else {
      console.log("\n⚠️ SOME CORE FUNCTIONALITY FAILED!");
      console.log("Some blockchain-based MCP tools may not work correctly.");
    }
    
  } catch (error) {
    console.error("❌ Test execution failed:", error);
    process.exit(1);
  }
}

runBasicBlockchainTest();