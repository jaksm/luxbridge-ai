import { expect } from "chai";
import { ethers } from "hardhat";
import { LuxBridgeSDK } from "../../index";
import {
  RWATokenFactory,
  LuxBridgeAMM,
  LuxBridgePriceOracle,
  LuxBridgeAutomation,
} from "../../typechain-types";

describe("LuxBridge SDK", function () {
  let sdk: LuxBridgeSDK;
  let factory: RWATokenFactory;
  let amm: LuxBridgeAMM;
  let oracle: LuxBridgePriceOracle;
  let automation: LuxBridgeAutomation;
  let owner: any;
  let user: any;
  let aiAgent: any;

  beforeEach(async function () {
    [owner, user, aiAgent] = await ethers.getSigners();

    const RWATokenFactory = await ethers.getContractFactory("RWATokenFactory");
    factory = await RWATokenFactory.deploy();

    const LuxBridgeAMM = await ethers.getContractFactory("LuxBridgeAMM");
    amm = await LuxBridgeAMM.deploy();

    const LuxBridgePriceOracle = await ethers.getContractFactory(
      "LuxBridgePriceOracle",
    );
    oracle = await LuxBridgePriceOracle.deploy(
      owner.address, // router
      ethers.keccak256(ethers.toUtf8Bytes("fun-ethereum-sepolia-1")), // donId
      1, // subscriptionId
      300000, // gasLimit
    );

    const LuxBridgeAutomation = await ethers.getContractFactory(
      "LuxBridgeAutomation",
    );
    automation = await LuxBridgeAutomation.deploy(
      await amm.getAddress(),
      await factory.getAddress(),
      aiAgent.address,
    );

    const provider = ethers.provider;
    sdk = new LuxBridgeSDK({
      network: "localhost",
      provider: provider,
      privateKey:
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // hardhat account 0
      contracts: {
        factory: await factory.getAddress(),
        amm: await amm.getAddress(),
        oracle: await oracle.getAddress(),
        automation: await automation.getAddress(),
      },
    });

    // Set up oracle functions source
    await oracle.setFunctionsSource("return { result: 100000 };");

    // Register platforms that will be used in tests
    await sdk.registerPlatform({
      name: "splint_invest",
      apiEndpoint: "https://mock-api.luxbridge.local/splint",
    });
    await sdk.registerPlatform({
      name: "masterworks",
      apiEndpoint: "https://mock-api.luxbridge.local/masterworks",
    });
    await sdk.registerPlatform({
      name: "realt",
      apiEndpoint: "https://mock-api.luxbridge.local/realt",
    });
    await sdk.registerPlatform({
      name: "test_platform",
      apiEndpoint: "https://mock-api.luxbridge.local/test",
    });
  });

  describe("Constructor", function () {
    it("should initialize with correct network config", function () {
      expect(sdk).to.be.instanceOf(LuxBridgeSDK);
    });

    it("should get contract addresses", function () {
      const addresses = sdk.getContractAddresses();
      expect(addresses.factory).to.equal(factory.target);
      expect(addresses.amm).to.equal(amm.target);
      expect(addresses.oracle).to.equal(oracle.target);
      expect(addresses.automation).to.equal(automation.target);
    });

    it("should throw error for unsupported network", function () {
      expect(() => {
        new LuxBridgeSDK({
          network: "invalid" as any,
        });
      }).to.throw("Unsupported network: invalid");
    });
  });

  describe("Asset Tokenization", function () {
    it("should tokenize an asset", async function () {
      const params = {
        platform: "splint_invest",
        assetId: "BORDEAUX-2019",
        totalSupply: "1000000",
        assetType: "wine",
        subcategory: "bordeaux",
        legalHash: ethers.keccak256(ethers.toUtf8Bytes("legal-doc")),
        valuation: "100000",
        sharePrice: "100",
        currency: "USD",
      };

      const result = await sdk.tokenizeAsset(params);
      expect(result.transactionHash).to.be.a("string");
      expect(result.tokenAddress).to.be.a("string");
      expect(result.receipt).to.not.be.null;
    });

    it("should get asset metadata", async function () {
      await sdk.tokenizeAsset({
        platform: "masterworks",
        assetId: "PICASSO-042",
        totalSupply: "500000",
        assetType: "art",
        subcategory: "classic",
        legalHash: ethers.keccak256(ethers.toUtf8Bytes("art-legal")),
        valuation: "250000",
        sharePrice: "500",
        currency: "USD",
      });

      const metadata = await sdk.getAssetMetadata({
        platform: "masterworks",
        assetId: "PICASSO-042",
      });

      expect(metadata.platform).to.equal("masterworks");
      expect(metadata.assetId).to.equal("PICASSO-042");
      expect(metadata.totalSupply).to.equal("500000.0");
      expect(metadata.assetType).to.equal("art");
    });

    it("should update asset valuation", async function () {
      await sdk.tokenizeAsset({
        platform: "realt",
        assetId: "DETROIT-001",
        totalSupply: "100000",
        assetType: "real_estate",
        subcategory: "residential",
        legalHash: ethers.keccak256(ethers.toUtf8Bytes("property-legal")),
        valuation: "300000",
        sharePrice: "3000",
        currency: "USD",
      });

      // Set factory oracle to our owner account for the test
      await factory.setPriceOracle(owner.address);

      const result = await sdk.updateValuation({
        platform: "realt",
        assetId: "DETROIT-001",
        newValuation: "350000",
      });

      expect(result.transactionHash).to.be.a("string");
    });

    it("should burn tokens", async function () {
      await sdk.tokenizeAsset({
        platform: "splint_invest",
        assetId: "WHISKEY-123",
        totalSupply: "50000",
        assetType: "whiskey",
        subcategory: "single_malt",
        legalHash: ethers.keccak256(ethers.toUtf8Bytes("whiskey-legal")),
        valuation: "75000",
        sharePrice: "1500",
        currency: "USD",
      });

      // Get token contract and approve factory to burn
      const tokenAddress = await sdk
        .getTokenAddress({
          platform: "splint_invest",
          assetId: "WHISKEY-123",
        })
        .then((r) => r.tokenAddress);

      const tokenContract = await sdk.getTokenContract(tokenAddress);
      await tokenContract.approve(factory.target, ethers.parseEther("10000"));

      const result = await sdk.burnTokens({
        platform: "splint_invest",
        assetId: "WHISKEY-123",
        amount: "10000",
      });

      expect(result.transactionHash).to.be.a("string");
    });

    it("should batch tokenize multiple assets", async function () {
      const assets = [
        {
          platform: "splint_invest",
          assetId: "BATCH-WINE-001",
          totalSupply: "100000",
          assetType: "wine",
          subcategory: "bordeaux",
          legalHash: ethers.keccak256(ethers.toUtf8Bytes("wine1")),
          valuation: "50000",
          sharePrice: "500",
          currency: "USD",
        },
        {
          platform: "masterworks",
          assetId: "BATCH-ART-001",
          totalSupply: "200000",
          assetType: "art",
          subcategory: "classic",
          legalHash: ethers.keccak256(ethers.toUtf8Bytes("art1")),
          valuation: "100000",
          sharePrice: "500",
          currency: "USD",
        },
      ];

      const result = await sdk.batchTokenize({ assets });
      expect(result.transactionHash).to.be.a("string");
      expect(result.tokenAddresses).to.have.length(2);
    });
  });

  describe("AMM Operations", function () {
    let tokenA: string;
    let tokenB: string;

    beforeEach(async function () {
      await sdk.tokenizeAsset({
        platform: "splint_invest",
        assetId: "TOKEN-A",
        totalSupply: "1000000",
        assetType: "wine",
        subcategory: "bordeaux",
        legalHash: ethers.keccak256(ethers.toUtf8Bytes("token-a")),
        valuation: "100000",
        sharePrice: "100",
        currency: "USD",
      });

      await sdk.tokenizeAsset({
        platform: "masterworks",
        assetId: "TOKEN-B",
        totalSupply: "1000000",
        assetType: "art",
        subcategory: "classic",
        legalHash: ethers.keccak256(ethers.toUtf8Bytes("token-b")),
        valuation: "100000",
        sharePrice: "100",
        currency: "USD",
      });

      tokenA = await sdk
        .getTokenAddress({
          platform: "splint_invest",
          assetId: "TOKEN-A",
        })
        .then((r) => r.tokenAddress);

      tokenB = await sdk
        .getTokenAddress({
          platform: "masterworks",
          assetId: "TOKEN-B",
        })
        .then((r) => r.tokenAddress);
    });

    it("should create a liquidity pool", async function () {
      const result = await sdk.createPool({
        tokenA,
        tokenB,
        swapFee: 0.3,
      });

      expect(result.transactionHash).to.be.a("string");
      expect(result.poolId).to.be.a("string");
    });

    it("should add liquidity to pool", async function () {
      await sdk.createPool({ tokenA, tokenB });

      const tokenContractA = await sdk.getTokenContract(tokenA);
      const tokenContractB = await sdk.getTokenContract(tokenB);

      await tokenContractA.approve(amm.target, ethers.parseEther("1000"));
      await tokenContractB.approve(amm.target, ethers.parseEther("1000"));

      const result = await sdk.addLiquidity({
        tokenA,
        tokenB,
        amountADesired: "100",
        amountBDesired: "100",
        amountAMin: "95",
        amountBMin: "95",
      });

      expect(result.transactionHash).to.be.a("string");
    });

    it("should get amount out for swap", async function () {
      await sdk.createPool({ tokenA, tokenB });

      const tokenContractA = await sdk.getTokenContract(tokenA);
      const tokenContractB = await sdk.getTokenContract(tokenB);

      await tokenContractA.approve(amm.target, ethers.parseEther("1000"));
      await tokenContractB.approve(amm.target, ethers.parseEther("1000"));

      await sdk.addLiquidity({
        tokenA,
        tokenB,
        amountADesired: "100",
        amountBDesired: "100",
      });

      const result = await sdk.getAmountOut({
        tokenIn: tokenA,
        tokenOut: tokenB,
        amountIn: "10",
      });

      expect(parseFloat(result.amountOut)).to.be.greaterThan(0);
    });

    it("should find best route", async function () {
      await sdk.createPool({ tokenA, tokenB });

      const result = await sdk.findBestRoute({
        tokenIn: tokenA,
        tokenOut: tokenB,
        amountIn: "10",
      });

      expect(result.path).to.be.an("array");
      expect(result.amounts).to.be.an("array");
      expect(result.totalAmountOut).to.be.a("string");
    });
  });

  describe("Platform Management", function () {
    it("should register a platform", async function () {
      const result = await sdk.registerPlatform({
        name: "new_platform",
        apiEndpoint: "https://api.new.com",
      });

      expect(result.transactionHash).to.be.a("string");
    });

    it("should get platform info", async function () {
      const info = await sdk.getPlatformInfo({
        platform: "test_platform",
      });

      expect(info.name).to.equal("test_platform");
      expect(info.apiEndpoint).to.equal(
        "https://mock-api.luxbridge.local/test",
      );
      expect(info.isActive).to.be.true;
    });

    it("should get token address", async function () {
      await sdk.tokenizeAsset({
        platform: "test_platform",
        assetId: "TEST-001",
        totalSupply: "100000",
        assetType: "test",
        subcategory: "general",
        legalHash: ethers.keccak256(ethers.toUtf8Bytes("test")),
        valuation: "50000",
        sharePrice: "500",
        currency: "USD",
      });

      const result = await sdk.getTokenAddress({
        platform: "test_platform",
        assetId: "TEST-001",
      });

      expect(result.tokenAddress).to.be.a("string");
      expect(result.tokenAddress).to.not.equal(ethers.ZeroAddress);
    });
  });

  describe("Oracle & Pricing", function () {
    it("should request cross-platform prices", async function () {
      const result = await sdk.requestCrossPlatformPrices({
        assetId: "BORDEAUX-2019",
        platforms: ["splint_invest", "masterworks"],
      });

      expect(result.transactionHash).to.be.a("string");
    });

    it("should mock price update", async function () {
      const result = await sdk.mockPriceUpdate({
        platform: "splint_invest",
        assetId: "BORDEAUX-2019",
        price: "120000",
      });

      expect(result.transactionHash).to.be.a("string");
    });

    it("should get price", async function () {
      await sdk.mockPriceUpdate({
        platform: "splint_invest",
        assetId: "BORDEAUX-2019",
        price: "120000",
      });

      const result = await sdk.getPrice({
        platform: "splint_invest",
        assetId: "BORDEAUX-2019",
      });

      expect(result.price).to.equal("120000.0");
      expect(result.timestamp).to.be.a("number");
    });

    it("should calculate arbitrage spread", async function () {
      await sdk.mockPriceUpdate({
        platform: "splint_invest",
        assetId: "BORDEAUX-2019",
        price: "100000",
      });

      await sdk.mockPriceUpdate({
        platform: "masterworks",
        assetId: "BORDEAUX-2019",
        price: "105000",
      });

      const result = await sdk.calculateArbitrageSpread({
        assetId: "BORDEAUX-2019",
        platformA: "splint_invest",
        platformB: "masterworks",
      });

      expect(result.spread).to.be.a("number");
      expect(result.spreadPercentage).to.be.a("number");
    });
  });

  describe("Automation", function () {
    before(async function () {
      // Re-initialize contracts if they're not available (can happen when tests run in isolation)
      if (!factory || !amm || !oracle || !automation) {
        [owner, user, aiAgent] = await ethers.getSigners();

        const RWATokenFactory =
          await ethers.getContractFactory("RWATokenFactory");
        factory = await RWATokenFactory.deploy();

        const LuxBridgeAMM = await ethers.getContractFactory("LuxBridgeAMM");
        amm = await LuxBridgeAMM.deploy();

        const LuxBridgePriceOracle = await ethers.getContractFactory(
          "LuxBridgePriceOracle",
        );
        oracle = await LuxBridgePriceOracle.deploy(
          owner.address, // router
          ethers.keccak256(ethers.toUtf8Bytes("fun-ethereum-sepolia-1")), // donId
          1, // subscriptionId
          300000, // gasLimit
        );

        const LuxBridgeAutomation = await ethers.getContractFactory(
          "LuxBridgeAutomation",
        );
        automation = await LuxBridgeAutomation.deploy(
          await amm.getAddress(),
          await factory.getAddress(),
          aiAgent.address,
        );

        // Set up oracle functions source
        await oracle.setFunctionsSource("return { result: 100000 };");

        // Register platforms that will be used in tests
        const sdk = new LuxBridgeSDK({
          network: "localhost",
          provider: ethers.provider,
          privateKey:
            "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // hardhat account 0
          contracts: {
            factory: await factory.getAddress(),
            amm: await amm.getAddress(),
            oracle: await oracle.getAddress(),
            automation: await automation.getAddress(),
          },
        });

        await sdk.registerPlatform({
          name: "splint_invest",
          apiEndpoint: "https://mock-api.luxbridge.local/splint",
        });
        await sdk.registerPlatform({
          name: "masterworks",
          apiEndpoint: "https://mock-api.luxbridge.local/masterworks",
        });
      }

      const userSdk = new LuxBridgeSDK({
        network: "localhost",
        provider: ethers.provider,
        privateKey:
          "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // hardhat account 0
        contracts: {
          factory: await factory.getAddress(),
          amm: await amm.getAddress(),
          oracle: await oracle.getAddress(),
          automation: await automation.getAddress(),
        },
      });

      // Create the tokens that will be used in automation tests (larger supplies for multiple tests)
      await userSdk.tokenizeAsset({
        platform: "splint_invest",
        assetId: "WINE-001",
        totalSupply: "1000000", // 1M tokens for multiple test runs
        assetType: "wine",
        subcategory: "bordeaux",
        legalHash: ethers.keccak256(ethers.toUtf8Bytes("wine-legal")),
        valuation: "500000",
        sharePrice: "500",
        currency: "USD",
      });

      await userSdk.tokenizeAsset({
        platform: "masterworks",
        assetId: "ART-001",
        totalSupply: "500000", // 500K tokens for multiple test runs
        assetType: "art",
        subcategory: "classic",
        legalHash: ethers.keccak256(ethers.toUtf8Bytes("art-legal")),
        valuation: "250000",
        sharePrice: "500",
        currency: "USD",
      });

      // Get token addresses for AMM setup
      const wineTokenAddress = await userSdk.getTokenAddress({
        platform: "splint_invest",
        assetId: "WINE-001",
      });
      const artTokenAddress = await userSdk.getTokenAddress({
        platform: "masterworks",
        assetId: "ART-001",
      });

      // Create AMM pool
      await userSdk.createPool({
        tokenA: wineTokenAddress.tokenAddress,
        tokenB: artTokenAddress.tokenAddress,
        fee: 30,
      });

      // Get token contracts for approvals
      const wineToken = await userSdk.getTokenContract(
        wineTokenAddress.tokenAddress,
      );
      const artToken = await userSdk.getTokenContract(
        artTokenAddress.tokenAddress,
      );

      // Approve AMM to spend tokens for liquidity (larger amounts)
      await wineToken.approve(
        await amm.getAddress(),
        ethers.parseEther("100000"),
      );
      await artToken.approve(
        await amm.getAddress(),
        ethers.parseEther("50000"),
      );

      // Add liquidity to the pool (larger amounts for multiple tests)
      await userSdk.addLiquidity({
        tokenA: wineTokenAddress.tokenAddress,
        tokenB: artTokenAddress.tokenAddress,
        amountADesired: "100000", // 100K wine tokens
        amountBDesired: "50000", // 50K art tokens
        amountAMin: "90000",
        amountBMin: "45000",
      });

      // Approve automation contract to spend tokens for automated trading (large allowance)
      await wineToken.approve(
        await automation.getAddress(),
        ethers.parseEther("500000"),
      );
      await artToken.approve(
        await automation.getAddress(),
        ethers.parseEther("250000"),
      );

      // Delegate trading permissions on the current contract deployment
      await userSdk.delegateTrading({
        maxTradeSize: "10000",
        maxDailyVolume: "50000",
        allowedAssets: ["WINE-001", "ART-001"],
      });
    });

    it("should delegate trading permissions", async function () {
      const userSdk = new LuxBridgeSDK({
        network: "localhost",
        provider: ethers.provider,
        privateKey:
          "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // hardhat account 0
        contracts: {
          factory: await factory.getAddress(),
          amm: await amm.getAddress(),
          oracle: await oracle.getAddress(),
          automation: await automation.getAddress(),
        },
      });

      const result = await userSdk.delegateTrading({
        maxTradeSize: "5000",
        maxDailyVolume: "25000",
        allowedAssets: ["WINE-002", "ART-002"],
      });

      expect(result.transactionHash).to.be.a("string");
    });

    it("should queue automated trade", async function () {
      // First ensure trading permissions are set for this test
      const userSdk = new LuxBridgeSDK({
        network: "localhost",
        provider: ethers.provider,
        privateKey:
          "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // hardhat account 0
        contracts: {
          factory: await factory.getAddress(),
          amm: await amm.getAddress(),
          oracle: await oracle.getAddress(),
          automation: await automation.getAddress(),
        },
      });

      await userSdk.delegateTrading({
        maxTradeSize: "10000",
        maxDailyVolume: "50000",
        allowedAssets: ["WINE-001", "ART-001"],
      });

      const aiSdk = new LuxBridgeSDK({
        network: "localhost",
        provider: ethers.provider,
        privateKey:
          "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", // hardhat account 2
        contracts: {
          factory: await factory.getAddress(),
          amm: await amm.getAddress(),
          oracle: await oracle.getAddress(),
          automation: await automation.getAddress(),
        },
      });

      const userAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // hardhat account 0 address
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      const result = await aiSdk.queueAutomatedTrade({
        user: userAddress,
        sellPlatform: "splint_invest",
        sellAsset: "WINE-001",
        buyPlatform: "masterworks",
        buyAsset: "ART-001",
        amount: "1000",
        minAmountOut: "950",
        deadline,
      });

      expect(result.transactionHash).to.be.a("string");
    });

    it("should execute automated trade", async function () {
      // First ensure trading permissions are set for this test
      const userSdk = new LuxBridgeSDK({
        network: "localhost",
        provider: ethers.provider,
        privateKey:
          "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // hardhat account 0
        contracts: {
          factory: await factory.getAddress(),
          amm: await amm.getAddress(),
          oracle: await oracle.getAddress(),
          automation: await automation.getAddress(),
        },
      });

      // Create tokens needed for the test
      await userSdk.tokenizeAsset({
        platform: "splint_invest",
        assetId: "WINE-001",
        totalSupply: "1000000",
        assetType: "wine",
        subcategory: "bordeaux",
        legalHash: ethers.keccak256(ethers.toUtf8Bytes("wine-legal")),
        valuation: "500000",
        sharePrice: "500",
        currency: "USD",
      });

      await userSdk.tokenizeAsset({
        platform: "masterworks",
        assetId: "ART-001",
        totalSupply: "500000",
        assetType: "art",
        subcategory: "classic",
        legalHash: ethers.keccak256(ethers.toUtf8Bytes("art-legal")),
        valuation: "250000",
        sharePrice: "500",
        currency: "USD",
      });

      // Get token addresses for AMM setup
      const wineTokenAddress = await userSdk.getTokenAddress({
        platform: "splint_invest",
        assetId: "WINE-001",
      });
      const artTokenAddress = await userSdk.getTokenAddress({
        platform: "masterworks",
        assetId: "ART-001",
      });

      // Create AMM pool
      await userSdk.createPool({
        tokenA: wineTokenAddress.tokenAddress,
        tokenB: artTokenAddress.tokenAddress,
        fee: 30,
      });

      // Get token contracts for approvals
      const wineToken = await userSdk.getTokenContract(
        wineTokenAddress.tokenAddress,
      );
      const artToken = await userSdk.getTokenContract(
        artTokenAddress.tokenAddress,
      );

      // Approve AMM to spend tokens for liquidity (higher amounts to accommodate the exact liquidity)
      await wineToken.approve(
        await amm.getAddress(),
        ethers.parseEther("150000"),
      );
      await artToken.approve(
        await amm.getAddress(),
        ethers.parseEther("100000"),
      );

      // Add liquidity to the pool
      await userSdk.addLiquidity({
        tokenA: wineTokenAddress.tokenAddress,
        tokenB: artTokenAddress.tokenAddress,
        amountADesired: "100000",
        amountBDesired: "50000",
        amountAMin: "90000",
        amountBMin: "45000",
      });

      // Approve automation contract to spend tokens for automated trading
      await wineToken.approve(
        await automation.getAddress(),
        ethers.parseEther("500000"),
      );
      await artToken.approve(
        await automation.getAddress(),
        ethers.parseEther("250000"),
      );

      await userSdk.delegateTrading({
        maxTradeSize: "10000",
        maxDailyVolume: "50000",
        allowedAssets: ["WINE-001", "ART-001"],
      });

      const aiSdk = new LuxBridgeSDK({
        network: "localhost",
        provider: ethers.provider,
        privateKey:
          "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", // hardhat account 2
        contracts: {
          factory: await factory.getAddress(),
          amm: await amm.getAddress(),
          oracle: await oracle.getAddress(),
          automation: await automation.getAddress(),
        },
      });

      const deadline = Math.floor(Date.now() / 1000) + 86400; // 24 hours

      // First queue a trade
      const queueResult = await aiSdk.queueAutomatedTrade({
        user: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // hardhat account 0 address
        sellPlatform: "splint_invest",
        sellAsset: "WINE-001",
        buyPlatform: "masterworks",
        buyAsset: "ART-001",
        amount: "1000",
        minAmountOut: "400", // More realistic expectation (pool ratio is 2:1 WINE:ART)
        deadline,
      });

      // Extract trade ID from transaction receipt
      const receipt = await queueResult.receipt;
      const tradeId =
        receipt?.logs[0]?.topics[1] ||
        ethers.keccak256(ethers.toUtf8Bytes("fallback"));

      const result = await aiSdk.executeAutomatedTrade({
        tradeId,
      });

      expect(result.transactionHash).to.be.a("string");
    });
  });

  describe("Error Handling", function () {
    it("should throw error when signer required but not provided", async function () {
      const readOnlySdk = new LuxBridgeSDK({
        network: "localhost",
        contracts: {
          factory: await factory.getAddress(),
          amm: await amm.getAddress(),
          oracle: await oracle.getAddress(),
          automation: await automation.getAddress(),
        },
      });

      await expect(
        readOnlySdk.tokenizeAsset({
          platform: "test",
          assetId: "test",
          totalSupply: "1000",
          assetType: "test",
          subcategory: "general",
          legalHash: ethers.keccak256(ethers.toUtf8Bytes("test")),
          valuation: "1000",
          sharePrice: "10",
          currency: "USD",
        }),
      ).to.be.rejectedWith("Signer required for this operation");
    });

    it("should validate Zod schemas", async function () {
      await expect(
        sdk.tokenizeAsset({
          platform: "", // Empty platform should fail validation
          assetId: "test",
          totalSupply: "1000",
          assetType: "test",
          subcategory: "general",
          legalHash: ethers.keccak256(ethers.toUtf8Bytes("test")),
          valuation: "1000",
          sharePrice: "10",
          currency: "USD",
        }),
      ).to.be.rejected;
    });
  });

  describe("Utility Methods", function () {
    it("should get token contract", async function () {
      await sdk.tokenizeAsset({
        platform: "test_platform",
        assetId: "TOKEN-TEST",
        totalSupply: "100000",
        assetType: "test",
        subcategory: "general",
        legalHash: ethers.keccak256(ethers.toUtf8Bytes("test")),
        valuation: "50000",
        sharePrice: "500",
        currency: "USD",
      });

      const tokenAddress = await sdk
        .getTokenAddress({
          platform: "test_platform",
          assetId: "TOKEN-TEST",
        })
        .then((r) => r.tokenAddress);

      const tokenContract = await sdk.getTokenContract(tokenAddress);
      expect(tokenContract).to.not.be.undefined;
    });
  });
});
