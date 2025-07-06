import { ethers } from "hardhat";

async function testDirectContractCall() {
  console.log("🔧 Testing direct contract calls...");

  try {
    const [deployer] = await ethers.getSigners();

    // Deploy RWATokenFactory
    const RWATokenFactory = await ethers.getContractFactory("RWATokenFactory");
    const factory = await RWATokenFactory.deploy();
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    console.log(`✅ RWATokenFactory: ${factoryAddress}`);

    // Deploy oracle (simplified)
    const LuxBridgePriceOracle = await ethers.getContractFactory(
      "LuxBridgePriceOracle",
    );
    const oracle = await LuxBridgePriceOracle.deploy(
      deployer.address,
      ethers.keccak256(ethers.toUtf8Bytes("test")),
      1,
      300000,
    );
    await oracle.waitForDeployment();
    const oracleAddress = await oracle.getAddress();
    console.log(`✅ Oracle: ${oracleAddress}`);

    // Set oracle
    await factory.setPriceOracle(oracleAddress);
    console.log("✅ Oracle set");

    // Register platform
    const tx = await factory.registerPlatform(
      "test_platform",
      "https://test.api",
    );
    await tx.wait();
    console.log("✅ Platform registered");

    // Try to tokenize with minimal parameters
    console.log("\n🧪 Testing tokenization...");
    try {
      const tokenizeTx = await factory.tokenizeAsset(
        "test_platform",
        "TEST-001",
        ethers.parseEther("1000"),
        "wine",
        "test",
        ethers.ZeroHash,
        ethers.parseEther("100000"),
        ethers.parseEther("100"),
        "USD",
      );

      const receipt = await tokenizeTx.wait();
      console.log("✅ Tokenization successful!");
      console.log(`Gas used: ${receipt?.gasUsed}`);

      // Get token address
      const tokenAddress = await factory.getTokenAddress(
        "test_platform",
        "TEST-001",
      );
      console.log(`Token address: ${tokenAddress}`);
    } catch (error) {
      console.log("❌ Tokenization failed:", error);

      // Try to get more detailed error
      try {
        console.log("\n🔍 Testing with static call...");
        await factory.tokenizeAsset.staticCall(
          "test_platform",
          "TEST-001",
          ethers.parseEther("1000"),
          "wine",
          "test",
          ethers.ZeroHash,
          ethers.parseEther("100000"),
          ethers.parseEther("100"),
          "USD",
        );
        console.log("✅ Static call succeeded");
      } catch (staticError) {
        console.log("❌ Static call failed:", staticError);
      }
    }

    // Test platform info
    console.log("\n🔍 Testing platform info...");
    try {
      const platformInfo = await factory.getPlatformInfo("test_platform");
      console.log("✅ Platform info:", {
        name: platformInfo.name,
        isActive: platformInfo.isActive,
        totalAssets: platformInfo.totalAssetsTokenized.toString(),
      });
    } catch (error) {
      console.log("❌ Platform info failed:", error);
    }
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testDirectContractCall();
