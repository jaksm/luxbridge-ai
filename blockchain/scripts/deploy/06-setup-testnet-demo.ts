import { ethers } from "hardhat";

// Deployed contract addresses on Zircuit testnet
const DEPLOYED_ADDRESSES = {
  factory: "0x6E52943b3Be391f7245f5f3c8F8A16238aEC8F3B",
  amm: "0xa59F5257cFf701aEc174425dBcEa1Ce4C94704EE",
  oracle: "0xdb38b00cb3052ED861C2782787700539d08F8F99",
  automation: "0x20D527BB5a9601bBd8750567a020dcdC6c7D8b0b",
};

async function main() {
  console.log("🚀 Setting up LuxBridge Testnet Demo...");
  console.log("=====================================");

  const [deployer] = await ethers.getSigners();
  console.log("Setting up with account:", deployer.address);

  // Get contract instances
  const factory = await ethers.getContractAt(
    "RWATokenFactory",
    DEPLOYED_ADDRESSES.factory,
  );
  const amm = await ethers.getContractAt(
    "LuxBridgeAMM",
    DEPLOYED_ADDRESSES.amm,
  );
  const oracle = await ethers.getContractAt(
    "LuxBridgePriceOracle",
    DEPLOYED_ADDRESSES.oracle,
  );

  console.log("\n📋 Connecting contracts...");

  // Connect factory to oracle
  try {
    await factory.setPriceOracle(DEPLOYED_ADDRESSES.oracle);
    console.log("✓ Connected factory to oracle");
  } catch (error: any) {
    console.log(
      "⚠️ Factory-Oracle connection may already exist:",
      error.message,
    );
  }

  // Set up demo assets
  console.log("\n🍷 Creating demo assets...");

  const demoAssets = [
    {
      platform: "splint_invest",
      assetId: "BORDEAUX-2019",
      totalSupply: ethers.parseEther("1000000"),
      assetType: "wine",
      subcategory: "bordeaux",
      valuation: ethers.parseEther("100000"),
      sharePrice: ethers.parseEther("100"),
    },
    {
      platform: "masterworks",
      assetId: "PICASSO-042",
      totalSupply: ethers.parseEther("500000"),
      assetType: "art",
      subcategory: "classic",
      valuation: ethers.parseEther("200000"),
      sharePrice: ethers.parseEther("400"),
    },
    {
      platform: "realt",
      assetId: "DETROIT-HOUSE-001",
      totalSupply: ethers.parseEther("100000"),
      assetType: "real_estate",
      subcategory: "residential",
      valuation: ethers.parseEther("50000"),
      sharePrice: ethers.parseEther("500"),
    },
  ];

  const tokenAddresses: string[] = [];

  for (const asset of demoAssets) {
    try {
      // Check if asset already exists
      const tokenAddress = await factory.getTokenAddress(
        asset.platform,
        asset.assetId,
      );
      console.log(`✓ Asset ${asset.assetId} already exists at ${tokenAddress}`);
      tokenAddresses.push(tokenAddress);
    } catch (error) {
      // Asset doesn't exist, create it
      try {
        await factory.tokenizeAsset(
          asset.platform,
          asset.assetId,
          asset.totalSupply,
          asset.assetType,
          asset.subcategory,
          ethers.keccak256(ethers.toUtf8Bytes(`${asset.assetId}-legal-doc`)),
          asset.valuation,
          asset.sharePrice,
          "USD",
        );

        const tokenAddress = await factory.getTokenAddress(
          asset.platform,
          asset.assetId,
        );
        console.log(`✓ Created ${asset.assetId} asset at ${tokenAddress}`);
        tokenAddresses.push(tokenAddress);
      } catch (createError: any) {
        console.log(
          `❌ Failed to create ${asset.assetId}:`,
          createError.message,
        );
      }
    }
  }

  // Create AMM pools
  if (tokenAddresses.length >= 2) {
    console.log("\n💧 Setting up liquidity pools...");

    const poolConfigs = [
      { tokenA: tokenAddresses[0], tokenB: tokenAddresses[1], fee: 30 }, // Wine-Art
      { tokenA: tokenAddresses[0], tokenB: tokenAddresses[2], fee: 30 }, // Wine-RealEstate
      { tokenA: tokenAddresses[1], tokenB: tokenAddresses[2], fee: 30 }, // Art-RealEstate
    ];

    for (const config of poolConfigs) {
      if (config.tokenB) {
        try {
          // Check if pool already exists
          const poolId = await amm.getPoolId(config.tokenA, config.tokenB);
          console.log(`✓ Pool already exists with ID: ${poolId}`);
        } catch (error) {
          // Pool doesn't exist, create it
          try {
            await amm.createPool(config.tokenA, config.tokenB, config.fee);
            const poolId = await amm.getPoolId(config.tokenA, config.tokenB);
            console.log(`✓ Created pool with ID: ${poolId}`);
          } catch (createError: any) {
            console.log(`❌ Failed to create pool:`, createError.message);
          }
        }
      }
    }

    // Add initial liquidity
    console.log("\n💰 Adding initial liquidity...");

    if (tokenAddresses.length >= 2) {
      try {
        // Get token contracts
        const token0 = await ethers.getContractAt(
          "RWA20Token",
          tokenAddresses[0],
        );
        const token1 = await ethers.getContractAt(
          "RWA20Token",
          tokenAddresses[1],
        );

        // Check balances
        const balance0 = await token0.balanceOf(deployer.address);
        const balance1 = await token1.balanceOf(deployer.address);

        console.log(`Token0 balance: ${ethers.formatEther(balance0)}`);
        console.log(`Token1 balance: ${ethers.formatEther(balance1)}`);

        if (balance0 > 0 && balance1 > 0) {
          // Approve AMM to spend tokens
          const amount0 = ethers.parseEther("10000"); // 10K tokens
          const amount1 = ethers.parseEther("5000"); // 5K tokens

          await token0.approve(DEPLOYED_ADDRESSES.amm, amount0);
          await token1.approve(DEPLOYED_ADDRESSES.amm, amount1);

          // Add liquidity
          await amm.addLiquidity(
            tokenAddresses[0],
            tokenAddresses[1],
            amount0,
            amount1,
            ethers.parseEther("9000"), // min amount0
            ethers.parseEther("4500"), // min amount1
          );

          console.log("✓ Added initial liquidity to Wine-Art pool");
        } else {
          console.log("⚠️ Insufficient token balances to add liquidity");
        }
      } catch (error: any) {
        console.log("❌ Failed to add liquidity:", error.message);
      }
    }
  }

  // Final deployment summary
  console.log("\n🎉 LuxBridge Testnet Setup Complete!");
  console.log("====================================");
  console.log("🌐 Network: Zircuit Testnet (Chain ID: 48898)");
  console.log("📍 Contract Addresses:");
  console.log("   RWATokenFactory:", DEPLOYED_ADDRESSES.factory);
  console.log("   LuxBridgeAMM:", DEPLOYED_ADDRESSES.amm);
  console.log("   LuxBridgePriceOracle:", DEPLOYED_ADDRESSES.oracle);
  console.log("   LuxBridgeAutomation:", DEPLOYED_ADDRESSES.automation);

  if (tokenAddresses.length > 0) {
    console.log("\n🏛️ Demo Assets:");
    const assetNames = [
      "Wine (BORDEAUX-2019)",
      "Art (PICASSO-042)",
      "Real Estate (DETROIT-HOUSE-001)",
    ];
    tokenAddresses.forEach((address, i) => {
      if (assetNames[i]) {
        console.log(`   ${assetNames[i]}: ${address}`);
      }
    });
  }

  console.log("\n👥 Key Accounts:");
  console.log("   Deployer/AI Agent:", deployer.address);

  console.log("\n🔗 Explorer Links:");
  console.log(
    "   Factory: https://explorer.zircuit.com/address/" +
      DEPLOYED_ADDRESSES.factory,
  );
  console.log(
    "   AMM: https://explorer.zircuit.com/address/" + DEPLOYED_ADDRESSES.amm,
  );
  console.log(
    "   Oracle: https://explorer.zircuit.com/address/" +
      DEPLOYED_ADDRESSES.oracle,
  );
  console.log(
    "   Automation: https://explorer.zircuit.com/address/" +
      DEPLOYED_ADDRESSES.automation,
  );

  console.log("\n🔧 Next Steps:");
  console.log("   1. Update MCP server config with testnet addresses");
  console.log("   2. Test blockchain tools against testnet");
  console.log("   3. Verify contracts on Zircuit explorer");
  console.log("   4. Test end-to-end trading flows");

  return {
    network: "zircuit",
    chainId: 48898,
    contracts: DEPLOYED_ADDRESSES,
    tokens: tokenAddresses,
    deployer: deployer.address,
  };
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default main;
