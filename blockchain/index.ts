import { ethers } from "ethers";
import { z } from "zod";
import {
  RWATokenFactory,
  RWATokenFactory__factory,
  LuxBridgeAMM,
  LuxBridgeAMM__factory,
  LuxBridgePriceOracle,
  LuxBridgePriceOracle__factory,
  LuxBridgeAutomation,
  LuxBridgeAutomation__factory,
  RWA20Token,
  RWA20Token__factory,
} from "./typechain-types";

export interface LuxBridgeSDKConfig {
  network: "localhost" | "hardhat" | "zircuit" | "sepolia";
  privateKey?: string;
  provider?: ethers.Provider;
  contracts?: {
    factory?: string;
    amm?: string;
    oracle?: string;
    automation?: string;
  };
}

export interface NetworkConfig {
  rpcUrl: string;
  contracts: {
    factory: string;
    amm: string;
    oracle: string;
    automation: string;
  };
}

const NETWORK_CONFIGS: Record<string, NetworkConfig> = {
  localhost: {
    rpcUrl: "http://127.0.0.1:8545",
    contracts: {
      factory: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      amm: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      oracle: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
      automation: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    },
  },
  hardhat: {
    rpcUrl: "http://127.0.0.1:8545",
    contracts: {
      factory: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      amm: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      oracle: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
      automation: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    },
  },
  zircuit: {
    rpcUrl: process.env.ZIRCUIT_RPC_URL || "https://zircuit1.p2pify.com",
    contracts: {
      factory: "",
      amm: "",
      oracle: "",
      automation: "",
    },
  },
  sepolia: {
    rpcUrl: process.env.SEPOLIA_RPC_URL || "",
    contracts: {
      factory: "",
      amm: "",
      oracle: "",
      automation: "",
    },
  },
};

export class LuxBridgeSDK {
  private provider: ethers.Provider;
  private signer?: ethers.Signer;
  private factory: RWATokenFactory;
  private amm: LuxBridgeAMM;
  private oracle: LuxBridgePriceOracle;
  private automation: LuxBridgeAutomation;

  constructor(config: LuxBridgeSDKConfig) {
    const networkConfig = NETWORK_CONFIGS[config.network];
    if (!networkConfig) {
      throw new Error(`Unsupported network: ${config.network}`);
    }

    if (config.provider) {
      this.provider = config.provider;
    } else {
      this.provider = new ethers.JsonRpcProvider(networkConfig.rpcUrl);
    }

    if (config.privateKey) {
      this.signer = new ethers.Wallet(config.privateKey, this.provider);
    }

    const contractAddresses = {
      ...networkConfig.contracts,
      ...config.contracts,
    };

    const signerOrProvider = this.signer || this.provider;

    this.factory = RWATokenFactory__factory.connect(
      contractAddresses.factory,
      signerOrProvider,
    );
    this.amm = LuxBridgeAMM__factory.connect(
      contractAddresses.amm,
      signerOrProvider,
    );
    this.oracle = LuxBridgePriceOracle__factory.connect(
      contractAddresses.oracle,
      signerOrProvider,
    );
    this.automation = LuxBridgeAutomation__factory.connect(
      contractAddresses.automation,
      signerOrProvider,
    );
  }

  private requireSigner() {
    if (!this.signer) {
      throw new Error(
        "Signer required for this operation. Provide privateKey in config.",
      );
    }
    return this.signer;
  }

  private async estimateGasWithBuffer(transaction: any, bufferPercent = 20) {
    try {
      const estimated = await transaction.estimateGas();
      const buffer = (estimated * BigInt(bufferPercent)) / 100n;
      return estimated + buffer;
    } catch (error) {
      console.warn("Gas estimation failed, using default:", error);
      return 300000n;
    }
  }

  // Asset Tokenization Methods
  async tokenizeAsset(params: z.infer<typeof TokenizeAssetSchema>) {
    this.requireSigner();
    const parsed = TokenizeAssetSchema.parse(params);

    const tx = await this.factory.tokenizeAsset(
      parsed.platform,
      parsed.assetId,
      ethers.parseEther(parsed.totalSupply),
      parsed.assetType,
      parsed.legalHash,
      ethers.parseEther(parsed.valuation),
      {
        gasLimit: await this.estimateGasWithBuffer(
          this.factory.tokenizeAsset.populateTransaction(
            parsed.platform,
            parsed.assetId,
            ethers.parseEther(parsed.totalSupply),
            parsed.assetType,
            parsed.legalHash,
            ethers.parseEther(parsed.valuation),
          ),
        ),
      },
    );

    const receipt = await tx.wait();
    if (!receipt) throw new Error("Transaction failed");

    const tokenAddress = await this.factory.getTokenAddress(
      parsed.platform,
      parsed.assetId,
    );

    return {
      transactionHash: tx.hash,
      tokenAddress,
      receipt,
    };
  }

  async burnTokens(params: z.infer<typeof BurnTokensSchema>) {
    this.requireSigner();
    const parsed = BurnTokensSchema.parse(params);

    const tx = await this.factory.burnTokens(
      parsed.platform,
      parsed.assetId,
      ethers.parseEther(parsed.amount),
      {
        gasLimit: await this.estimateGasWithBuffer(
          this.factory.burnTokens.populateTransaction(
            parsed.platform,
            parsed.assetId,
            ethers.parseEther(parsed.amount),
          ),
        ),
      },
    );

    const receipt = await tx.wait();
    if (!receipt) throw new Error("Transaction failed");

    return {
      transactionHash: tx.hash,
      receipt,
    };
  }

  async updateValuation(params: z.infer<typeof UpdateValuationSchema>) {
    this.requireSigner();
    const parsed = UpdateValuationSchema.parse(params);

    const tx = await this.factory.updateValuation(
      parsed.platform,
      parsed.assetId,
      ethers.parseEther(parsed.newValuation),
      {
        gasLimit: await this.estimateGasWithBuffer(
          this.factory.updateValuation.populateTransaction(
            parsed.platform,
            parsed.assetId,
            ethers.parseEther(parsed.newValuation),
          ),
        ),
      },
    );

    const receipt = await tx.wait();
    if (!receipt) throw new Error("Transaction failed");

    return {
      transactionHash: tx.hash,
      receipt,
    };
  }

  async getAssetMetadata(params: z.infer<typeof GetAssetMetadataSchema>) {
    const parsed = GetAssetMetadataSchema.parse(params);

    const metadata = await this.factory.getAssetMetadata(
      parsed.platform,
      parsed.assetId,
    );

    return {
      platform: metadata.platform,
      assetId: metadata.assetId,
      totalSupply: ethers.formatEther(metadata.totalSupply),
      assetType: metadata.assetType,
      legalHash: metadata.legalHash,
      lastValuation: ethers.formatEther(metadata.lastValuation),
      valuationTimestamp: Number(metadata.valuationTimestamp),
    };
  }

  async batchTokenize(params: z.infer<typeof BatchTokenizeSchema>) {
    this.requireSigner();
    const parsed = BatchTokenizeSchema.parse(params);

    const tx = await this.factory.batchTokenize(
      parsed.assets.map((a) => a.platform),
      parsed.assets.map((a) => a.assetId),
      parsed.assets.map((a) => ethers.parseEther(a.totalSupply)),
      parsed.assets.map((a) => a.assetType),
      parsed.assets.map((a) => a.legalHash),
      parsed.assets.map((a) => ethers.parseEther(a.valuation)),
      {
        gasLimit: await this.estimateGasWithBuffer(
          this.factory.batchTokenize.populateTransaction(
            parsed.assets.map((a) => a.platform),
            parsed.assets.map((a) => a.assetId),
            parsed.assets.map((a) => ethers.parseEther(a.totalSupply)),
            parsed.assets.map((a) => a.assetType),
            parsed.assets.map((a) => a.legalHash),
            parsed.assets.map((a) => ethers.parseEther(a.valuation)),
          ),
        ),
      },
    );

    const receipt = await tx.wait();
    if (!receipt) throw new Error("Transaction failed");

    const tokenAddresses = await Promise.all(
      parsed.assets.map((asset) =>
        this.factory.getTokenAddress(asset.platform, asset.assetId),
      ),
    );

    return {
      transactionHash: tx.hash,
      tokenAddresses,
      receipt,
    };
  }

  // AMM Operations
  async createPool(params: z.infer<typeof CreatePoolSchema>) {
    this.requireSigner();
    const parsed = CreatePoolSchema.parse(params);

    const swapFee = parsed.swapFee ? Math.floor(parsed.swapFee * 100) : 30;

    const tx = await this.amm.createPool(
      parsed.tokenA,
      parsed.tokenB,
      swapFee,
      {
        gasLimit: await this.estimateGasWithBuffer(
          this.amm.createPool.populateTransaction(
            parsed.tokenA,
            parsed.tokenB,
            swapFee,
          ),
        ),
      },
    );

    const receipt = await tx.wait();
    if (!receipt) throw new Error("Transaction failed");

    const poolId = await this.amm.getPoolId(parsed.tokenA, parsed.tokenB);

    return {
      transactionHash: tx.hash,
      poolId,
      receipt,
    };
  }

  async addLiquidity(params: z.infer<typeof AddLiquiditySchema>) {
    this.requireSigner();
    const parsed = AddLiquiditySchema.parse(params);

    const tx = await this.amm.addLiquidity(
      parsed.tokenA,
      parsed.tokenB,
      ethers.parseEther(parsed.amountADesired),
      ethers.parseEther(parsed.amountBDesired),
      ethers.parseEther(parsed.amountAMin || "0"),
      ethers.parseEther(parsed.amountBMin || "0"),
      {
        gasLimit: await this.estimateGasWithBuffer(
          this.amm.addLiquidity.populateTransaction(
            parsed.tokenA,
            parsed.tokenB,
            ethers.parseEther(parsed.amountADesired),
            ethers.parseEther(parsed.amountBDesired),
            ethers.parseEther(parsed.amountAMin || "0"),
            ethers.parseEther(parsed.amountBMin || "0"),
          ),
        ),
      },
    );

    const receipt = await tx.wait();
    if (!receipt) throw new Error("Transaction failed");

    return {
      transactionHash: tx.hash,
      receipt,
    };
  }

  async removeLiquidity(params: z.infer<typeof RemoveLiquiditySchema>) {
    this.requireSigner();
    const parsed = RemoveLiquiditySchema.parse(params);

    const tx = await this.amm.removeLiquidity(
      parsed.tokenA,
      parsed.tokenB,
      ethers.parseEther(parsed.liquidity),
      ethers.parseEther(parsed.amountAMin || "0"),
      ethers.parseEther(parsed.amountBMin || "0"),
      {
        gasLimit: await this.estimateGasWithBuffer(
          this.amm.removeLiquidity.populateTransaction(
            parsed.tokenA,
            parsed.tokenB,
            ethers.parseEther(parsed.liquidity),
            ethers.parseEther(parsed.amountAMin || "0"),
            ethers.parseEther(parsed.amountBMin || "0"),
          ),
        ),
      },
    );

    const receipt = await tx.wait();
    if (!receipt) throw new Error("Transaction failed");

    return {
      transactionHash: tx.hash,
      receipt,
    };
  }

  async swap(params: z.infer<typeof SwapSchema>) {
    this.requireSigner();
    const parsed = SwapSchema.parse(params);

    const tx = await this.amm.swap(
      parsed.tokenIn,
      parsed.tokenOut,
      ethers.parseEther(parsed.amountIn),
      ethers.parseEther(parsed.amountOutMin || "0"),
      {
        gasLimit: await this.estimateGasWithBuffer(
          this.amm.swap.populateTransaction(
            parsed.tokenIn,
            parsed.tokenOut,
            ethers.parseEther(parsed.amountIn),
            ethers.parseEther(parsed.amountOutMin || "0"),
          ),
        ),
      },
    );

    const receipt = await tx.wait();
    if (!receipt) throw new Error("Transaction failed");

    return {
      transactionHash: tx.hash,
      receipt,
    };
  }

  async getAmountOut(params: z.infer<typeof GetAmountOutSchema>) {
    const parsed = GetAmountOutSchema.parse(params);

    const amountOut = await this.amm.getAmountOut(
      parsed.tokenIn,
      parsed.tokenOut,
      ethers.parseEther(parsed.amountIn),
    );

    return {
      amountOut: ethers.formatEther(amountOut),
    };
  }

  async findBestRoute(params: z.infer<typeof FindBestRouteSchema>) {
    const parsed = FindBestRouteSchema.parse(params);

    const route = await this.amm.findBestRoute(
      parsed.tokenIn,
      parsed.tokenOut,
      ethers.parseEther(parsed.amountIn),
    );

    return {
      path: route.path,
      amounts: route.amounts.map((amount) => ethers.formatEther(amount)),
      totalAmountOut: ethers.formatEther(route.totalAmountOut),
    };
  }

  // Oracle & Pricing Methods
  async requestCrossPlatformPrices(
    params: z.infer<typeof RequestCrossPlatformPricesSchema>,
  ) {
    this.requireSigner();
    const parsed = RequestCrossPlatformPricesSchema.parse(params);

    const tx = await this.oracle.requestCrossPlatformPrices(
      parsed.assetId,
      parsed.platforms,
      {
        gasLimit: await this.estimateGasWithBuffer(
          this.oracle.requestCrossPlatformPrices.populateTransaction(
            parsed.assetId,
            parsed.platforms,
          ),
        ),
      },
    );

    const receipt = await tx.wait();
    if (!receipt) throw new Error("Transaction failed");

    return {
      transactionHash: tx.hash,
      receipt,
    };
  }

  async getPrice(params: z.infer<typeof GetPriceSchema>) {
    const parsed = GetPriceSchema.parse(params);

    const [price, timestamp] = await this.oracle.getPrice(
      parsed.platform,
      parsed.assetId,
    );

    return {
      price: ethers.formatEther(price),
      timestamp: Number(timestamp),
    };
  }

  async calculateArbitrageSpread(
    params: z.infer<typeof CalculateArbitrageSpreadSchema>,
  ) {
    const parsed = CalculateArbitrageSpreadSchema.parse(params);

    const spread = await this.oracle.calculateArbitrageSpread(
      parsed.assetId,
      parsed.platformA,
      parsed.platformB,
    );

    return {
      spread: Number(spread),
      spreadPercentage: Number(spread) / 100,
    };
  }

  async mockPriceUpdate(params: z.infer<typeof MockPriceUpdateSchema>) {
    this.requireSigner();
    const parsed = MockPriceUpdateSchema.parse(params);

    const tx = await this.oracle.mockPriceUpdate(
      parsed.platform,
      parsed.assetId,
      ethers.parseEther(parsed.price),
      {
        gasLimit: await this.estimateGasWithBuffer(
          this.oracle.mockPriceUpdate.populateTransaction(
            parsed.platform,
            parsed.assetId,
            ethers.parseEther(parsed.price),
          ),
        ),
      },
    );

    const receipt = await tx.wait();
    if (!receipt) throw new Error("Transaction failed");

    return {
      transactionHash: tx.hash,
      receipt,
    };
  }

  // Platform Management
  async registerPlatform(params: z.infer<typeof RegisterPlatformSchema>) {
    this.requireSigner();
    const parsed = RegisterPlatformSchema.parse(params);

    const tx = await this.factory.registerPlatform(
      parsed.name,
      parsed.apiEndpoint,
      {
        gasLimit: await this.estimateGasWithBuffer(
          this.factory.registerPlatform.populateTransaction(
            parsed.name,
            parsed.apiEndpoint,
          ),
        ),
      },
    );

    const receipt = await tx.wait();
    if (!receipt) throw new Error("Transaction failed");

    return {
      transactionHash: tx.hash,
      receipt,
    };
  }

  async getPlatformInfo(params: z.infer<typeof GetPlatformInfoSchema>) {
    const parsed = GetPlatformInfoSchema.parse(params);

    const info = await this.factory.getPlatformInfo(parsed.platform);

    return {
      name: info.name,
      apiEndpoint: info.apiEndpoint,
      isActive: info.isActive,
      totalAssetsTokenized: Number(info.totalAssetsTokenized),
      totalValueLocked: ethers.formatEther(info.totalValueLocked),
    };
  }

  async getTokenAddress(params: z.infer<typeof GetTokenAddressSchema>) {
    const parsed = GetTokenAddressSchema.parse(params);

    const address = await this.factory.getTokenAddress(
      parsed.platform,
      parsed.assetId,
    );

    return {
      tokenAddress: address,
    };
  }

  // Automation Methods
  async delegateTrading(params: z.infer<typeof DelegateTradingSchema>) {
    this.requireSigner();
    const parsed = DelegateTradingSchema.parse(params);

    const tx = await this.automation.delegateTrading(
      ethers.parseEther(parsed.maxTradeSize),
      ethers.parseEther(parsed.maxDailyVolume),
      parsed.allowedAssets,
      {
        gasLimit: await this.estimateGasWithBuffer(
          this.automation.delegateTrading.populateTransaction(
            ethers.parseEther(parsed.maxTradeSize),
            ethers.parseEther(parsed.maxDailyVolume),
            parsed.allowedAssets,
          ),
        ),
      },
    );

    const receipt = await tx.wait();
    if (!receipt) throw new Error("Transaction failed");

    return {
      transactionHash: tx.hash,
      receipt,
    };
  }

  async executeAutomatedTrade(
    params: z.infer<typeof ExecuteAutomatedTradeSchema>,
  ) {
    this.requireSigner();
    const parsed = ExecuteAutomatedTradeSchema.parse(params);

    const tx = await this.automation.executeAutomatedTrade(
      parsed.tradeId,
      {
        gasLimit: await this.estimateGasWithBuffer(
          this.automation.executeAutomatedTrade.populateTransaction(
            parsed.tradeId,
          ),
        ),
      },
    );

    const receipt = await tx.wait();
    if (!receipt) throw new Error("Transaction failed");

    return {
      transactionHash: tx.hash,
      receipt,
    };
  }

  async queueAutomatedTrade(params: z.infer<typeof QueueAutomatedTradeSchema>) {
    this.requireSigner();
    const parsed = QueueAutomatedTradeSchema.parse(params);

    const tx = await this.automation.queueAutomatedTrade(
      parsed.user,
      parsed.sellAsset,
      parsed.buyAsset,
      ethers.parseEther(parsed.amount),
      ethers.parseEther(parsed.minAmountOut || "0"),
      parsed.deadline,
      {
        gasLimit: await this.estimateGasWithBuffer(
          this.automation.queueAutomatedTrade.populateTransaction(
            parsed.user,
            parsed.sellAsset,
            parsed.buyAsset,
            ethers.parseEther(parsed.amount),
            ethers.parseEther(parsed.minAmountOut || "0"),
            parsed.deadline,
          ),
        ),
      },
    );

    const receipt = await tx.wait();
    if (!receipt) throw new Error("Transaction failed");

    return {
      transactionHash: tx.hash,
      receipt,
    };
  }

  // Utility Methods
  getContractAddresses() {
    return {
      factory: this.factory.target,
      amm: this.amm.target,
      oracle: this.oracle.target,
      automation: this.automation.target,
    };
  }

  async getTokenContract(tokenAddress: string): Promise<RWA20Token> {
    return RWA20Token__factory.connect(
      tokenAddress,
      this.signer || this.provider,
    );
  }
}

// Zod Schemas with rich descriptions
export const TokenizeAssetSchema = z
  .object({
    platform: z
      .string()
      .describe(
        "The platform name where the asset originates (e.g., 'splint_invest', 'masterworks', 'realt')",
      ),
    assetId: z
      .string()
      .describe(
        "Unique identifier for the asset on the platform (e.g., 'BORDEAUX-2019', 'PICASSO-042')",
      ),
    totalSupply: z
      .string()
      .describe(
        "Total number of tokens to create representing fractional ownership (in ETH units, e.g., '1000000' for 1M tokens)",
      ),
    assetType: z
      .string()
      .describe(
        "Category of the real-world asset (e.g., 'wine', 'art', 'real_estate', 'whiskey', 'collectibles')",
      ),
    legalHash: z
      .string()
      .describe(
        "Keccak256 hash of legal documents proving asset ownership and tokenization rights (32-byte hex string with 0x prefix)",
      ),
    valuation: z
      .string()
      .describe(
        "Current market valuation of the asset in USD (in ETH units, e.g., '100000' for $100k)",
      ),
  })
  .describe(
    "Parameters for tokenizing a real-world asset into fungible ERC-20 tokens on the blockchain",
  );

export const BurnTokensSchema = z
  .object({
    platform: z
      .string()
      .describe("The platform name where the asset originates"),
    assetId: z
      .string()
      .describe("Unique identifier for the asset on the platform"),
    amount: z.string().describe("Number of tokens to burn (in ETH units)"),
  })
  .describe(
    "Parameters for burning tokens when the underlying asset is sold or transferred off-platform",
  );

export const UpdateValuationSchema = z
  .object({
    platform: z
      .string()
      .describe("The platform name where the asset originates"),
    assetId: z
      .string()
      .describe("Unique identifier for the asset on the platform"),
    newValuation: z
      .string()
      .describe("Updated market valuation of the asset in USD (in ETH units)"),
  })
  .describe(
    "Parameters for updating the market valuation of a tokenized asset based on external price feeds",
  );

export const GetAssetMetadataSchema = z
  .object({
    platform: z
      .string()
      .describe("The platform name where the asset originates"),
    assetId: z
      .string()
      .describe("Unique identifier for the asset on the platform"),
  })
  .describe(
    "Parameters for retrieving comprehensive metadata about a tokenized asset",
  );

export const BatchTokenizeSchema = z
  .object({
    assets: z
      .array(
        z.object({
          platform: z
            .string()
            .describe("The platform name where the asset originates"),
          assetId: z
            .string()
            .describe("Unique identifier for the asset on the platform"),
          totalSupply: z
            .string()
            .describe("Total number of tokens to create (in ETH units)"),
          assetType: z.string().describe("Category of the real-world asset"),
          legalHash: z.string().describe("Keccak256 hash of legal documents"),
          valuation: z
            .string()
            .describe("Current market valuation in USD (in ETH units)"),
        }),
      )
      .describe("Array of assets to tokenize in a single transaction"),
  })
  .describe(
    "Parameters for batch tokenization of multiple assets to optimize gas costs",
  );

export const CreatePoolSchema = z
  .object({
    tokenA: z
      .string()
      .describe("Contract address of the first token in the liquidity pool"),
    tokenB: z
      .string()
      .describe("Contract address of the second token in the liquidity pool"),
    swapFee: z
      .number()
      .optional()
      .describe(
        "Trading fee percentage for the pool (e.g., 0.3 for 0.3% fee, defaults to 0.3%)",
      ),
  })
  .describe(
    "Parameters for creating a new automated market maker liquidity pool between two tokens",
  );

export const AddLiquiditySchema = z
  .object({
    tokenA: z.string().describe("Contract address of the first token"),
    tokenB: z.string().describe("Contract address of the second token"),
    amountADesired: z
      .string()
      .describe("Desired amount of tokenA to add (in ETH units)"),
    amountBDesired: z
      .string()
      .describe("Desired amount of tokenB to add (in ETH units)"),
    amountAMin: z
      .string()
      .optional()
      .describe(
        "Minimum amount of tokenA to add (slippage protection, in ETH units)",
      ),
    amountBMin: z
      .string()
      .optional()
      .describe(
        "Minimum amount of tokenB to add (slippage protection, in ETH units)",
      ),
  })
  .describe(
    "Parameters for adding liquidity to an existing AMM pool and receiving LP tokens",
  );

export const RemoveLiquiditySchema = z
  .object({
    tokenA: z.string().describe("Contract address of the first token"),
    tokenB: z.string().describe("Contract address of the second token"),
    liquidity: z
      .string()
      .describe(
        "Amount of LP tokens to burn and redeem for underlying assets (in ETH units)",
      ),
    amountAMin: z
      .string()
      .optional()
      .describe(
        "Minimum amount of tokenA to receive (slippage protection, in ETH units)",
      ),
    amountBMin: z
      .string()
      .optional()
      .describe(
        "Minimum amount of tokenB to receive (slippage protection, in ETH units)",
      ),
  })
  .describe(
    "Parameters for removing liquidity from an AMM pool by burning LP tokens",
  );

export const SwapSchema = z
  .object({
    tokenIn: z.string().describe("Contract address of the token being sold"),
    tokenOut: z.string().describe("Contract address of the token being bought"),
    amountIn: z
      .string()
      .describe("Amount of input token to swap (in ETH units)"),
    amountOutMin: z
      .string()
      .optional()
      .describe(
        "Minimum amount of output tokens to receive (slippage protection, in ETH units)",
      ),
  })
  .describe(
    "Parameters for executing a token swap through the automated market maker",
  );

export const GetAmountOutSchema = z
  .object({
    tokenIn: z.string().describe("Contract address of the input token"),
    tokenOut: z.string().describe("Contract address of the output token"),
    amountIn: z
      .string()
      .describe("Amount of input token to calculate output for (in ETH units)"),
  })
  .describe(
    "Parameters for calculating the expected output amount for a given input without executing the swap",
  );

export const FindBestRouteSchema = z
  .object({
    tokenIn: z.string().describe("Contract address of the input token"),
    tokenOut: z.string().describe("Contract address of the output token"),
    amountIn: z
      .string()
      .describe("Amount of input token to find route for (in ETH units)"),
  })
  .describe(
    "Parameters for finding the optimal trading route between two tokens through intermediate pools",
  );

export const RequestCrossPlatformPricesSchema = z
  .object({
    assetId: z
      .string()
      .describe(
        "Asset identifier to fetch prices for across multiple platforms",
      ),
    platforms: z
      .array(z.string())
      .describe(
        "Array of platform names to fetch prices from (e.g., ['splint_invest', 'masterworks', 'realt'])",
      ),
  })
  .describe(
    "Parameters for requesting cross-platform price updates via Chainlink Functions oracle",
  );

export const GetPriceSchema = z
  .object({
    platform: z.string().describe("Platform name to get price from"),
    assetId: z.string().describe("Asset identifier to get price for"),
  })
  .describe(
    "Parameters for retrieving the latest price of an asset from a specific platform",
  );

export const CalculateArbitrageSpreadSchema = z
  .object({
    assetId: z
      .string()
      .describe("Asset identifier to calculate arbitrage spread for"),
    platformA: z.string().describe("First platform to compare prices"),
    platformB: z.string().describe("Second platform to compare prices"),
  })
  .describe(
    "Parameters for calculating the price spread between two platforms for arbitrage opportunities",
  );

export const MockPriceUpdateSchema = z
  .object({
    platform: z.string().describe("Platform name to update price for"),
    assetId: z.string().describe("Asset identifier to update price for"),
    price: z.string().describe("New price value in USD (in ETH units)"),
  })
  .describe(
    "Parameters for manually updating asset prices (used for testing and development)",
  );

export const RegisterPlatformSchema = z
  .object({
    name: z
      .string()
      .describe(
        "Unique name identifier for the platform (e.g., 'splint_invest', 'masterworks')",
      ),
    apiEndpoint: z
      .string()
      .describe("API endpoint URL for the platform's data feeds"),
  })
  .describe(
    "Parameters for registering a new real-world asset platform in the factory contract",
  );

export const GetPlatformInfoSchema = z
  .object({
    platform: z.string().describe("Platform name to get information for"),
  })
  .describe(
    "Parameters for retrieving detailed information about a registered platform",
  );

export const GetTokenAddressSchema = z
  .object({
    platform: z.string().describe("Platform name where the asset originates"),
    assetId: z.string().describe("Asset identifier to get token address for"),
  })
  .describe("Parameters for finding the contract address of a tokenized asset");

export const DelegateTradingSchema = z
  .object({
    maxTradeSize: z
      .string()
      .describe(
        "Maximum USD value for a single trade (in ETH units)",
      ),
    maxDailyVolume: z
      .string()
      .describe(
        "Maximum USD value of trades per day (in ETH units)",
      ),
    allowedAssets: z
      .array(z.string())
      .describe("Array of asset identifiers the user allows to be traded"),
  })
  .describe(
    "Parameters for delegating trading permissions to the AI agent with spending limits and asset restrictions",
  );

export const ExecuteAutomatedTradeSchema = z
  .object({
    tradeId: z
      .string()
      .describe(
        "The unique identifier of the queued trade to execute (32-byte hex string)",
      ),
  })
  .describe(
    "Parameters for AI agents to execute a previously queued automated trade",
  );

export const QueueAutomatedTradeSchema = z
  .object({
    user: z
      .string()
      .describe(
        "Ethereum address of the user on whose behalf the trade will be executed",
      ),
    sellAsset: z.string().describe("Asset identifier of the token being sold"),
    buyAsset: z.string().describe("Asset identifier of the token being bought"),
    amount: z
      .string()
      .describe("Amount of input token to trade (in ETH units)"),
    minAmountOut: z
      .string()
      .optional()
      .describe(
        "Minimum acceptable output amount (slippage protection, in ETH units)",
      ),
    deadline: z
      .number()
      .describe(
        "Unix timestamp after which the trade will expire and cannot be executed",
      ),
  })
  .describe(
    "Parameters for AI agents to queue an automated trade for later execution",
  );

export default LuxBridgeSDK;
