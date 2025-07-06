import { ethers } from "hardhat";

async function main() {
  console.log("🤖 Deploying LuxBridge Automation...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy LuxBridgeAutomation
  const LuxBridgeAutomation = await ethers.getContractFactory(
    "LuxBridgeAutomation",
  );

  // Use fresh contract addresses
  const factoryAddress = "0xc0F115A19107322cFBf1cDBC7ea011C19EbDB4F8";
  const ammAddress = "0x07882Ae1ecB7429a84f1D53048d35c4bB2056877";
  const aiAgentAddress = deployer.address; // Use deployer as AI agent for testing

  const automation = await LuxBridgeAutomation.deploy(
    ammAddress,
    factoryAddress,
    aiAgentAddress,
  );

  await automation.waitForDeployment();
  const automationAddress = await automation.getAddress();

  console.log(`LuxBridgeAutomation deployed to: ${automationAddress}`);
  console.log(`✓ AI Agent address: ${aiAgentAddress}`);

  console.log("Automation deployment completed!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
