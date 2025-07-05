import { ethers } from "hardhat";
import deployFactory from "./01-deploy-factory";
import deployAMM from "./02-deploy-amm";
import deployOracle from "./03-deploy-oracle";

async function main() {
  console.log("🚀 Deploying Complete LuxBridge System...");
  console.log("=====================================");

  const [deployer] = await ethers.getSigners();
  const aiAgent = deployer; // Use deployer as AI agent for testnet

  // Deploy all contracts
  const factoryResult = await deployFactory();
  const ammResult = await deployAMM();
  const oracleResult = await deployOracle();

  console.log("\n📋 Connecting contracts...");

  // Get contract instances
  const factory = await ethers.getContractAt(
    "RWATokenFactory",
    factoryResult.factory,
  );
  const amm = await ethers.getContractAt("LuxBridgeAMM", ammResult.amm);
  const oracle = await ethers.getContractAt(
    "LuxBridgePriceOracle",
    oracleResult.oracle,
  );

  // Connect factory to oracle
  await factory.setPriceOracle(oracleResult.oracle);
  console.log("✓ Connected factory to oracle");

  // Deploy automation contract
  console.log("\n🤖 Deploying automation contract...");
  const LuxBridgeAutomation = await ethers.getContractFactory(
    "LuxBridgeAutomation",
  );
  const automation = await LuxBridgeAutomation.deploy(
    ammResult.amm,
    factoryResult.factory,
    aiAgent.address,
  );
  await automation.waitForDeployment();
  console.log(
    "LuxBridgeAutomation deployed to:",
    await automation.getAddress(),
  );

  // Set up some demo assets
  console.log("\n🍷 Creating demo assets...");

  await factory.tokenizeAsset(
    "splint_invest",
    "BORDEAUX-2019",
    ethers.parseEther("1000000"),
    "wine",
    ethers.keccak256(ethers.toUtf8Bytes("bordeaux-legal-doc")),
    ethers.parseEther("100000"),
  );
  console.log("✓ Created Bordeaux 2019 wine asset");

  await factory.tokenizeAsset(
    "masterworks",
    "PICASSO-042",
    ethers.parseEther("500000"),
    "art",
    ethers.keccak256(ethers.toUtf8Bytes("picasso-legal-doc")),
    ethers.parseEther("200000"),
  );
  console.log("✓ Created Picasso artwork asset");

  await factory.tokenizeAsset(
    "realt",
    "DETROIT-HOUSE-001",
    ethers.parseEther("100000"),
    "real_estate",
    ethers.keccak256(ethers.toUtf8Bytes("detroit-house-legal")),
    ethers.parseEther("50000"),
  );
  console.log("✓ Created Detroit house real estate asset");

  // Create AMM pools
  console.log("\n💧 Setting up liquidity pools...");

  const wineTokenAddress = await factory.getTokenAddress(
    "splint_invest",
    "BORDEAUX-2019",
  );
  const artTokenAddress = await factory.getTokenAddress(
    "masterworks",
    "PICASSO-042",
  );
  const realEstateTokenAddress = await factory.getTokenAddress(
    "realt",
    "DETROIT-HOUSE-001",
  );

  await amm.createPool(wineTokenAddress, artTokenAddress, 30);
  console.log("✓ Created Wine-Art pool");

  await amm.createPool(wineTokenAddress, realEstateTokenAddress, 30);
  console.log("✓ Created Wine-RealEstate pool");

  await amm.createPool(artTokenAddress, realEstateTokenAddress, 30);
  console.log("✓ Created Art-RealEstate pool");

  // Add initial liquidity
  console.log("\n💰 Adding initial liquidity...");

  const wineToken = await ethers.getContractAt("RWA20Token", wineTokenAddress);
  const artToken = await ethers.getContractAt("RWA20Token", artTokenAddress);
  const realEstateToken = await ethers.getContractAt(
    "RWA20Token",
    realEstateTokenAddress,
  );

  // Approve AMM to spend tokens
  await wineToken.approve(ammResult.amm, ethers.parseEther("100000"));
  await artToken.approve(ammResult.amm, ethers.parseEther("50000"));
  await realEstateToken.approve(ammResult.amm, ethers.parseEther("20000"));

  // Add liquidity to Wine-Art pool
  await amm.addLiquidity(
    wineTokenAddress,
    artTokenAddress,
    ethers.parseEther("100000"), // 100k wine tokens
    ethers.parseEther("50000"), // 50k art tokens
    ethers.parseEther("90000"), // min wine
    ethers.parseEther("45000"), // min art
  );
  console.log("✓ Added liquidity to Wine-Art pool");

  // System deployment summary
  console.log("\n🎉 LuxBridge System Deployment Complete!");
  console.log("=========================================");
  console.log("📍 Contract Addresses:");
  console.log("   RWATokenFactory:", factoryResult.factory);
  console.log("   LuxBridgeAMM:", ammResult.amm);
  console.log("   LuxBridgePriceOracle:", oracleResult.oracle);
  console.log("   LuxBridgeAutomation:", await automation.getAddress());
  console.log("\n🏛️ Platform Assets:");
  console.log("   Wine Token (BORDEAUX-2019):", wineTokenAddress);
  console.log("   Art Token (PICASSO-042):", artTokenAddress);
  console.log(
    "   Real Estate Token (DETROIT-HOUSE-001):",
    realEstateTokenAddress,
  );
  console.log("\n👥 Key Accounts:");
  console.log("   Deployer:", deployer.address);
  console.log("   AI Agent:", aiAgent.address);
  console.log("\n🔧 Next Steps:");
  console.log("   1. Run tests: npm run blockchain:test");
  console.log("   2. Start local node: npm run blockchain:node");
  console.log("   3. Deploy subgraph for indexing");
  console.log("   4. Configure MCP server integration");

  return {
    factory: factoryResult.factory,
    amm: ammResult.amm,
    oracle: oracleResult.oracle,
    automation: await automation.getAddress(),
    tokens: {
      wine: wineTokenAddress,
      art: artTokenAddress,
      realEstate: realEstateTokenAddress,
    },
    deployer: deployer.address,
    aiAgent: aiAgent.address,
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
