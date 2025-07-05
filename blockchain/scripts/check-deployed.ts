import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Checking deployed contracts...");
  
  // These are the addresses from the last deployment attempt
  const contracts = {
    factory: "0xe0a9d44C372622e61d8dCC7e305AE00E02F06D9A",
    amm: "0x0F9E763a1611f1D3BdF7BA5eeeEc5D27B5E827f3", 
    oracle: "0x89aA2dB5bBEE5AF78C1088F01cA47163D26ef35B",
    automation: "0x9b2fe7bA58B1212ff867E04a937C2C5bA64C6052"
  };

  for (const [name, address] of Object.entries(contracts)) {
    try {
      const code = await ethers.provider.getCode(address);
      if (code === "0x") {
        console.log(`❌ ${name}: No contract at ${address}`);
      } else {
        console.log(`✅ ${name}: Contract deployed at ${address}`);
      }
    } catch (error) {
      console.log(`⚠️ ${name}: Error checking ${address}`);
    }
  }
  
  // Check if demo tokens were created
  try {
    const factory = await ethers.getContractAt("RWATokenFactory", contracts.factory);
    
    // Check specific demo assets
    const demoAssets = [
      ["splint_invest", "BORDEAUX-2019"],
      ["masterworks", "PICASSO-042"], 
      ["realt", "DETROIT-HOUSE-001"]
    ];
    
    console.log(`\n📊 Checking demo assets...`);
    let foundCount = 0;
    
    for (const [platform, assetId] of demoAssets) {
      try {
        const tokenAddress = await factory.getTokenAddress(platform, assetId);
        if (tokenAddress !== ethers.ZeroAddress) {
          console.log(`✅ ${platform}/${assetId}: ${tokenAddress}`);
          foundCount++;
        } else {
          console.log(`❌ ${platform}/${assetId}: Not tokenized`);
        }
      } catch (error) {
        console.log(`❌ ${platform}/${assetId}: Not found`);
      }
    }
    
    console.log(`\nTotal assets found: ${foundCount}/${demoAssets.length}`);
    
    // Check platform info
    try {
      const platformInfo = await factory.getPlatformInfo("splint_invest");
      console.log(`\n📊 Splint Invest platform info:`);
      console.log(`   Total assets tokenized: ${platformInfo.totalAssetsTokenized}`);
      console.log(`   Total value locked: ${ethers.formatEther(platformInfo.totalValueLocked)} ETH`);
    } catch (error) {
      console.log(`\n⚠️ Platform info not available`);
    }
  } catch (error) {
    console.log("⚠️ Could not check factory details:", error);
  }
}

main().catch(console.error);