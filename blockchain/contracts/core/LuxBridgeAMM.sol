// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IRWA20.sol";

contract LuxBridgeAMM is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct LiquidityPool {
        address tokenA;
        address tokenB;
        uint256 reserveA;
        uint256 reserveB;
        uint256 totalLiquidity;
        uint256 swapFee;
        bool isActive;
    }

    struct SwapRoute {
        address[] path;
        uint256[] amounts;
        uint256 totalAmountOut;
    }

    mapping(bytes32 => LiquidityPool) public pools;
    mapping(bytes32 => mapping(address => uint256)) public liquidityBalances;
    mapping(address => bool) public supportedTokens;
    
    uint256 public constant MINIMUM_LIQUIDITY = 1000;
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public defaultSwapFee = 30;
    
    address public factory;
    address public router;
    
    event PoolCreated(
        address indexed tokenA,
        address indexed tokenB,
        bytes32 poolId
    );
    
    event LiquidityAdded(
        bytes32 indexed poolId,
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );
    
    event LiquidityRemoved(
        bytes32 indexed poolId,
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );
    
    event Swap(
        bytes32 indexed poolId,
        address indexed trader,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut
    );

    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory");
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setFactory(address _factory) external onlyOwner {
        factory = _factory;
    }

    function setDefaultSwapFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1000, "Fee too high");
        defaultSwapFee = _fee;
    }

    function createPool(
        address tokenA,
        address tokenB,
        uint256 swapFee
    ) external returns (bytes32 poolId) {
        require(tokenA != tokenB, "Identical tokens");
        require(tokenA != address(0) && tokenB != address(0), "Zero address");
        require(swapFee <= 1000, "Fee too high");
        
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        poolId = keccak256(abi.encodePacked(token0, token1));
        
        require(pools[poolId].tokenA == address(0), "Pool exists");
        
        pools[poolId] = LiquidityPool({
            tokenA: token0,
            tokenB: token1,
            reserveA: 0,
            reserveB: 0,
            totalLiquidity: 0,
            swapFee: swapFee == 0 ? defaultSwapFee : swapFee,
            isActive: true
        });
        
        supportedTokens[token0] = true;
        supportedTokens[token1] = true;
        
        emit PoolCreated(token0, token1, poolId);
    }

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) external nonReentrant returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        bytes32 poolId = getPoolId(tokenA, tokenB);
        LiquidityPool storage pool = pools[poolId];
        require(pool.isActive, "Pool not active");
        
        (amountA, amountB) = _calculateOptimalAmounts(
            pool,
            amountADesired,
            amountBDesired,
            amountAMin,
            amountBMin
        );
        
        IERC20(pool.tokenA).safeTransferFrom(msg.sender, address(this), amountA);
        IERC20(pool.tokenB).safeTransferFrom(msg.sender, address(this), amountB);
        
        if (pool.totalLiquidity == 0) {
            liquidity = _sqrt(amountA * amountB) - MINIMUM_LIQUIDITY;
            liquidityBalances[poolId][address(0)] = MINIMUM_LIQUIDITY;
        } else {
            uint256 liquidityA = (amountA * pool.totalLiquidity) / pool.reserveA;
            uint256 liquidityB = (amountB * pool.totalLiquidity) / pool.reserveB;
            liquidity = liquidityA < liquidityB ? liquidityA : liquidityB;
        }
        
        require(liquidity > 0, "Insufficient liquidity");
        
        pool.reserveA += amountA;
        pool.reserveB += amountB;
        pool.totalLiquidity += liquidity;
        liquidityBalances[poolId][msg.sender] += liquidity;
        
        emit LiquidityAdded(poolId, msg.sender, amountA, amountB, liquidity);
    }

    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin
    ) external nonReentrant returns (uint256 amountA, uint256 amountB) {
        bytes32 poolId = getPoolId(tokenA, tokenB);
        LiquidityPool storage pool = pools[poolId];
        require(pool.isActive, "Pool not active");
        require(liquidityBalances[poolId][msg.sender] >= liquidity, "Insufficient balance");
        
        amountA = (liquidity * pool.reserveA) / pool.totalLiquidity;
        amountB = (liquidity * pool.reserveB) / pool.totalLiquidity;
        
        require(amountA >= amountAMin, "Insufficient A");
        require(amountB >= amountBMin, "Insufficient B");
        
        pool.reserveA -= amountA;
        pool.reserveB -= amountB;
        pool.totalLiquidity -= liquidity;
        liquidityBalances[poolId][msg.sender] -= liquidity;
        
        IERC20(pool.tokenA).safeTransfer(msg.sender, amountA);
        IERC20(pool.tokenB).safeTransfer(msg.sender, amountB);
        
        emit LiquidityRemoved(poolId, msg.sender, amountA, amountB, liquidity);
    }

    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin
    ) external nonReentrant returns (uint256 amountOut) {
        bytes32 poolId = getPoolId(tokenIn, tokenOut);
        LiquidityPool storage pool = pools[poolId];
        require(pool.isActive, "Pool not active");
        
        bool isTokenA = tokenIn == pool.tokenA;
        
        uint256 amountInWithFee = (amountIn * (FEE_DENOMINATOR - pool.swapFee)) / FEE_DENOMINATOR;
        
        uint256 reserveIn = isTokenA ? pool.reserveA : pool.reserveB;
        uint256 reserveOut = isTokenA ? pool.reserveB : pool.reserveA;
        
        amountOut = (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee);
        require(amountOut >= amountOutMin, "Insufficient output");
        
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);
        
        if (isTokenA) {
            pool.reserveA += amountIn;
            pool.reserveB -= amountOut;
        } else {
            pool.reserveB += amountIn;
            pool.reserveA -= amountOut;
        }
        
        emit Swap(poolId, msg.sender, tokenIn, tokenOut, amountIn, amountOut);
    }

    function getAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        bytes32 poolId = getPoolId(tokenIn, tokenOut);
        LiquidityPool storage pool = pools[poolId];
        require(pool.isActive, "Pool not active");
        
        bool isTokenA = tokenIn == pool.tokenA;
        uint256 reserveIn = isTokenA ? pool.reserveA : pool.reserveB;
        uint256 reserveOut = isTokenA ? pool.reserveB : pool.reserveA;
        
        uint256 amountInWithFee = (amountIn * (FEE_DENOMINATOR - pool.swapFee)) / FEE_DENOMINATOR;
        amountOut = (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee);
    }

    function findBestRoute(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (SwapRoute memory) {
        bytes32 directPoolId = getPoolId(tokenIn, tokenOut);
        
        if (pools[directPoolId].isActive) {
            address[] memory path = new address[](2);
            path[0] = tokenIn;
            path[1] = tokenOut;
            
            uint256[] memory amounts = new uint256[](2);
            amounts[0] = amountIn;
            amounts[1] = this.getAmountOut(tokenIn, tokenOut, amountIn);
            
            return SwapRoute({
                path: path,
                amounts: amounts,
                totalAmountOut: amounts[1]
            });
        }
        
        return SwapRoute({
            path: new address[](0),
            amounts: new uint256[](0),
            totalAmountOut: 0
        });
    }

    function getPoolId(address tokenA, address tokenB) public pure returns (bytes32) {
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        return keccak256(abi.encodePacked(token0, token1));
    }

    function getPool(bytes32 poolId) external view returns (LiquidityPool memory) {
        return pools[poolId];
    }

    function _calculateOptimalAmounts(
        LiquidityPool storage pool,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) private view returns (uint256 amountA, uint256 amountB) {
        if (pool.reserveA == 0 && pool.reserveB == 0) {
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint256 amountBOptimal = (amountADesired * pool.reserveB) / pool.reserveA;
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, "Insufficient B");
                (amountA, amountB) = (amountADesired, amountBOptimal);
            } else {
                uint256 amountAOptimal = (amountBDesired * pool.reserveA) / pool.reserveB;
                assert(amountAOptimal <= amountADesired);
                require(amountAOptimal >= amountAMin, "Insufficient A");
                (amountA, amountB) = (amountAOptimal, amountBDesired);
            }
        }
    }

    function _sqrt(uint256 x) private pure returns (uint256 y) {
        if (x > 3) {
            y = x;
            uint256 z = (x + 1) / 2;
            while (z < y) {
                y = z;
                z = (x / z + z) / 2;
            }
        } else if (x != 0) {
            y = 1;
        }
    }
}
