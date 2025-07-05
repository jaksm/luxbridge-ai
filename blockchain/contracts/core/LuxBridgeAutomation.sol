// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./LuxBridgeAMM.sol";
import "./RWATokenFactory.sol";

contract LuxBridgeAutomation is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct TradingPermission {
        uint256 maxTradeSize;
        uint256 dailyLimit;
        uint256 dailySpent;
        uint256 lastResetDay;
        bool isActive;
        string[] allowedAssets;
        mapping(string => bool) assetWhitelist;
    }

    struct AutomatedTrade {
        address user;
        string sellAsset;
        string buyAsset;
        uint256 amount;
        uint256 minAmountOut;
        uint256 deadline;
        bool executed;
        bool cancelled;
    }

    mapping(address => TradingPermission) public tradingPermissions;
    mapping(bytes32 => AutomatedTrade) public automatedTrades;
    mapping(address => uint256) public userNonces;
    
    LuxBridgeAMM public immutable amm;
    RWATokenFactory public immutable factory;
    address public aiAgent;
    
    uint256 public constant MAX_TRADE_SIZE = 1000000 * 10**18;
    uint256 public constant MAX_DAILY_LIMIT = 5000000 * 10**18;
    
    event TradingDelegated(
        address indexed user,
        uint256 maxTradeSize,
        uint256 dailyLimit,
        string[] allowedAssets
    );
    
    event TradingRevoked(address indexed user);
    
    event AutomatedTradeQueued(
        bytes32 indexed tradeId,
        address indexed user,
        string sellAsset,
        string buyAsset,
        uint256 amount
    );
    
    event AutomatedTradeExecuted(
        bytes32 indexed tradeId,
        address indexed user,
        uint256 amountOut
    );
    
    event AutomatedTradeCancelled(bytes32 indexed tradeId, address indexed user);

    modifier onlyAIAgent() {
        require(msg.sender == aiAgent, "Only AI agent");
        _;
    }

    constructor(
        address _amm,
        address _factory,
        address _aiAgent
    ) Ownable(msg.sender) {
        amm = LuxBridgeAMM(_amm);
        factory = RWATokenFactory(_factory);
        aiAgent = _aiAgent;
    }

    function setAIAgent(address _aiAgent) external onlyOwner {
        aiAgent = _aiAgent;
    }

    function delegateTrading(
        uint256 _maxTradeSize,
        uint256 _dailyLimit,
        string[] calldata _allowedAssets
    ) external {
        require(_maxTradeSize <= MAX_TRADE_SIZE, "Trade size too large");
        require(_dailyLimit <= MAX_DAILY_LIMIT, "Daily limit too large");
        require(_allowedAssets.length > 0, "Must allow at least one asset");

        TradingPermission storage permission = tradingPermissions[msg.sender];
        permission.maxTradeSize = _maxTradeSize;
        permission.dailyLimit = _dailyLimit;
        permission.dailySpent = 0;
        permission.lastResetDay = getCurrentDay();
        permission.isActive = true;
        permission.allowedAssets = _allowedAssets;
        
        for (uint256 i = 0; i < _allowedAssets.length; i++) {
            permission.assetWhitelist[_allowedAssets[i]] = true;
        }

        emit TradingDelegated(msg.sender, _maxTradeSize, _dailyLimit, _allowedAssets);
    }

    function revokeTradingPermission() external {
        delete tradingPermissions[msg.sender];
        emit TradingRevoked(msg.sender);
    }

    function queueAutomatedTrade(
        address user,
        string calldata sellAsset,
        string calldata buyAsset,
        uint256 amount,
        uint256 minAmountOut,
        uint256 deadline
    ) external onlyAIAgent returns (bytes32 tradeId) {
        require(_canExecuteTrade(user, sellAsset, buyAsset, amount), "Trade not permitted");
        
        tradeId = keccak256(abi.encodePacked(
            user,
            sellAsset,
            buyAsset,
            amount,
            userNonces[user]++,
            block.timestamp
        ));

        automatedTrades[tradeId] = AutomatedTrade({
            user: user,
            sellAsset: sellAsset,
            buyAsset: buyAsset,
            amount: amount,
            minAmountOut: minAmountOut,
            deadline: deadline,
            executed: false,
            cancelled: false
        });

        emit AutomatedTradeQueued(tradeId, user, sellAsset, buyAsset, amount);
    }

    function executeAutomatedTrade(
        bytes32 tradeId
    ) external onlyAIAgent nonReentrant returns (uint256 amountOut) {
        AutomatedTrade storage trade = automatedTrades[tradeId];
        require(!trade.executed, "Already executed");
        require(!trade.cancelled, "Trade cancelled");
        require(block.timestamp <= trade.deadline, "Trade expired");
        require(_canExecuteTrade(trade.user, trade.sellAsset, trade.buyAsset, trade.amount), "Trade not permitted");

        address sellTokenAddress = factory.getTokenAddress("", trade.sellAsset);
        address buyTokenAddress = factory.getTokenAddress("", trade.buyAsset);
        
        require(sellTokenAddress != address(0), "Sell token not found");
        require(buyTokenAddress != address(0), "Buy token not found");

        IERC20 sellToken = IERC20(sellTokenAddress);
        require(sellToken.balanceOf(trade.user) >= trade.amount, "Insufficient balance");
        require(sellToken.allowance(trade.user, address(this)) >= trade.amount, "Insufficient allowance");

        sellToken.safeTransferFrom(trade.user, address(this), trade.amount);
        sellToken.forceApprove(address(amm), trade.amount);

        amountOut = amm.swap(
            sellTokenAddress,
            buyTokenAddress,
            trade.amount,
            trade.minAmountOut
        );

        IERC20(buyTokenAddress).safeTransfer(trade.user, amountOut);

        _updateDailySpent(trade.user, trade.amount);
        trade.executed = true;

        emit AutomatedTradeExecuted(tradeId, trade.user, amountOut);
    }

    function cancelAutomatedTrade(bytes32 tradeId) external {
        AutomatedTrade storage trade = automatedTrades[tradeId];
        require(msg.sender == trade.user || msg.sender == aiAgent, "Not authorized");
        require(!trade.executed, "Already executed");
        require(!trade.cancelled, "Already cancelled");

        trade.cancelled = true;
        emit AutomatedTradeCancelled(tradeId, trade.user);
    }

    function batchExecuteTrades(
        bytes32[] calldata tradeIds
    ) external onlyAIAgent returns (uint256[] memory amountsOut) {
        amountsOut = new uint256[](tradeIds.length);
        
        for (uint256 i = 0; i < tradeIds.length; i++) {
            try this.executeAutomatedTrade(tradeIds[i]) returns (uint256 amountOut) {
                amountsOut[i] = amountOut;
            } catch {
                amountsOut[i] = 0;
            }
        }
    }

    function getOptimalTradeRoute(
        address user,
        string calldata sellAsset,
        string calldata buyAsset,
        uint256 amount
    ) external view returns (
        address[] memory path,
        uint256 estimatedAmountOut
    ) {
        require(_canExecuteTrade(user, sellAsset, buyAsset, amount), "Trade not permitted");
        
        address sellTokenAddress = factory.getTokenAddress("", sellAsset);
        address buyTokenAddress = factory.getTokenAddress("", buyAsset);
        
        path = new address[](2);
        path[0] = sellTokenAddress;
        path[1] = buyTokenAddress;
        
        estimatedAmountOut = amm.getAmountOut(sellTokenAddress, buyTokenAddress, amount);
    }

    function simulateArbitrageStrategy(
        address user,
        string calldata, // assetId - unused for now
        uint256 amount
    ) external view returns (
        bool profitable,
        uint256 estimatedProfit,
        string memory strategy
    ) {
        TradingPermission storage permission = tradingPermissions[user];
        require(permission.isActive, "Trading not delegated");
        require(amount <= permission.maxTradeSize, "Amount exceeds max trade size");

        profitable = false;
        estimatedProfit = 0;
        strategy = "No arbitrage opportunity";

        return (profitable, estimatedProfit, strategy);
    }

    function getTradingPermission(
        address user
    ) external view returns (
        uint256 maxTradeSize,
        uint256 dailyLimit,
        uint256 dailySpent,
        uint256 remainingDaily,
        bool isActive,
        string[] memory allowedAssets
    ) {
        TradingPermission storage permission = tradingPermissions[user];
        
        uint256 currentDay = getCurrentDay();
        if (currentDay > permission.lastResetDay) {
            dailySpent = 0;
        } else {
            dailySpent = permission.dailySpent;
        }
        
        remainingDaily = permission.dailyLimit > dailySpent ? 
            permission.dailyLimit - dailySpent : 0;

        return (
            permission.maxTradeSize,
            permission.dailyLimit,
            dailySpent,
            remainingDaily,
            permission.isActive,
            permission.allowedAssets
        );
    }

    function _canExecuteTrade(
        address user,
        string memory sellAsset,
        string memory buyAsset,
        uint256 amount
    ) internal view returns (bool) {
        TradingPermission storage permission = tradingPermissions[user];
        
        if (!permission.isActive) return false;
        if (amount > permission.maxTradeSize) return false;
        if (!permission.assetWhitelist[sellAsset]) return false;
        if (!permission.assetWhitelist[buyAsset]) return false;
        
        uint256 currentDay = getCurrentDay();
        uint256 dailySpent = currentDay > permission.lastResetDay ? 0 : permission.dailySpent;
        
        if (dailySpent + amount > permission.dailyLimit) return false;
        
        return true;
    }

    function _updateDailySpent(address user, uint256 amount) internal {
        TradingPermission storage permission = tradingPermissions[user];
        uint256 currentDay = getCurrentDay();
        
        if (currentDay > permission.lastResetDay) {
            permission.dailySpent = amount;
            permission.lastResetDay = currentDay;
        } else {
            permission.dailySpent += amount;
        }
    }

    function getCurrentDay() public view returns (uint256) {
        return block.timestamp / 86400;
    }
}
