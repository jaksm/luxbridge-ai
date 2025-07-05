import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { RWATokenFactory, RWA20Token } from "../../typechain-types";

describe("RWATokenFactory", function () {
  async function deployFactoryFixture() {
    const [owner, alice, bob] = await ethers.getSigners();

    const RWATokenFactory = await ethers.getContractFactory("RWATokenFactory");
    const factory = await RWATokenFactory.deploy();

    return { factory, owner, alice, bob };
  }

  describe("Platform Management", function () {
    it("Should register a new platform", async function () {
      const { factory, owner } = await loadFixture(deployFactoryFixture);

      await factory.registerPlatform(
        "splint_invest",
        "https://mock-api.luxbridge.local/splint",
      );

      const platformInfo = await factory.getPlatformInfo("splint_invest");
      expect(platformInfo.name).to.equal("splint_invest");
      expect(platformInfo.apiEndpoint).to.equal("https://mock-api.luxbridge.local/splint");
      expect(platformInfo.isActive).to.be.true;
      expect(platformInfo.totalAssetsTokenized).to.equal(0);
    });

    it("Should not allow duplicate platform registration", async function () {
      const { factory } = await loadFixture(deployFactoryFixture);

      await factory.registerPlatform(
        "splint_invest",
        "https://mock-api.luxbridge.local/splint",
      );

      await expect(
        factory.registerPlatform(
          "splint_invest",
          "https://mock-api.luxbridge.local/splint",
        ),
      ).to.be.revertedWith("Platform exists");
    });

    it("Should only allow owner to register platforms", async function () {
      const { factory, alice } = await loadFixture(deployFactoryFixture);

      await expect(
        factory
          .connect(alice)
          .registerPlatform("masterworks", "https://mock-api.luxbridge.local/masterworks"),
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });
  });

  describe("Asset Tokenization", function () {
    async function setupPlatformsFixture() {
      const { factory, owner, alice, bob } =
        await loadFixture(deployFactoryFixture);

      await factory.registerPlatform(
        "splint_invest",
        "https://mock-api.luxbridge.local/splint",
      );
      await factory.registerPlatform(
        "masterworks",
        "https://mock-api.luxbridge.local/masterworks",
      );

      return { factory, owner, alice, bob };
    }

    it("Should tokenize an asset successfully", async function () {
      const { factory, alice } = await loadFixture(setupPlatformsFixture);

      const tx = await factory
        .connect(alice)
        .tokenizeAsset(
          "splint_invest",
          "BORDEAUX-2019",
          ethers.parseEther("1000000"),
          "wine",
          "bordeaux",
          ethers.keccak256(ethers.toUtf8Bytes("legal-doc-hash")),
          ethers.parseEther("50000"),
          ethers.parseEther("50"),
          "USD"
        );

      const tokenAddress = await factory.getTokenAddress(
        "splint_invest",
        "BORDEAUX-2019",
      );

      await expect(tx)
        .to.emit(factory, "AssetTokenized")
        .withArgs(
          "splint_invest",
          "BORDEAUX-2019",
          tokenAddress,
          ethers.parseEther("1000000"),
          ethers.parseEther("50000"),
        );
      expect(tokenAddress).to.not.equal(ethers.ZeroAddress);

      const metadata = await factory.getAssetMetadata(
        "splint_invest",
        "BORDEAUX-2019",
      );
      expect(metadata.platform).to.equal("splint_invest");
      expect(metadata.assetId).to.equal("BORDEAUX-2019");
      expect(metadata.totalSupply).to.equal(ethers.parseEther("1000000"));
      expect(metadata.assetType).to.equal("wine");
      expect(metadata.lastValuation).to.equal(ethers.parseEther("50000"));
    });

    it("Should not tokenize asset from unregistered platform", async function () {
      const { factory, alice } = await loadFixture(setupPlatformsFixture);

      await expect(
        factory
          .connect(alice)
          .tokenizeAsset(
            "unknown_platform",
            "ASSET-001",
            ethers.parseEther("1000"),
            "art",
            "classic",
            ethers.keccak256(ethers.toUtf8Bytes("hash")),
            ethers.parseEther("1000"),
            ethers.parseEther("100"),
            "USD"
          ),
      ).to.be.revertedWith("Platform not registered");
    });

    it("Should not allow duplicate asset tokenization", async function () {
      const { factory, alice } = await loadFixture(setupPlatformsFixture);

      await factory
        .connect(alice)
        .tokenizeAsset(
          "splint_invest",
          "BORDEAUX-2019",
          ethers.parseEther("1000000"),
          "wine",
          "bordeaux",
          ethers.keccak256(ethers.toUtf8Bytes("legal-doc-hash")),
          ethers.parseEther("50000"),
          ethers.parseEther("50"),
          "USD"
        );

      await expect(
        factory
          .connect(alice)
          .tokenizeAsset(
            "splint_invest",
            "BORDEAUX-2019",
            ethers.parseEther("500000"),
            "wine",
            "bordeaux",
            ethers.keccak256(ethers.toUtf8Bytes("legal-doc-hash-2")),
            ethers.parseEther("25000"),
            ethers.parseEther("100"),
            "USD"
          ),
      ).to.be.revertedWith("Asset already tokenized");
    });

    it("Should batch tokenize multiple assets", async function () {
      const { factory, alice } = await loadFixture(setupPlatformsFixture);

      const platforms = ["splint_invest", "masterworks"];
      const assetIds = ["WINE-001", "ART-001"];
      const totalSupplies = [
        ethers.parseEther("1000"),
        ethers.parseEther("2000"),
      ];
      const assetTypes = ["wine", "art"];
      const legalHashes = [
        ethers.keccak256(ethers.toUtf8Bytes("wine-legal")),
        ethers.keccak256(ethers.toUtf8Bytes("art-legal")),
      ];
      const valuations = [
        ethers.parseEther("10000"),
        ethers.parseEther("20000"),
      ];

      const tx1 = await factory
        .connect(alice)
        .tokenizeAsset(
          platforms[0],
          assetIds[0],
          totalSupplies[0],
          assetTypes[0],
          "bordeaux", // subcategory
          legalHashes[0],
          valuations[0],
          ethers.parseEther("100"), // sharePrice
          "USD", // currency
        );

      const tx2 = await factory
        .connect(alice)
        .tokenizeAsset(
          platforms[1],
          assetIds[1],
          totalSupplies[1],
          assetTypes[1],
          "classic", // subcategory for art
          legalHashes[1],
          valuations[1],
          ethers.parseEther("200"), // sharePrice
          "USD", // currency
        );

      await tx1.wait();
      await tx2.wait();

      const wineTokenAddress = await factory.getTokenAddress(
        "splint_invest",
        "WINE-001",
      );
      const artTokenAddress = await factory.getTokenAddress(
        "masterworks",
        "ART-001",
      );

      expect(wineTokenAddress).to.not.equal(ethers.ZeroAddress);
      expect(artTokenAddress).to.not.equal(ethers.ZeroAddress);
    });
  });

  describe("Token Burning", function () {
    async function setupWithTokensFixture() {
      const { factory, owner, alice, bob } =
        await loadFixture(deployFactoryFixture);

      await factory.registerPlatform(
        "splint_invest",
        "https://mock-api.luxbridge.local/splint",
      );

      await factory
        .connect(alice)
        .tokenizeAsset(
          "splint_invest",
          "BORDEAUX-2019",
          ethers.parseEther("1000000"),
          "wine",
          "bordeaux",
          ethers.keccak256(ethers.toUtf8Bytes("legal-doc-hash")),
          ethers.parseEther("50000"),
          ethers.parseEther("50"),
          "USD"
        );

      const tokenAddress = await factory.getTokenAddress(
        "splint_invest",
        "BORDEAUX-2019",
      );
      const RWA20Token = await ethers.getContractFactory("RWA20Token");
      const token = RWA20Token.attach(tokenAddress) as RWA20Token;

      return { factory, owner, alice, bob, token, tokenAddress };
    }

    it("Should burn tokens successfully", async function () {
      const { factory, alice, token } = await loadFixture(
        setupWithTokensFixture,
      );

      const burnAmount = ethers.parseEther("100000");

      await token.connect(alice).approve(factory.getAddress(), burnAmount);

      const tx = await factory
        .connect(alice)
        .burnTokens("splint_invest", "BORDEAUX-2019", burnAmount);

      await expect(tx)
        .to.emit(factory, "AssetBurned")
        .withArgs("splint_invest", "BORDEAUX-2019", alice.address, burnAmount);

      const newTotalSupply = await token.totalSupply();
      expect(newTotalSupply).to.equal(ethers.parseEther("900000"));
    });

    it("Should not burn tokens for non-existent asset", async function () {
      const { factory, alice } = await loadFixture(setupWithTokensFixture);

      await expect(
        factory
          .connect(alice)
          .burnTokens(
            "splint_invest",
            "NON-EXISTENT",
            ethers.parseEther("1000"),
          ),
      ).to.be.revertedWith("Token not found");
    });
  });

  describe("Valuation Updates", function () {
    async function setupTokensWithOracleFixture() {
      const { factory, owner, alice, bob } =
        await loadFixture(deployFactoryFixture);

      await factory.registerPlatform(
        "splint_invest",
        "https://mock-api.luxbridge.local/splint",
      );

      await factory
        .connect(alice)
        .tokenizeAsset(
          "splint_invest",
          "BORDEAUX-2019",
          ethers.parseEther("1000000"),
          "wine",
          "bordeaux",
          ethers.keccak256(ethers.toUtf8Bytes("legal-doc-hash")),
          ethers.parseEther("50000"),
          ethers.parseEther("50"),
          "USD"
        );

      const tokenAddress = await factory.getTokenAddress(
        "splint_invest",
        "BORDEAUX-2019",
      );
      const RWA20Token = await ethers.getContractFactory("RWA20Token");
      const token = RWA20Token.attach(tokenAddress) as RWA20Token;

      await factory.setPriceOracle(owner.address);

      return { factory, owner, alice, bob, token, tokenAddress };
    }

    it("Should update asset valuation", async function () {
      const { factory, owner, token } = await loadFixture(
        setupTokensWithOracleFixture,
      );

      const newValuation = ethers.parseEther("60000");

      const tx = await factory
        .connect(owner)
        .updateValuation("splint_invest", "BORDEAUX-2019", newValuation);

      await expect(tx)
        .to.emit(factory, "ValuationUpdated")
        .withArgs(
          "splint_invest",
          "BORDEAUX-2019",
          ethers.parseEther("50000"),
          newValuation,
          await ethers.provider.getBlock("latest").then((b) => b?.timestamp),
        );

      const metadata = await factory.getAssetMetadata(
        "splint_invest",
        "BORDEAUX-2019",
      );
      expect(metadata.lastValuation).to.equal(newValuation);
    });

    it("Should only allow oracle to update valuations", async function () {
      const { factory, alice } = await loadFixture(
        setupTokensWithOracleFixture,
      );

      await expect(
        factory
          .connect(alice)
          .updateValuation(
            "splint_invest",
            "BORDEAUX-2019",
            ethers.parseEther("60000"),
          ),
      ).to.be.revertedWith("Only oracle");
    });
  });

  describe("Asset Verification", function () {
    it("Should verify asset backing with proof", async function () {
      const { factory, alice } = await loadFixture(deployFactoryFixture);

      await factory.registerPlatform(
        "splint_invest",
        "https://mock-api.luxbridge.local/splint",
      );

      await factory
        .connect(alice)
        .tokenizeAsset(
          "splint_invest",
          "BORDEAUX-2019",
          ethers.parseEther("1000000"),
          "wine",
          "bordeaux",
          ethers.keccak256(ethers.toUtf8Bytes("legal-doc-hash")),
          ethers.parseEther("50000"),
          ethers.parseEther("50"),
          "USD"
        );

      const proof = ethers.toUtf8Bytes("cryptographic-proof-data");
      const isValid = await factory.verifyAssetBacking(
        "splint_invest",
        "BORDEAUX-2019",
        proof,
      );

      expect(isValid).to.be.true;
    });

    it("Should return false for non-existent asset", async function () {
      const { factory } = await loadFixture(deployFactoryFixture);

      const proof = ethers.toUtf8Bytes("proof");
      const isValid = await factory.verifyAssetBacking(
        "splint_invest",
        "NON-EXISTENT",
        proof,
      );

      expect(isValid).to.be.false;
    });
  });
});
