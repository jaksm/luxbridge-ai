import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const nonce = await ethers.provider.getTransactionCount(deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log("Deployer address:", deployer.address);
  console.log("Current nonce:", nonce);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
}

main().catch(console.error);
