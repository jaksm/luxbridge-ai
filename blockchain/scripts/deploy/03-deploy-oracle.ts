import { ethers } from "hardhat";

async function main() {
  console.log("Deploying LuxBridge Price Oracle...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // For local/testnet deployment, use mock values
  // In production, these would be real Chainlink Functions parameters
  const MOCK_ROUTER = ethers.ZeroAddress;
  const MOCK_DON_ID = ethers.ZeroHash;
  const MOCK_SUBSCRIPTION_ID = 1;
  const GAS_LIMIT = 500000;

  // Deploy LuxBridgePriceOracle
  const LuxBridgePriceOracle = await ethers.getContractFactory("LuxBridgePriceOracle");
  const oracle = await LuxBridgePriceOracle.deploy(
    MOCK_ROUTER,
    MOCK_DON_ID,
    MOCK_SUBSCRIPTION_ID,
    GAS_LIMIT
  );
  await oracle.waitForDeployment();

  console.log("LuxBridgePriceOracle deployed to:", await oracle.getAddress());

  // Set mock Functions source for local testing
  const mockSource = `
    // Mock Chainlink Functions source for local testing
    const assetId = args[0];
    const platforms = args.slice(1);
    
    let splintPrice = 0;
    let masterworksPrice = 0;
    let realTPrice = 0;
    
    // Mock price data
    const mockPrices = {
      'BORDEAUX-2019': { splint: 12000, masterworks: 0, realt: 0 },
      'PICASSO-042': { splint: 0, masterworks: 45000, realt: 0 },
      'DETROIT-HOUSE-001': { splint: 0, masterworks: 0, realt: 5000 }
    };
    
    const prices = mockPrices[assetId] || { splint: 10000, masterworks: 30000, realt: 7500 };
    
    for (const platform of platforms) {
      if (platform === 'splint_invest') splintPrice = prices.splint;
      if (platform === 'masterworks') masterworksPrice = prices.masterworks;
      if (platform === 'realt') realTPrice = prices.realt;
    }
    
    const maxPrice = Math.max(splintPrice, masterworksPrice, realTPrice);
    const minPrice = Math.min(
      splintPrice > 0 ? splintPrice : Infinity,
      masterworksPrice > 0 ? masterworksPrice : Infinity,
      realTPrice > 0 ? realTPrice : Infinity
    );
    
    const arbitrageSpread = minPrice !== Infinity && maxPrice > minPrice ? 
      Math.floor(((maxPrice - minPrice) / minPrice) * 10000) : 0;
    
    return Functions.encodeString(JSON.stringify({
      assetId, splintPrice, masterworksPrice, realTPrice, arbitrageSpread
    }));
  `;

  await oracle.setFunctionsSource(mockSource);
  console.log("✓ Set mock Functions source for local testing");

  // Add some mock price data
  await oracle.mockPriceUpdate("splint_invest", "BORDEAUX-2019", ethers.parseEther("12000"));
  await oracle.mockPriceUpdate("masterworks", "PICASSO-042", ethers.parseEther("45000"));
  await oracle.mockPriceUpdate("realt", "DETROIT-HOUSE-001", ethers.parseEther("5000"));
  console.log("✓ Added mock price data");

  console.log("Oracle deployment completed!");
  
  return {
    oracle: await oracle.getAddress(),
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
