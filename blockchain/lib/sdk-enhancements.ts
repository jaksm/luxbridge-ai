import { ethers } from "ethers";
import { LuxBridgeSDK } from "../index";
import { LuxBridgeError, ErrorCode, parseContractError } from "./errors";

export interface TransactionOptions {
  gasLimit?: bigint;
  gasPrice?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
  nonce?: number;
}

export interface WaitOptions {
  confirmations?: number;
  timeout?: number;
}

export class EnhancedLuxBridgeSDK extends LuxBridgeSDK {
  private defaultWaitOptions: WaitOptions = {
    confirmations: 1,
    timeout: 60000, // 60 seconds
  };

  // Enhanced error handling wrapper
  private async executeTransaction<T>(
    operation: () => Promise<ethers.TransactionResponse>,
    options?: TransactionOptions
  ): Promise<{ tx: ethers.TransactionResponse; receipt: ethers.TransactionReceipt }> {
    try {
      // Add transaction options if provided
      if (options && this.signer) {
        const nonce = options.nonce ?? await this.provider.getTransactionCount(await this.signer.getAddress());
        const feeData = await this.provider.getFeeData();
        
        // Build overrides
        const overrides: any = { nonce };
        if (options.gasLimit) overrides.gasLimit = options.gasLimit;
        if (options.gasPrice) overrides.gasPrice = options.gasPrice;
        if (options.maxFeePerGas) overrides.maxFeePerGas = options.maxFeePerGas;
        if (options.maxPriorityFeePerGas) overrides.maxPriorityFeePerGas = options.maxPriorityFeePerGas;
      }

      const tx = await operation();
      const receipt = await this.waitForTransaction(tx.hash);
      
      if (!receipt) {
        throw new LuxBridgeError(
          ErrorCode.TRANSACTION_FAILED,
          "Transaction failed - no receipt received"
        );
      }

      if (receipt.status === 0) {
        throw new LuxBridgeError(
          ErrorCode.TRANSACTION_REVERTED,
          "Transaction reverted on chain",
          { tx, receipt }
        );
      }

      return { tx, receipt };
    } catch (error) {
      throw parseContractError(error);
    }
  }

  // Enhanced transaction waiting with timeout
  private async waitForTransaction(
    hash: string,
    options: WaitOptions = this.defaultWaitOptions
  ): Promise<ethers.TransactionReceipt | null> {
    const start = Date.now();
    
    while (Date.now() - start < (options.timeout || 60000)) {
      try {
        const receipt = await this.provider.getTransactionReceipt(hash);
        if (receipt && (await receipt.confirmations()) >= (options.confirmations || 1)) {
          return receipt;
        }
      } catch (error) {
        // Continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new LuxBridgeError(
      ErrorCode.TRANSACTION_FAILED,
      `Transaction timeout after ${options.timeout}ms`,
      { hash }
    );
  }

  // Batch operation support
  async batchOperations<T>(
    operations: Array<() => Promise<T>>,
    options?: { concurrency?: number; stopOnError?: boolean }
  ): Promise<Array<{ success: boolean; result?: T; error?: LuxBridgeError }>> {
    const concurrency = options?.concurrency || 5;
    const stopOnError = options?.stopOnError || false;
    const results: Array<{ success: boolean; result?: T; error?: LuxBridgeError }> = [];
    
    for (let i = 0; i < operations.length; i += concurrency) {
      const batch = operations.slice(i, i + concurrency);
      const batchResults = await Promise.allSettled(batch.map(op => op()));
      
      for (const result of batchResults) {
        if (result.status === "fulfilled") {
          results.push({ success: true, result: result.value });
        } else {
          const error = parseContractError(result.reason);
          results.push({ success: false, error });
          
          if (stopOnError) {
            return results;
          }
        }
      }
    }
    
    return results;
  }

  // Event listening utilities
  async listenToEvents(
    contractName: "factory" | "amm" | "oracle" | "automation",
    eventName: string,
    callback: (event: any) => void,
    filter?: any
  ): Promise<() => void> {
    const contract = this.getContract(contractName);
    
    (contract as any).on(eventName, (...args: any[]) => {
      callback({
        eventName,
        args,
        blockNumber: args[args.length - 1].blockNumber,
        transactionHash: args[args.length - 1].transactionHash,
      });
    });
    
    // Return cleanup function
    return () => {
      (contract as any).off(eventName, callback);
    };
  }

  // Historical event queries
  async queryEvents(
    contractName: "factory" | "amm" | "oracle" | "automation",
    eventName: string,
    fromBlock?: number,
    toBlock?: number,
    filter?: any
  ): Promise<any[]> {
    const contract = this.getContract(contractName);
    const eventFilter = (contract.filters as any)[eventName](...(filter || []));
    
    const events = await contract.queryFilter(
      eventFilter,
      fromBlock || 0,
      toBlock || "latest"
    );
    
    return events.map(event => ({
      eventName,
      args: event.args,
      blockNumber: event.blockNumber,
      transactionHash: event.transactionHash,
      address: event.address,
    }));
  }

  // Gas estimation with safety margin
  async estimateGasWithMargin(
    operation: () => Promise<bigint>,
    marginPercent: number = 20
  ): Promise<bigint> {
    try {
      const estimated = await operation();
      const margin = (estimated * BigInt(marginPercent)) / 100n;
      return estimated + margin;
    } catch (error) {
      // Return default gas limit if estimation fails
      return 500000n;
    }
  }

  // Multicall support for batch reads
  async multicall<T>(calls: Array<() => Promise<T>>): Promise<T[]> {
    return Promise.all(calls.map(call => call()));
  }

  // Health check utilities
  async checkHealth(): Promise<{
    provider: boolean;
    contracts: Record<string, boolean>;
    blockNumber: number;
    chainId: number;
  }> {
    try {
      const [blockNumber, network] = await Promise.all([
        this.provider.getBlockNumber(),
        this.provider.getNetwork(),
      ]);

      const contracts = {
        factory: await this.isContractDeployed(this.factory.target as string),
        amm: await this.isContractDeployed(this.amm.target as string),
        oracle: await this.isContractDeployed(this.oracle.target as string),
        automation: await this.isContractDeployed(this.automation.target as string),
      };

      return {
        provider: true,
        contracts,
        blockNumber,
        chainId: Number(network.chainId),
      };
    } catch (error) {
      throw new LuxBridgeError(
        ErrorCode.NETWORK_ERROR,
        "Health check failed",
        error
      );
    }
  }

  private async isContractDeployed(address: string): Promise<boolean> {
    try {
      const code = await this.provider.getCode(address);
      return code !== "0x";
    } catch {
      return false;
    }
  }

  private getContract(name: "factory" | "amm" | "oracle" | "automation") {
    switch (name) {
      case "factory": return this.factory;
      case "amm": return this.amm;
      case "oracle": return this.oracle;
      case "automation": return this.automation;
    }
  }

  // Retry mechanism for transient failures
  async retryOperation<T>(
    operation: () => Promise<T>,
    options?: {
      maxRetries?: number;
      retryDelay?: number;
      backoffMultiplier?: number;
    }
  ): Promise<T> {
    const maxRetries = options?.maxRetries || 3;
    const retryDelay = options?.retryDelay || 1000;
    const backoffMultiplier = options?.backoffMultiplier || 2;
    
    let lastError: any;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const parsedError = parseContractError(error);
        
        // Don't retry on non-retryable errors
        if ([
          ErrorCode.ASSET_ALREADY_TOKENIZED,
          ErrorCode.INSUFFICIENT_BALANCE,
          ErrorCode.TRADE_EXPIRED,
          ErrorCode.SIGNER_REQUIRED,
        ].includes(parsedError.code)) {
          throw parsedError;
        }
        
        if (i < maxRetries - 1) {
          const delay = retryDelay * Math.pow(backoffMultiplier, i);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw parseContractError(lastError);
  }
}