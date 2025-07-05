// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./RWA20Token.sol";
import "../interfaces/IRWA20.sol";

contract RWATokenFactory is IRWA20, Ownable, ReentrancyGuard {
    struct PackedAsset {
        uint128 totalShares;
        uint64 lastUpdate;
        uint32 assetType;
        uint32 platformId;
        bool isActive;
    }

    struct TokenizationParams {
        string platform;
        string assetId;
        uint256 totalSupply;
        string assetType;
        string subcategory;
        bytes32 legalHash;
        uint256 valuation;
        uint256 sharePrice;
        string currency;
    }

    mapping(bytes32 => address) private assetToToken;
    mapping(string => uint32) private platformNameToId;
    mapping(uint32 => PlatformInfo) private platforms;
    mapping(address => PackedAsset) private tokenInfo;
    
    uint32 private nextPlatformId = 1;
    address public priceOracle;
    
    modifier onlyOracle() {
        require(msg.sender == priceOracle, "Only oracle");
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setPriceOracle(address _oracle) external onlyOwner {
        priceOracle = _oracle;
    }

    function registerPlatform(
        string calldata name,
        string calldata apiEndpoint
    ) external onlyOwner returns (uint32) {
        require(platformNameToId[name] == 0, "Platform exists");
        
        uint32 platformId = nextPlatformId++;
        platformNameToId[name] = platformId;
        
        platforms[platformId] = PlatformInfo({
            name: name,
            apiEndpoint: apiEndpoint,
            isActive: true,
            totalAssetsTokenized: 0,
            totalValueLocked: 0
        });
        
        return platformId;
    }

    function tokenizeAsset(
        string calldata platform,
        string calldata assetId,
        uint256 totalSupply,
        string calldata assetType,
        string calldata subcategory,
        bytes32 legalHash,
        uint256 valuation,
        uint256 sharePrice,
        string calldata currency
    ) public override nonReentrant returns (address tokenAddress) {
        tokenAddress = _createToken(platform, assetId, totalSupply, assetType, subcategory, legalHash, valuation, sharePrice, currency);
    }
    
    function _createToken(
        string memory platform,
        string memory assetId,
        uint256 totalSupply,
        string memory assetType,
        string memory subcategory,
        bytes32 legalHash,
        uint256 valuation,
        uint256 sharePrice,
        string memory currency
    ) private returns (address tokenAddress) {
        uint32 platformId = platformNameToId[platform];
        require(platformId != 0, "Platform not registered");
        require(platforms[platformId].isActive, "Platform inactive");
        
        bytes32 assetKey = keccak256(abi.encodePacked(platform, assetId));
        require(assetToToken[assetKey] == address(0), "Asset already tokenized");
        
        string memory name = string(abi.encodePacked("RWA-", platform, "-", assetId));
        string memory symbol = string(abi.encodePacked("s", platform));
        
        RWA20Token token = new RWA20Token(
            name,
            symbol,
            platform,
            assetId,
            assetType,
            subcategory,
            legalHash,
            totalSupply,
            valuation,
            sharePrice,
            currency,
            address(this)
        );
        
        tokenAddress = address(token);
        assetToToken[assetKey] = tokenAddress;
        
        tokenInfo[tokenAddress] = PackedAsset({
            totalShares: uint128(totalSupply),
            lastUpdate: uint64(block.timestamp),
            assetType: _encodeAssetType(assetType),
            platformId: platformId,
            isActive: true
        });
        
        platforms[platformId].totalAssetsTokenized++;
        platforms[platformId].totalValueLocked += valuation;
        
        token.transfer(msg.sender, totalSupply);
        
        emit AssetTokenized(platform, assetId, tokenAddress, totalSupply, valuation);
    }

    function batchTokenize(
        string[] calldata platformNames,
        string[] calldata assetIds,
        uint256[] calldata totalSupplies,
        string[] calldata assetTypes,
        string[] calldata subcategories,
        bytes32[] calldata legalHashes,
        uint256[] calldata valuations,
        uint256[] calldata sharePrices,
        string[] calldata currencies
    ) external nonReentrant returns (address[] memory tokenAddresses) {
        require(
            platformNames.length == assetIds.length &&
            assetIds.length == totalSupplies.length &&
            totalSupplies.length == assetTypes.length &&
            assetTypes.length == subcategories.length &&
            subcategories.length == legalHashes.length &&
            legalHashes.length == valuations.length &&
            valuations.length == sharePrices.length &&
            sharePrices.length == currencies.length,
            "Array length mismatch"
        );
        
        tokenAddresses = new address[](platformNames.length);
        
        for (uint256 i = 0; i < platformNames.length; i++) {
            tokenAddresses[i] = tokenizeAsset(
                platformNames[i],
                assetIds[i],
                totalSupplies[i],
                assetTypes[i],
                subcategories[i],
                legalHashes[i],
                valuations[i],
                sharePrices[i],
                currencies[i]
            );
        }
    }

    function burnTokens(
        string calldata platform,
        string calldata assetId,
        uint256 amount
    ) external override {
        bytes32 assetKey = keccak256(abi.encodePacked(platform, assetId));
        address tokenAddress = assetToToken[assetKey];
        require(tokenAddress != address(0), "Token not found");
        
        RWA20Token token = RWA20Token(tokenAddress);
        token.burnFrom(msg.sender, amount);
        
        PackedAsset storage packed = tokenInfo[tokenAddress];
        packed.totalShares = uint128(token.totalSupply());
        packed.lastUpdate = uint64(block.timestamp);
        
        emit AssetBurned(platform, assetId, msg.sender, amount);
    }

    function updateValuation(
        string calldata platform,
        string calldata assetId,
        uint256 newValuation
    ) external override onlyOracle {
        bytes32 assetKey = keccak256(abi.encodePacked(platform, assetId));
        address tokenAddress = assetToToken[assetKey];
        require(tokenAddress != address(0), "Token not found");
        
        RWA20Token token = RWA20Token(tokenAddress);
        uint256 oldValuation = token.lastValuation();
        token.updateValuation(newValuation);
        
        PackedAsset storage packed = tokenInfo[tokenAddress];
        packed.lastUpdate = uint64(block.timestamp);
        
        uint32 platformId = packed.platformId;
        platforms[platformId].totalValueLocked = 
            platforms[platformId].totalValueLocked - oldValuation + newValuation;
        
        emit ValuationUpdated(platform, assetId, oldValuation, newValuation, block.timestamp);
    }

    function getAssetMetadata(
        string calldata platform,
        string calldata assetId
    ) external view override returns (AssetMetadata memory) {
        bytes32 assetKey = keccak256(abi.encodePacked(platform, assetId));
        address tokenAddress = assetToToken[assetKey];
        require(tokenAddress != address(0), "Token not found");
        
        return RWA20Token(tokenAddress).getMetadata();
    }

    function getPlatformInfo(
        string calldata platform
    ) external view override returns (PlatformInfo memory) {
        uint32 platformId = platformNameToId[platform];
        require(platformId != 0, "Platform not found");
        return platforms[platformId];
    }

    function getTokenAddress(
        string calldata platform,
        string calldata assetId
    ) external view override returns (address) {
        bytes32 assetKey = keccak256(abi.encodePacked(platform, assetId));
        return assetToToken[assetKey];
    }

    function verifyAssetBacking(
        string calldata platform,
        string calldata assetId,
        bytes calldata proof
    ) external view override returns (bool) {
        bytes32 assetKey = keccak256(abi.encodePacked(platform, assetId));
        address tokenAddress = assetToToken[assetKey];
        if (tokenAddress == address(0)) return false;
        
        return proof.length > 0;
    }

    function _encodeAssetType(string memory assetType) private pure returns (uint32) {
        bytes32 hash = keccak256(bytes(assetType));
        if (hash == keccak256("wine")) return 1;
        if (hash == keccak256("art")) return 2;
        if (hash == keccak256("real_estate")) return 3;
        if (hash == keccak256("whiskey")) return 4;
        if (hash == keccak256("collectibles")) return 5;
        return 99;
    }
}
