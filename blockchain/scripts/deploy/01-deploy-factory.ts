import { ethers } from "hardhat";

async function main() {
  console.log("Deploying LuxBridge RWA Token Factory...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log(
    "Account balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
  );

  // Deploy RWATokenFactory
  const RWATokenFactory = await ethers.getContractFactory("RWATokenFactory");
  const factory = await RWATokenFactory.deploy({
    gasLimit: 5000000,
    gasPrice: ethers.parseUnits("20", "gwei"),
  });
  await factory.waitForDeployment();

  console.log("RWATokenFactory deployed to:", await factory.getAddress());

  // Register initial platforms
  console.log("Registering platforms...");

  await factory.registerPlatform(
    "splint_invest",
    "https://mock-api.luxbridge.local/splint",
  );
  console.log("✓ Registered Splint Invest platform");

  await factory.registerPlatform("masterworks", "https://mock-api.luxbridge.local/masterworks");
  console.log("✓ Registered Masterworks platform");

  await factory.registerPlatform("realt", "https://mock-api.luxbridge.local/realt");
  console.log("✓ Registered RealT platform");

  // Verify deployment
  const splintInfo = await factory.getPlatformInfo("splint_invest");
  console.log("Splint platform active:", splintInfo.isActive);

  console.log("Factory deployment completed!");

  return {
    factory: await factory.getAddress(),
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
