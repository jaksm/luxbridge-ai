#!/usr/bin/env tsx

// Debug script to check contract deployment
import { ethers } from "hardhat";
import { loadContractAddresses } from "./test-environment/setup-local-chain";

async function main() {
  console.log("🔍 Debug contract deployment...");
  
  // Load contract addresses
  const contracts = loadContractAddresses();
  if (!contracts) {
    console.error("❌ No contract addresses found. Run setup first.");
    process.exit(1);
  }
  
  console.log("📄 Contract addresses:", contracts);
  
  // Get provider
  const provider = ethers.provider;
  
  // Check if contract has code
  const factoryCode = await provider.getCode(contracts.factory);
  console.log("🏭 Factory contract code length:", factoryCode.length);
  console.log("🏭 Factory has code:", factoryCode !== "0x");
  
  if (factoryCode === "0x") {
    console.error("❌ Factory contract not deployed!");
    return;
  }
  
  // Try to call a simple view function
  try {
    const factoryContract = await ethers.getContractAt("RWATokenFactory", contracts.factory);
    console.log("🔧 Factory contract created");
    
    // Try to call owner function
    const owner = await factoryContract.owner();
    console.log("👤 Contract owner:", owner);
    
    // Try to call a platform function
    const platformInfo = await factoryContract.getPlatformInfo("splint_invest");
    console.log("📊 Splint Invest platform info:", platformInfo);
    
  } catch (error) {
    console.error("❌ Contract call failed:", error);
  }
}

main().catch(console.error);