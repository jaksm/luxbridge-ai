export enum ErrorCode {
  // Network errors
  NETWORK_ERROR = "NETWORK_ERROR",
  RPC_ERROR = "RPC_ERROR",
  CHAIN_MISMATCH = "CHAIN_MISMATCH",
  
  // Transaction errors
  TRANSACTION_FAILED = "TRANSACTION_FAILED",
  TRANSACTION_REVERTED = "TRANSACTION_REVERTED",
  INSUFFICIENT_GAS = "INSUFFICIENT_GAS",
  NONCE_TOO_LOW = "NONCE_TOO_LOW",
  
  // Contract errors
  CONTRACT_NOT_FOUND = "CONTRACT_NOT_FOUND",
  INVALID_CONTRACT_ADDRESS = "INVALID_CONTRACT_ADDRESS",
  CONTRACT_CALL_FAILED = "CONTRACT_CALL_FAILED",
  
  // SDK errors
  SIGNER_REQUIRED = "SIGNER_REQUIRED",
  INVALID_PARAMETERS = "INVALID_PARAMETERS",
  OPERATION_NOT_SUPPORTED = "OPERATION_NOT_SUPPORTED",
  
  // Business logic errors
  ASSET_ALREADY_TOKENIZED = "ASSET_ALREADY_TOKENIZED",
  ASSET_NOT_FOUND = "ASSET_NOT_FOUND",
  PLATFORM_NOT_REGISTERED = "PLATFORM_NOT_REGISTERED",
  INSUFFICIENT_BALANCE = "INSUFFICIENT_BALANCE",
  POOL_NOT_FOUND = "POOL_NOT_FOUND",
  INSUFFICIENT_LIQUIDITY = "INSUFFICIENT_LIQUIDITY",
  SLIPPAGE_EXCEEDED = "SLIPPAGE_EXCEEDED",
  TRADING_NOT_DELEGATED = "TRADING_NOT_DELEGATED",
  TRADE_LIMIT_EXCEEDED = "TRADE_LIMIT_EXCEEDED",
  TRADE_NOT_FOUND = "TRADE_NOT_FOUND",
  TRADE_EXPIRED = "TRADE_EXPIRED",
  
  // Oracle errors
  PRICE_NOT_AVAILABLE = "PRICE_NOT_AVAILABLE",
  ORACLE_REQUEST_FAILED = "ORACLE_REQUEST_FAILED",
  
  // Unknown
  UNKNOWN_ERROR = "UNKNOWN_ERROR"
}

export class LuxBridgeError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = "LuxBridgeError";
  }
}

export function parseContractError(error: any): LuxBridgeError {
  // Handle ethers v6 errors
  if (error?.code === "CALL_EXCEPTION") {
    const reason = error.reason || error.data?.message || "Contract call failed";
    
    // Parse common revert reasons
    if (reason.includes("Asset already tokenized")) {
      return new LuxBridgeError(ErrorCode.ASSET_ALREADY_TOKENIZED, "Asset has already been tokenized", error);
    }
    if (reason.includes("Platform not registered")) {
      return new LuxBridgeError(ErrorCode.PLATFORM_NOT_REGISTERED, "Platform is not registered", error);
    }
    if (reason.includes("Insufficient balance")) {
      return new LuxBridgeError(ErrorCode.INSUFFICIENT_BALANCE, "Insufficient token balance", error);
    }
    if (reason.includes("Pool does not exist")) {
      return new LuxBridgeError(ErrorCode.POOL_NOT_FOUND, "Liquidity pool not found", error);
    }
    if (reason.includes("Insufficient liquidity")) {
      return new LuxBridgeError(ErrorCode.INSUFFICIENT_LIQUIDITY, "Pool has insufficient liquidity", error);
    }
    if (reason.includes("Slippage")) {
      return new LuxBridgeError(ErrorCode.SLIPPAGE_EXCEEDED, "Slippage tolerance exceeded", error);
    }
    if (reason.includes("No delegation")) {
      return new LuxBridgeError(ErrorCode.TRADING_NOT_DELEGATED, "Trading permissions not delegated", error);
    }
    if (reason.includes("Trade limit exceeded")) {
      return new LuxBridgeError(ErrorCode.TRADE_LIMIT_EXCEEDED, "Trade exceeds delegation limits", error);
    }
    if (reason.includes("Trade not found")) {
      return new LuxBridgeError(ErrorCode.TRADE_NOT_FOUND, "Automated trade not found", error);
    }
    if (reason.includes("Trade expired")) {
      return new LuxBridgeError(ErrorCode.TRADE_EXPIRED, "Trade deadline has passed", error);
    }
    if (reason.includes("Only oracle")) {
      return new LuxBridgeError(ErrorCode.CONTRACT_CALL_FAILED, "Only oracle can call this function", error);
    }
    
    return new LuxBridgeError(ErrorCode.CONTRACT_CALL_FAILED, reason, error);
  }
  
  // Network errors
  if (error?.code === "NETWORK_ERROR") {
    return new LuxBridgeError(ErrorCode.NETWORK_ERROR, "Network connection failed", error);
  }
  
  if (error?.code === "SERVER_ERROR") {
    return new LuxBridgeError(ErrorCode.RPC_ERROR, "RPC server error", error);
  }
  
  // Transaction errors
  if (error?.code === "INSUFFICIENT_FUNDS") {
    return new LuxBridgeError(ErrorCode.INSUFFICIENT_GAS, "Insufficient funds for gas", error);
  }
  
  if (error?.code === "NONCE_EXPIRED") {
    return new LuxBridgeError(ErrorCode.NONCE_TOO_LOW, "Transaction nonce too low", error);
  }
  
  if (error?.code === "TRANSACTION_REPLACED") {
    return new LuxBridgeError(ErrorCode.TRANSACTION_FAILED, "Transaction was replaced", error);
  }
  
  // Generic transaction revert
  if (error?.receipt?.status === 0) {
    return new LuxBridgeError(ErrorCode.TRANSACTION_REVERTED, "Transaction reverted", error);
  }
  
  // Fallback
  return new LuxBridgeError(
    ErrorCode.UNKNOWN_ERROR, 
    error?.message || "An unknown error occurred", 
    error
  );
}

export function isLuxBridgeError(error: any): error is LuxBridgeError {
  return error instanceof LuxBridgeError;
}

export function formatErrorForUser(error: LuxBridgeError): string {
  switch (error.code) {
    case ErrorCode.ASSET_ALREADY_TOKENIZED:
      return "This asset has already been tokenized. Use the existing token address for trading.";
    
    case ErrorCode.PLATFORM_NOT_REGISTERED:
      return "The specified platform is not registered. Contact admin to register the platform.";
    
    case ErrorCode.INSUFFICIENT_BALANCE:
      return "You don't have enough tokens for this operation. Check your balance and try again.";
    
    case ErrorCode.POOL_NOT_FOUND:
      return "No liquidity pool exists for this token pair. Create a pool first or choose different tokens.";
    
    case ErrorCode.INSUFFICIENT_LIQUIDITY:
      return "The pool doesn't have enough liquidity for this trade. Try a smaller amount.";
    
    case ErrorCode.SLIPPAGE_EXCEEDED:
      return "Price changed too much during execution. Increase slippage tolerance or try again.";
    
    case ErrorCode.TRADING_NOT_DELEGATED:
      return "You haven't delegated trading permissions. Use delegate_trading_permissions first.";
    
    case ErrorCode.TRADE_LIMIT_EXCEEDED:
      return "This trade exceeds your delegation limits. Increase limits or reduce trade size.";
    
    case ErrorCode.SIGNER_REQUIRED:
      return "This operation requires a wallet. Provide a private key in SDK configuration.";
    
    case ErrorCode.NETWORK_ERROR:
      return "Network connection failed. Check your internet connection and RPC settings.";
    
    case ErrorCode.INSUFFICIENT_GAS:
      return "Insufficient funds for gas fees. Add ETH to your wallet.";
    
    default:
      return error.message;
  }
}