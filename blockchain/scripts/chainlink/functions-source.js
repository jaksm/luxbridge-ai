// Chainlink Functions JavaScript source code
// This code runs off-chain and results are returned on-chain

const assetId = args[0];
const platforms = args.slice(1);

console.log(`Fetching prices for asset: ${assetId} from platforms: ${platforms.join(', ')}`);

let splintPrice = 0;
let masterworksPrice = 0;
let realTPrice = 0;

// Mock API calls since we don't have real API keys in this demo
// In production, these would be actual API calls to platform endpoints

async function fetchSplintPrice(assetId) {
  try {
    // Mock Splint Invest API call
    // const response = await Functions.makeHttpRequest({
    //   url: `https://api.splintinvest.com/v1/assets/${assetId}/price`,
    //   headers: { 'Authorization': `Bearer ${secrets.splintApiKey}` }
    // });
    
    // Mock price data for demo
    const mockData = {
      'BORDEAUX-2019': 12000,
      'CHAMPAGNE-DOM-2015': 15000,
      'WHISKEY-MACALLAN-25': 8000,
      'ART-MODERN-001': 25000
    };
    
    return mockData[assetId] || 10000;
  } catch (error) {
    console.error('Splint API error:', error);
    return 0;
  }
}

async function fetchMasterworksPrice(assetId) {
  try {
    // Mock Masterworks API call
    // const response = await Functions.makeHttpRequest({
    //   url: `https://api.masterworks.com/v1/artworks/${assetId}/valuation`,
    //   headers: { 'Authorization': `Bearer ${secrets.masterworksApiKey}` }
    // });
    
    // Mock price data for demo
    const mockData = {
      'PICASSO-042': 45000,
      'BANKSY-001': 35000,
      'WARHOL-MARILYN': 50000,
      'ART-MODERN-001': 24500
    };
    
    return mockData[assetId] || 30000;
  } catch (error) {
    console.error('Masterworks API error:', error);
    return 0;
  }
}

async function fetchRealTPrice(assetId) {
  try {
    // Mock RealT API call
    // const response = await Functions.makeHttpRequest({
    //   url: `https://api.realt.co/v1/properties/${assetId}/price`,
    //   headers: { 'Authorization': `Bearer ${secrets.realTApiKey}` }
    // });
    
    // Mock price data for demo
    const mockData = {
      'DETROIT-HOUSE-001': 5000,
      'MIAMI-CONDO-002': 18000,
      'CHICAGO-APARTMENT-003': 12500,
      'PROPERTY-RENTAL-001': 8000
    };
    
    return mockData[assetId] || 7500;
  } catch (error) {
    console.error('RealT API error:', error);
    return 0;
  }
}

// Fetch prices from all requested platforms
for (const platform of platforms) {
  switch (platform) {
    case 'splint_invest':
      splintPrice = await fetchSplintPrice(assetId);
      break;
    case 'masterworks':
      masterworksPrice = await fetchMasterworksPrice(assetId);
      break;
    case 'realt':
      realTPrice = await fetchRealTPrice(assetId);
      break;
  }
}

// Calculate arbitrage spread
let maxPrice = Math.max(splintPrice, masterworksPrice, realTPrice);
let minPrice = Math.min(
  splintPrice > 0 ? splintPrice : Infinity,
  masterworksPrice > 0 ? masterworksPrice : Infinity,
  realTPrice > 0 ? realTPrice : Infinity
);

let arbitrageSpread = 0;
if (minPrice !== Infinity && maxPrice > minPrice) {
  arbitrageSpread = Math.floor(((maxPrice - minPrice) / minPrice) * 10000); // basis points
}

console.log(`Prices found - Splint: ${splintPrice}, Masterworks: ${masterworksPrice}, RealT: ${realTPrice}`);
console.log(`Arbitrage spread: ${arbitrageSpread} basis points`);

// Return encoded data
const result = Functions.encodeString(
  JSON.stringify({
    assetId,
    splintPrice,
    masterworksPrice,
    realTPrice,
    arbitrageSpread
  })
);

return result;
