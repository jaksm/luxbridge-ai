import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

export interface DeployedContracts {
  factory: string;
  amm: string;
  oracle: string;
  automation: string;
  deployer: string;
  chainId: number;
  blockNumber: number;
}

export async function setupLocalChain(): Promise<DeployedContracts> {
  console.log("🚀 Setting up local blockchain test environment...");

  const [deployer, user1, user2, aiAgent] = await ethers.getSigners();

  console.log("📋 Deploying contracts...");
  console.log(`Deployer: ${deployer.address}`);
  console.log(`User1: ${user1.address}`);
  console.log(`User2: ${user2.address}`);
  console.log(`AI Agent: ${aiAgent.address}`);

  // Deploy RWATokenFactory
  console.log("\n1️⃣ Deploying RWATokenFactory...");
  const RWATokenFactory = await ethers.getContractFactory("RWATokenFactory");
  const factory = await RWATokenFactory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log(`✅ RWATokenFactory: ${factoryAddress}`);

  // Deploy LuxBridgeAMM
  console.log("\n2️⃣ Deploying LuxBridgeAMM...");
  const LuxBridgeAMM = await ethers.getContractFactory("LuxBridgeAMM");
  const amm = await LuxBridgeAMM.deploy();
  await amm.waitForDeployment();
  const ammAddress = await amm.getAddress();
  console.log(`✅ LuxBridgeAMM: ${ammAddress}`);

  // Deploy LuxBridgePriceOracle
  console.log("\n3️⃣ Deploying LuxBridgePriceOracle...");
  const LuxBridgePriceOracle = await ethers.getContractFactory(
    "LuxBridgePriceOracle",
  );
  const oracle = await LuxBridgePriceOracle.deploy(
    deployer.address, // router (mock)
    ethers.keccak256(ethers.toUtf8Bytes("fun-localhost-test")), // donId
    1, // subscriptionId
    300000, // gasLimit
  );
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log(`✅ LuxBridgePriceOracle: ${oracleAddress}`);

  // Deploy LuxBridgeAutomation
  console.log("\n4️⃣ Deploying LuxBridgeAutomation...");
  const LuxBridgeAutomation = await ethers.getContractFactory(
    "LuxBridgeAutomation",
  );
  const automation = await LuxBridgeAutomation.deploy(
    ammAddress,
    factoryAddress,
    aiAgent.address,
  );
  await automation.waitForDeployment();
  const automationAddress = await automation.getAddress();
  console.log(`✅ LuxBridgeAutomation: ${automationAddress}`);

  // Connect contracts
  console.log("\n🔗 Connecting contracts...");
  await factory.setPriceOracle(oracleAddress);
  console.log("✅ Connected factory to oracle");

  // Register platforms
  console.log("\n📱 Registering platforms...");
  await factory.registerPlatform(
    "splint_invest",
    "https://mock-api.luxbridge.ai/splint",
  );
  await factory.registerPlatform(
    "masterworks",
    "https://mock-api.luxbridge.ai/masterworks",
  );
  await factory.registerPlatform(
    "realt",
    "https://mock-api.luxbridge.ai/realt",
  );
  console.log("✅ Registered platforms: splint_invest, masterworks, realt");

  // Get network info
  const network = await ethers.provider.getNetwork();
  const blockNumber = await ethers.provider.getBlockNumber();

  const deployedContracts: DeployedContracts = {
    factory: factoryAddress,
    amm: ammAddress,
    oracle: oracleAddress,
    automation: automationAddress,
    deployer: deployer.address,
    chainId: Number(network.chainId),
    blockNumber,
  };

  // Save contract addresses
  const configPath = path.join(__dirname, "contract-addresses.json");
  fs.writeFileSync(configPath, JSON.stringify(deployedContracts, null, 2));
  console.log(`\n💾 Contract addresses saved to: ${configPath}`);

  console.log("\n✅ Local blockchain test environment ready!");
  console.log("🌐 Chain ID:", network.chainId);
  console.log("📦 Block Number:", blockNumber);

  return deployedContracts;
}

export function loadContractAddresses(): DeployedContracts | null {
  const configPath = path.join(__dirname, "contract-addresses.json");
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  }
  return null;
}

// Run setup if called directly
if (require.main === module) {
  setupLocalChain()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Setup failed:", error);
      process.exit(1);
    });
}
