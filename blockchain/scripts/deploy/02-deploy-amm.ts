import { ethers } from "hardhat";

async function main() {
  console.log("Deploying LuxBridge AMM...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy LuxBridgeAMM
  const LuxBridgeAMM = await ethers.getContractFactory("LuxBridgeAMM");
  const amm = await LuxBridgeAMM.deploy();
  await amm.waitForDeployment();

  console.log("LuxBridgeAMM deployed to:", await amm.getAddress());

  // Set default swap fee to 0.3%
  await amm.setDefaultSwapFee(30);
  console.log("✓ Set default swap fee to 0.3%");

  console.log("AMM deployment completed!");
  
  return {
    amm: await amm.getAddress(),
    deployer: deployer.address
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
