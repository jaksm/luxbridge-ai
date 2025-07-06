#!/usr/bin/env tsx

// Direct contract interaction test
import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Direct contract test...");

  // Get signers
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Deploy contract fresh
  const RWATokenFactory = await ethers.getContractFactory("RWATokenFactory");
  const factory = await RWATokenFactory.deploy();
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();

  console.log("Factory deployed at:", factoryAddress);

  // Register platform
  await factory.registerPlatform(
    "splint_invest",
    "https://mock-api.luxbridge.ai/splint",
  );
  console.log("Platform registered");

  // Try tokenization with direct values
  try {
    console.log("Attempting tokenization...");
    const tx = await factory.tokenizeAsset(
      "splint_invest",
      "WINE-TEST-001",
      ethers.parseEther("1000"), // totalSupply
      "wine",
      "bordeaux",
      "0x0000000000000000000000000000000000000000000000000000000000000000", // legalHash
      ethers.parseEther("100000"), // valuation
      ethers.parseEther("100"), // sharePrice
      "USD",
    );

    console.log("✅ Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed");
  } catch (error) {
    console.error("❌ Direct contract call failed:", error);
  }
}

main().catch(console.error);
