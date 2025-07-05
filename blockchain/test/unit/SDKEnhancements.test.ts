import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { EnhancedLuxBridgeSDK } from "../../lib/sdk-enhancements";
import { SDKUtils } from "../../lib/sdk-utils";
import { ErrorCode, LuxBridgeError } from "../../lib/errors";

describe("Enhanced LuxBridge SDK", function () {
  async function deploySystemFixture() {
    const [owner, alice, bob] = await ethers.getSigners();

    // Deploy contracts
    const RWATokenFactory = await ethers.getContractFactory("RWATokenFactory");
    const factory = await RWATokenFactory.deploy();

    const LuxBridgeAMM = await ethers.getContractFactory("LuxBridgeAMM");
    const amm = await LuxBridgeAMM.deploy();

    const LuxBridgePriceOracle = await ethers.getContractFactory("LuxBridgePriceOracle");
    const oracle = await LuxBridgePriceOracle.deploy();

    const LuxBridgeAutomation = await ethers.getContractFactory("LuxBridgeAutomation");
    const automation = await LuxBridgeAutomation.deploy(await factory.getAddress());

    // Setup contracts
    await factory.setPriceOracle(await oracle.getAddress());
    await factory.registerPlatform("splint_invest", "https://mock-api.luxbridge.ai/splint");
    await factory.registerPlatform("masterworks", "https://mock-api.luxbridge.ai/masterworks");

    const provider = ethers.provider;
    const signer = owner;

    // Create SDK instance
    const sdk = new EnhancedLuxBridgeSDK({
      network: "localhost",
      provider,
      privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      contracts: {
        factory: await factory.getAddress(),
        amm: await amm.getAddress(),
        oracle: await oracle.getAddress(),
        automation: await automation.getAddress(),
      },
    });

    const utils = new SDKUtils(sdk);

    return { factory, amm, oracle, automation, sdk, utils, owner, alice, bob };
  }

  describe("Error Handling", function () {
    it("Should handle asset already tokenized error", async function () {
      const { sdk } = await loadFixture(deploySystemFixture);

      // Tokenize once
      await sdk.tokenizeAsset({
        platform: "splint_invest",
        assetId: "WINE-001",
        totalSupply: "1000000",
        assetType: "wine",
        subcategory: "bordeaux",
        legalHash: ethers.keccak256(ethers.toUtf8Bytes("legal-doc")),
        valuation: "1000000",
        sharePrice: "1",
        currency: "USD",
      });

      // Try to tokenize again
      try {
        await sdk.tokenizeAsset({
          platform: "splint_invest",
          assetId: "WINE-001",
          totalSupply: "1000000",
          assetType: "wine",
          subcategory: "bordeaux",
          legalHash: ethers.keccak256(ethers.toUtf8Bytes("legal-doc")),
          valuation: "1000000",
          sharePrice: "1",
          currency: "USD",
        });
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(error).to.be.instanceOf(LuxBridgeError);
        expect(error.code).to.equal(ErrorCode.ASSET_ALREADY_TOKENIZED);
      }
    });

    it("Should handle insufficient balance error", async function () {
      const { sdk, alice } = await loadFixture(deploySystemFixture);

      // Create tokens
      await sdk.tokenizeAsset({
        platform: "splint_invest",
        assetId: "WINE-001",
        totalSupply: "1000",
        assetType: "wine",
        subcategory: "bordeaux",
        legalHash: ethers.keccak256(ethers.toUtf8Bytes("legal-doc")),
        valuation: "1000",
        sharePrice: "1",
        currency: "USD",
      });

      await sdk.tokenizeAsset({
        platform: "masterworks",
        assetId: "ART-001",
        totalSupply: "1000",
        assetType: "art",
        subcategory: "painting",
        legalHash: ethers.keccak256(ethers.toUtf8Bytes("legal-doc")),
        valuation: "1000",
        sharePrice: "1",
        currency: "USD",
      });

      const tokenA = await sdk.getTokenAddress({ platform: "splint_invest", assetId: "WINE-001" });
      const tokenB = await sdk.getTokenAddress({ platform: "masterworks", assetId: "ART-001" });

      // Create pool
      await sdk.createPool({
        tokenA: tokenA.tokenAddress,
        tokenB: tokenB.tokenAddress,
        swapFee: 0.3,
      });

      // Try to swap without balance
      const aliceSDK = new EnhancedLuxBridgeSDK({
        network: "localhost",
        privateKey: alice.privateKey,
        contracts: sdk.getContractAddresses(),
      });

      try {
        await aliceSDK.swap({
          tokenIn: tokenA.tokenAddress,
          tokenOut: tokenB.tokenAddress,
          amountIn: "100",
          amountOutMin: "0",
        });
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(error).to.be.instanceOf(LuxBridgeError);
        // Could be insufficient balance or insufficient liquidity
        expect([ErrorCode.INSUFFICIENT_BALANCE, ErrorCode.INSUFFICIENT_LIQUIDITY]).to.include(error.code);
      }
    });
  });

  describe("Batch Operations", function () {
    it("Should execute batch operations successfully", async function () {
      const { sdk } = await loadFixture(deploySystemFixture);

      const operations = [
        () => sdk.tokenizeAsset({
          platform: "splint_invest",
          assetId: "WINE-001",
          totalSupply: "1000",
          assetType: "wine",
          subcategory: "bordeaux",
          legalHash: ethers.keccak256(ethers.toUtf8Bytes("legal-doc-1")),
          valuation: "1000",
          sharePrice: "1",
          currency: "USD",
        }),
        () => sdk.tokenizeAsset({
          platform: "splint_invest",
          assetId: "WINE-002",
          totalSupply: "2000",
          assetType: "wine",
          subcategory: "burgundy",
          legalHash: ethers.keccak256(ethers.toUtf8Bytes("legal-doc-2")),
          valuation: "2000",
          sharePrice: "1",
          currency: "USD",
        }),
        () => sdk.tokenizeAsset({
          platform: "masterworks",
          assetId: "ART-001",
          totalSupply: "500",
          assetType: "art",
          subcategory: "painting",
          legalHash: ethers.keccak256(ethers.toUtf8Bytes("legal-doc-3")),
          valuation: "5000",
          sharePrice: "10",
          currency: "USD",
        }),
      ];

      const results = await sdk.batchOperations(operations, { concurrency: 2 });

      expect(results).to.have.lengthOf(3);
      expect(results.every(r => r.success)).to.be.true;
    });

    it("Should handle errors in batch operations", async function () {
      const { sdk } = await loadFixture(deploySystemFixture);

      // First tokenize an asset
      await sdk.tokenizeAsset({
        platform: "splint_invest",
        assetId: "WINE-001",
        totalSupply: "1000",
        assetType: "wine",
        subcategory: "bordeaux",
        legalHash: ethers.keccak256(ethers.toUtf8Bytes("legal-doc")),
        valuation: "1000",
        sharePrice: "1",
        currency: "USD",
      });

      const operations = [
        () => sdk.tokenizeAsset({
          platform: "splint_invest",
          assetId: "WINE-001", // Duplicate - will fail
          totalSupply: "1000",
          assetType: "wine",
          subcategory: "bordeaux",
          legalHash: ethers.keccak256(ethers.toUtf8Bytes("legal-doc")),
          valuation: "1000",
          sharePrice: "1",
          currency: "USD",
        }),
        () => sdk.tokenizeAsset({
          platform: "splint_invest",
          assetId: "WINE-002", // New - will succeed
          totalSupply: "2000",
          assetType: "wine",
          subcategory: "burgundy",
          legalHash: ethers.keccak256(ethers.toUtf8Bytes("legal-doc-2")),
          valuation: "2000",
          sharePrice: "1",
          currency: "USD",
        }),
      ];

      const results = await sdk.batchOperations(operations, { stopOnError: false });

      expect(results).to.have.lengthOf(2);
      expect(results[0].success).to.be.false;
      expect(results[0].error?.code).to.equal(ErrorCode.ASSET_ALREADY_TOKENIZED);
      expect(results[1].success).to.be.true;
    });
  });

  describe("Event Listening", function () {
    it("Should listen to tokenization events", async function () {
      const { sdk } = await loadFixture(deploySystemFixture);

      const events: any[] = [];
      const cleanup = await sdk.listenToEvents(
        "factory",
        "AssetTokenized",
        (event) => events.push(event)
      );

      await sdk.tokenizeAsset({
        platform: "splint_invest",
        assetId: "WINE-001",
        totalSupply: "1000",
        assetType: "wine",
        subcategory: "bordeaux",
        legalHash: ethers.keccak256(ethers.toUtf8Bytes("legal-doc")),
        valuation: "1000",
        sharePrice: "1",
        currency: "USD",
      });

      // Wait for event
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(events).to.have.lengthOf(1);
      expect(events[0].eventName).to.equal("AssetTokenized");

      cleanup();
    });
  });

  describe("Health Check", function () {
    it("Should perform health check successfully", async function () {
      const { sdk } = await loadFixture(deploySystemFixture);

      const health = await sdk.checkHealth();

      expect(health.provider).to.be.true;
      expect(health.contracts.factory).to.be.true;
      expect(health.contracts.amm).to.be.true;
      expect(health.contracts.oracle).to.be.true;
      expect(health.contracts.automation).to.be.true;
      expect(health.blockNumber).to.be.greaterThan(0);
      expect(health.chainId).to.equal(31337); // Hardhat chainId
    });
  });

  describe("SDK Utilities", function () {
    it("Should get user portfolio", async function () {
      const { sdk, utils, owner } = await loadFixture(deploySystemFixture);

      // Tokenize some assets
      await sdk.tokenizeAsset({
        platform: "splint_invest",
        assetId: "WINE-001",
        totalSupply: "1000",
        assetType: "wine",
        subcategory: "bordeaux",
        legalHash: ethers.keccak256(ethers.toUtf8Bytes("legal-doc")),
        valuation: "10000",
        sharePrice: "10",
        currency: "USD",
      });

      // Get portfolio
      const portfolio = await utils.getPortfolio(owner.address);

      expect(portfolio).to.have.lengthOf(1);
      expect(portfolio[0].platform).to.equal("splint_invest");
      expect(portfolio[0].assetId).to.equal("WINE-001");
      expect(parseFloat(portfolio[0].balance)).to.be.closeTo(1000, 0.1);
    });

    it("Should find arbitrage opportunities", async function () {
      const { sdk, utils, oracle } = await loadFixture(deploySystemFixture);

      // Tokenize asset on both platforms
      await sdk.tokenizeAsset({
        platform: "splint_invest",
        assetId: "WINE-001",
        totalSupply: "1000",
        assetType: "wine",
        subcategory: "bordeaux",
        legalHash: ethers.keccak256(ethers.toUtf8Bytes("legal-doc")),
        valuation: "10000",
        sharePrice: "10",
        currency: "USD",
      });

      await sdk.tokenizeAsset({
        platform: "masterworks",
        assetId: "WINE-001",
        totalSupply: "1000",
        assetType: "wine",
        subcategory: "bordeaux",
        legalHash: ethers.keccak256(ethers.toUtf8Bytes("legal-doc")),
        valuation: "10500",
        sharePrice: "10.5",
        currency: "USD",
      });

      // Mock different prices
      await oracle.mockPriceUpdate("splint_invest", "WINE-001", ethers.parseEther("10"));
      await oracle.mockPriceUpdate("masterworks", "WINE-001", ethers.parseEther("10.5"));

      const opportunities = await utils.findArbitrageOpportunities(1);

      expect(opportunities).to.have.lengthOf.greaterThan(0);
      expect(opportunities[0].spreadPercent).to.be.greaterThan(1);
    });
  });

  describe("Retry Mechanism", function () {
    it("Should retry transient failures", async function () {
      const { sdk } = await loadFixture(deploySystemFixture);

      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error("Network error");
        }
        return { success: true };
      };

      const result = await sdk.retryOperation(operation, {
        maxRetries: 3,
        retryDelay: 10,
      });

      expect(result.success).to.be.true;
      expect(attempts).to.equal(3);
    });

    it("Should not retry non-retryable errors", async function () {
      const { sdk } = await loadFixture(deploySystemFixture);

      let attempts = 0;
      const operation = async () => {
        attempts++;
        const error = new LuxBridgeError(
          ErrorCode.ASSET_ALREADY_TOKENIZED,
          "Asset already tokenized"
        );
        throw error;
      };

      try {
        await sdk.retryOperation(operation);
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(error.code).to.equal(ErrorCode.ASSET_ALREADY_TOKENIZED);
        expect(attempts).to.equal(1); // Should not retry
      }
    });
  });
});