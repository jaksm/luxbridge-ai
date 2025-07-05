import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { LuxBridgeAMM, RWATokenFactory, RWA20Token } from "../../typechain-types";

describe("LuxBridgeAMM", function () {
  async function deployAMMFixture() {
    const [owner, alice, bob, charlie] = await ethers.getSigners();

    const LuxBridgeAMM = await ethers.getContractFactory("LuxBridgeAMM");
    const amm = await LuxBridgeAMM.deploy();

    const RWATokenFactory = await ethers.getContractFactory("RWATokenFactory");
    const factory = await RWATokenFactory.deploy();

    await factory.registerPlatform("splint_invest", "https://api.splintinvest.com");
    await factory.registerPlatform("masterworks", "https://api.masterworks.com");

    await factory.connect(alice).tokenizeAsset(
      "splint_invest",
      "WINE-001",
      ethers.parseEther("1000000"),
      "wine",
      ethers.keccak256(ethers.toUtf8Bytes("wine-legal")),
      ethers.parseEther("50000")
    );

    await factory.connect(alice).tokenizeAsset(
      "masterworks",
      "ART-001",
      ethers.parseEther("500000"),
      "art",
      ethers.keccak256(ethers.toUtf8Bytes("art-legal")),
      ethers.parseEther("100000")
    );

    const wineTokenAddress = await factory.getTokenAddress("splint_invest", "WINE-001");
    const artTokenAddress = await factory.getTokenAddress("masterworks", "ART-001");

    const RWA20Token = await ethers.getContractFactory("RWA20Token");
    const wineToken = RWA20Token.attach(wineTokenAddress) as RWA20Token;
    const artToken = RWA20Token.attach(artTokenAddress) as RWA20Token;

    return { 
      amm, 
      factory, 
      owner, 
      alice, 
      bob, 
      charlie, 
      wineToken, 
      artToken,
      wineTokenAddress,
      artTokenAddress
    };
  }

  describe("Pool Management", function () {
    it("Should create a new pool", async function () {
      const { amm, wineToken, artToken } = await loadFixture(deployAMMFixture);

      const tx = await amm.createPool(
        await wineToken.getAddress(),
        await artToken.getAddress(),
        30 // 0.3% fee
      );

      const poolId = await amm.getPoolId(
        await wineToken.getAddress(),
        await artToken.getAddress()
      );

      await expect(tx)
        .to.emit(amm, "PoolCreated")
        .withArgs(
          await wineToken.getAddress() < await artToken.getAddress() 
            ? await wineToken.getAddress() 
            : await artToken.getAddress(),
          await wineToken.getAddress() < await artToken.getAddress() 
            ? await artToken.getAddress() 
            : await wineToken.getAddress(),
          poolId
        );

      const pool = await amm.getPool(poolId);
      expect(pool.isActive).to.be.true;
      expect(pool.swapFee).to.equal(30);
      expect(pool.totalLiquidity).to.equal(0);
    });

    it("Should not create duplicate pools", async function () {
      const { amm, wineToken, artToken } = await loadFixture(deployAMMFixture);

      await amm.createPool(
        await wineToken.getAddress(),
        await artToken.getAddress(),
        30
      );

      await expect(
        amm.createPool(
          await wineToken.getAddress(),
          await artToken.getAddress(),
          50
        )
      ).to.be.revertedWith("Pool exists");
    });

    it("Should not create pools with identical tokens", async function () {
      const { amm, wineToken } = await loadFixture(deployAMMFixture);

      await expect(
        amm.createPool(
          await wineToken.getAddress(),
          await wineToken.getAddress(),
          30
        )
      ).to.be.revertedWith("Identical tokens");
    });
  });

  describe("Liquidity Management", function () {
    async function setupPoolFixture() {
      const fixture = await loadFixture(deployAMMFixture);
      const { amm, wineToken, artToken, alice } = fixture;

      await amm.createPool(
        await wineToken.getAddress(),
        await artToken.getAddress(),
        30
      );

      return { ...fixture };
    }

    it("Should add initial liquidity", async function () {
      const { amm, wineToken, artToken, alice } = await loadFixture(setupPoolFixture);

      const wineAmount = ethers.parseEther("100000");
      const artAmount = ethers.parseEther("50000");

      await wineToken.connect(alice).approve(await amm.getAddress(), wineAmount);
      await artToken.connect(alice).approve(await amm.getAddress(), artAmount);

      const poolId = await amm.getPoolId(
        await wineToken.getAddress(),
        await artToken.getAddress()
      );

      const tx = await amm.connect(alice).addLiquidity(
        await wineToken.getAddress(),
        await artToken.getAddress(),
        wineAmount,
        artAmount,
        wineAmount,
        artAmount
      );

      await expect(tx)
        .to.emit(amm, "LiquidityAdded")
        .withArgs(poolId, alice.address, wineAmount, artAmount, anyValue);

      const pool = await amm.getPool(poolId);
      expect(pool.reserveA).to.be.greaterThan(0);
      expect(pool.reserveB).to.be.greaterThan(0);
      expect(pool.totalLiquidity).to.be.greaterThan(0);
    });

    it("Should add subsequent liquidity proportionally", async function () {
      const { amm, wineToken, artToken, alice, bob } = await loadFixture(setupPoolFixture);

      const initialWineAmount = ethers.parseEther("100000");
      const initialArtAmount = ethers.parseEther("50000");

      await wineToken.connect(alice).approve(await amm.getAddress(), initialWineAmount);
      await artToken.connect(alice).approve(await amm.getAddress(), initialArtAmount);

      await amm.connect(alice).addLiquidity(
        await wineToken.getAddress(),
        await artToken.getAddress(),
        initialWineAmount,
        initialArtAmount,
        initialWineAmount,
        initialArtAmount
      );

      await wineToken.connect(alice).transfer(bob.address, ethers.parseEther("50000"));
      await artToken.connect(alice).transfer(bob.address, ethers.parseEther("25000"));

      const additionalWineAmount = ethers.parseEther("50000");
      const additionalArtAmount = ethers.parseEther("25000");

      await wineToken.connect(bob).approve(await amm.getAddress(), additionalWineAmount);
      await artToken.connect(bob).approve(await amm.getAddress(), additionalArtAmount);

      await expect(
        amm.connect(bob).addLiquidity(
          await wineToken.getAddress(),
          await artToken.getAddress(),
          additionalWineAmount,
          additionalArtAmount,
          additionalWineAmount,
          additionalArtAmount
        )
      ).to.not.be.reverted;
    });

    it("Should remove liquidity", async function () {
      const { amm, wineToken, artToken, alice } = await loadFixture(setupPoolFixture);

      const wineAmount = ethers.parseEther("100000");
      const artAmount = ethers.parseEther("50000");

      await wineToken.connect(alice).approve(await amm.getAddress(), wineAmount);
      await artToken.connect(alice).approve(await amm.getAddress(), artAmount);

      await amm.connect(alice).addLiquidity(
        await wineToken.getAddress(),
        await artToken.getAddress(),
        wineAmount,
        artAmount,
        wineAmount,
        artAmount
      );

      const poolId = await amm.getPoolId(
        await wineToken.getAddress(),
        await artToken.getAddress()
      );

      const liquidityBalance = await amm.liquidityBalances(poolId, alice.address);
      const halfLiquidity = liquidityBalance / 2n;

      const tx = await amm.connect(alice).removeLiquidity(
        await wineToken.getAddress(),
        await artToken.getAddress(),
        halfLiquidity,
        0,
        0
      );

      await expect(tx)
        .to.emit(amm, "LiquidityRemoved")
        .withArgs(poolId, alice.address, anyValue, anyValue, halfLiquidity);
    });
  });

  describe("Swapping", function () {
    async function setupLiquidityFixture() {
      const fixture = await loadFixture(deployAMMFixture);
      const { amm, wineToken, artToken, alice, bob } = fixture;

      await amm.createPool(
        await wineToken.getAddress(),
        await artToken.getAddress(),
        30
      );

      const wineAmount = ethers.parseEther("100000");
      const artAmount = ethers.parseEther("50000");

      await wineToken.connect(alice).approve(await amm.getAddress(), wineAmount);
      await artToken.connect(alice).approve(await amm.getAddress(), artAmount);

      await amm.connect(alice).addLiquidity(
        await wineToken.getAddress(),
        await artToken.getAddress(),
        wineAmount,
        artAmount,
        wineAmount,
        artAmount
      );

      await wineToken.connect(alice).transfer(bob.address, ethers.parseEther("10000"));

      return { ...fixture };
    }

    it("Should perform a swap", async function () {
      const { amm, wineToken, artToken, bob } = await loadFixture(setupLiquidityFixture);

      const swapAmount = ethers.parseEther("1000");
      
      await wineToken.connect(bob).approve(await amm.getAddress(), swapAmount);

      const expectedAmountOut = await amm.getAmountOut(
        await wineToken.getAddress(),
        await artToken.getAddress(),
        swapAmount
      );

      const poolId = await amm.getPoolId(
        await wineToken.getAddress(),
        await artToken.getAddress()
      );

      const tx = await amm.connect(bob).swap(
        await wineToken.getAddress(),
        await artToken.getAddress(),
        swapAmount,
        0
      );

      await expect(tx)
        .to.emit(amm, "Swap")
        .withArgs(
          poolId,
          bob.address,
          await wineToken.getAddress(),
          await artToken.getAddress(),
          swapAmount,
          expectedAmountOut
        );

      const bobArtBalance = await artToken.balanceOf(bob.address);
      expect(bobArtBalance).to.equal(expectedAmountOut);
    });

    it("Should revert swap with insufficient output", async function () {
      const { amm, wineToken, artToken, bob } = await loadFixture(setupLiquidityFixture);

      const swapAmount = ethers.parseEther("1000");
      const minAmountOut = ethers.parseEther("10000"); // Unrealistic expectation
      
      await wineToken.connect(bob).approve(await amm.getAddress(), swapAmount);

      await expect(
        amm.connect(bob).swap(
          await wineToken.getAddress(),
          await artToken.getAddress(),
          swapAmount,
          minAmountOut
        )
      ).to.be.revertedWith("Insufficient output");
    });

    it("Should calculate correct swap amounts", async function () {
      const { amm, wineToken, artToken } = await loadFixture(setupLiquidityFixture);

      const swapAmount = ethers.parseEther("1000");
      
      const expectedAmountOut = await amm.getAmountOut(
        await wineToken.getAddress(),
        await artToken.getAddress(),
        swapAmount
      );

      expect(expectedAmountOut).to.be.greaterThan(0);
      expect(expectedAmountOut).to.be.lessThan(swapAmount); // Due to different pool ratios
    });
  });

  describe("Route Finding", function () {
    it("Should find direct route between tokens", async function () {
      const { amm, wineToken, artToken, alice } = await loadFixture(deployAMMFixture);

      await amm.createPool(
        await wineToken.getAddress(),
        await artToken.getAddress(),
        30
      );

      const wineAmount = ethers.parseEther("100000");
      const artAmount = ethers.parseEther("50000");

      await wineToken.connect(alice).approve(await amm.getAddress(), wineAmount);
      await artToken.connect(alice).approve(await amm.getAddress(), artAmount);

      await amm.connect(alice).addLiquidity(
        await wineToken.getAddress(),
        await artToken.getAddress(),
        wineAmount,
        artAmount,
        wineAmount,
        artAmount
      );

      const route = await amm.findBestRoute(
        await wineToken.getAddress(),
        await artToken.getAddress(),
        ethers.parseEther("1000")
      );

      expect(route.path.length).to.equal(2);
      expect(route.path[0]).to.equal(await wineToken.getAddress());
      expect(route.path[1]).to.equal(await artToken.getAddress());
      expect(route.totalAmountOut).to.be.greaterThan(0);
    });

    it("Should return empty route for non-existent pool", async function () {
      const { amm, wineToken, artToken } = await loadFixture(deployAMMFixture);

      const route = await amm.findBestRoute(
        await wineToken.getAddress(),
        await artToken.getAddress(),
        ethers.parseEther("1000")
      );

      expect(route.path.length).to.equal(0);
      expect(route.totalAmountOut).to.equal(0);
    });
  });

  describe("Fee Management", function () {
    it("Should set default swap fee", async function () {
      const { amm, owner } = await loadFixture(deployAMMFixture);

      await amm.connect(owner).setDefaultSwapFee(50); // 0.5%

      expect(await amm.defaultSwapFee()).to.equal(50);
    });

    it("Should not allow fees above maximum", async function () {
      const { amm, owner } = await loadFixture(deployAMMFixture);

      await expect(
        amm.connect(owner).setDefaultSwapFee(1001) // 10.01%
      ).to.be.revertedWith("Fee too high");
    });

    it("Should only allow owner to change fees", async function () {
      const { amm, alice } = await loadFixture(deployAMMFixture);

      await expect(
        amm.connect(alice).setDefaultSwapFee(50)
      ).to.be.revertedWithCustomError(amm, "OwnableUnauthorizedAccount");
    });
  });
});
