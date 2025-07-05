// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IRWA20.sol";

interface IExtendedRWA20 is IRWA20 {
    struct ExtendedAssetMetadata {
        // Core fields (from existing AssetMetadata)
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
        
        // Extended blockchain-relevant fields
        string name;                    // Asset display name
        string description;             // Brief asset description
        uint256 createdAt;             // Creation timestamp
        uint256 updatedAt;             // Last update timestamp
        string valuationFrequency;     // "monthly" | "quarterly" | "annual"
        uint256 minimumInvestmentYears; // Minimum recommended holding period
        uint256 riskScore;             // Overall risk score (0-100)
        string riskCategory;           // "conservative" | "moderate" | "aggressive" | "speculative"
        string condition;              // Asset condition for physical assets
        bytes32 expertCertificationHash; // Hash of expert certification documents
    }

    struct InvestmentMetrics {
        uint256 conservativeYield;     // Conservative annual yield (basis points)
        uint256 realisticYield;        // Realistic annual yield (basis points)
        uint256 optimisticYield;       // Optimistic annual yield (basis points)
        uint256 liquidityScore;        // Liquidity score (0-100)
        uint256 diversificationScore;  // Diversification benefit score (0-100)
        uint256 lastMetricsUpdate;     // Last metrics update timestamp
    }

    event ExtendedAssetTokenized(
        string indexed platform,
        string indexed assetId,
        address indexed tokenAddress,
        string name,
        uint256 riskScore,
        uint256 minimumInvestmentYears
    );

    event InvestmentMetricsUpdated(
        string indexed platform,
        string indexed assetId,
        uint256 conservativeYield,
        uint256 realisticYield,
        uint256 optimisticYield,
        uint256 liquidityScore
    );

    function getExtendedAssetMetadata(
        string calldata platform,
        string calldata assetId
    ) external view returns (ExtendedAssetMetadata memory);

    function getInvestmentMetrics(
        string calldata platform,
        string calldata assetId
    ) external view returns (InvestmentMetrics memory);

    function updateInvestmentMetrics(
        string calldata platform,
        string calldata assetId,
        InvestmentMetrics calldata metrics
    ) external;

    function updateAssetDescription(
        string calldata platform,
        string calldata assetId,
        string calldata name,
        string calldata description
    ) external;
}