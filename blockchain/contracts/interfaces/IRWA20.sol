// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IRWA20 {
    struct AssetMetadata {
        string platform;
        string assetId;
        uint256 totalSupply;
        string assetType;
        string subcategory;
        bytes32 legalHash;
        uint256 lastValuation;
        uint256 valuationTimestamp;
        uint256 sharePrice;
        uint256 availableShares;
        string currency;
    }

    struct PlatformInfo {
        string name;
        string apiEndpoint;
        bool isActive;
        uint256 totalAssetsTokenized;
        uint256 totalValueLocked;
    }

    event AssetTokenized(
        string indexed platform,
        string indexed assetId,
        address indexed tokenAddress,
        uint256 totalSupply,
        uint256 valuation
    );

    event AssetBurned(
        string indexed platform,
        string indexed assetId,
        address indexed holder,
        uint256 amount
    );

    event ValuationUpdated(
        string indexed platform,
        string indexed assetId,
        uint256 oldValuation,
        uint256 newValuation,
        uint256 timestamp
    );

    event CrossPlatformSwap(
        address indexed user,
        string sellPlatform,
        string sellAssetId,
        string buyPlatform,
        string buyAssetId,
        uint256 sellAmount,
        uint256 buyAmount
    );

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
    ) external returns (address tokenAddress);

    function burnTokens(
        string calldata platform,
        string calldata assetId,
        uint256 amount
    ) external;

    function updateValuation(
        string calldata platform,
        string calldata assetId,
        uint256 newValuation
    ) external;

    function getAssetMetadata(
        string calldata platform,
        string calldata assetId
    ) external view returns (AssetMetadata memory);

    function getPlatformInfo(
        string calldata platform
    ) external view returns (PlatformInfo memory);

    function getTokenAddress(
        string calldata platform,
        string calldata assetId
    ) external view returns (address);

    function verifyAssetBacking(
        string calldata platform,
        string calldata assetId,
        bytes calldata proof
    ) external view returns (bool);
}
