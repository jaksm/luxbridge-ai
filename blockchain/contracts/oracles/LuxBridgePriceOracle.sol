// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LuxBridgePriceOracle is FunctionsClient, Ownable {
    using FunctionsRequest for FunctionsRequest.Request;

    struct PriceData {
        uint256 splintPrice;
        uint256 masterworksPrice;
        uint256 realTPrice;
        uint256 arbitrageSpread;
        uint256 timestamp;
        bool isValid;
    }

    struct PlatformAsset {
        string platform;
        string assetId;
        uint256 lastPrice;
        uint256 lastUpdate;
    }

    mapping(bytes32 => PriceData) public priceFeeds;
    mapping(string => mapping(string => PlatformAsset)) public platformAssets;
    mapping(bytes32 => bool) public pendingRequests;

    bytes32 public donId;
    uint64 public subscriptionId;
    uint32 public gasLimit;
    string public functionsSource;
    
    event PriceRequested(bytes32 indexed requestId, string assetId);
    event PriceUpdated(
        string indexed platform,
        string indexed assetId,
        uint256 price,
        uint256 timestamp
    );
    event ArbitrageOpportunity(
        string assetId,
        uint256 spread,
        uint256 threshold
    );

    error UnexpectedRequestID(bytes32 requestId);
    error EmptySource();
    error NoInlineSecrets();

    constructor(
        address router,
        bytes32 _donId,
        uint64 _subscriptionId,
        uint32 _gasLimit
    ) FunctionsClient(router) Ownable(msg.sender) {
        donId = _donId;
        subscriptionId = _subscriptionId;
        gasLimit = _gasLimit;
    }

    function setFunctionsSource(string calldata source) external onlyOwner {
        functionsSource = source;
    }

    function setSubscriptionId(uint64 _subscriptionId) external onlyOwner {
        subscriptionId = _subscriptionId;
    }

    function setGasLimit(uint32 _gasLimit) external onlyOwner {
        gasLimit = _gasLimit;
    }

    function requestCrossPlatformPrices(
        string calldata assetId,
        string[] calldata platforms
    ) external returns (bytes32 requestId) {
        if (bytes(functionsSource).length == 0) {
            revert EmptySource();
        }

        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(functionsSource);
        
        string[] memory args = new string[](platforms.length + 1);
        args[0] = assetId;
        for (uint256 i = 0; i < platforms.length; i++) {
            args[i + 1] = platforms[i];
        }
        req.setArgs(args);

        requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donId
        );

        pendingRequests[requestId] = true;
        emit PriceRequested(requestId, assetId);
    }

    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        if (!pendingRequests[requestId]) {
            revert UnexpectedRequestID(requestId);
        }
        
        delete pendingRequests[requestId];

        if (err.length > 0) {
            return;
        }

        (
            string memory assetId,
            uint256 splintPrice,
            uint256 masterworksPrice,
            uint256 realTPrice,
            uint256 arbitrageSpread
        ) = abi.decode(response, (string, uint256, uint256, uint256, uint256));

        bytes32 priceKey = keccak256(abi.encodePacked(assetId));
        
        priceFeeds[priceKey] = PriceData({
            splintPrice: splintPrice,
            masterworksPrice: masterworksPrice,
            realTPrice: realTPrice,
            arbitrageSpread: arbitrageSpread,
            timestamp: block.timestamp,
            isValid: true
        });

        if (splintPrice > 0) {
            platformAssets["splint_invest"][assetId] = PlatformAsset({
                platform: "splint_invest",
                assetId: assetId,
                lastPrice: splintPrice,
                lastUpdate: block.timestamp
            });
            emit PriceUpdated("splint_invest", assetId, splintPrice, block.timestamp);
        }

        if (masterworksPrice > 0) {
            platformAssets["masterworks"][assetId] = PlatformAsset({
                platform: "masterworks",
                assetId: assetId,
                lastPrice: masterworksPrice,
                lastUpdate: block.timestamp
            });
            emit PriceUpdated("masterworks", assetId, masterworksPrice, block.timestamp);
        }

        if (realTPrice > 0) {
            platformAssets["realt"][assetId] = PlatformAsset({
                platform: "realt",
                assetId: assetId,
                lastPrice: realTPrice,
                lastUpdate: block.timestamp
            });
            emit PriceUpdated("realt", assetId, realTPrice, block.timestamp);
        }

        if (arbitrageSpread > 500) {
            emit ArbitrageOpportunity(assetId, arbitrageSpread, 500);
        }
    }

    function getPrice(
        string calldata platform,
        string calldata assetId
    ) external view returns (uint256 price, uint256 timestamp) {
        PlatformAsset memory asset = platformAssets[platform][assetId];
        return (asset.lastPrice, asset.lastUpdate);
    }

    function getCrossPlatformPrices(
        string calldata assetId
    ) external view returns (PriceData memory) {
        bytes32 priceKey = keccak256(abi.encodePacked(assetId));
        return priceFeeds[priceKey];
    }

    function calculateArbitrageSpread(
        string calldata assetId,
        string calldata platformA,
        string calldata platformB
    ) external view returns (uint256 spread) {
        PlatformAsset memory assetA = platformAssets[platformA][assetId];
        PlatformAsset memory assetB = platformAssets[platformB][assetId];
        
        if (assetA.lastPrice == 0 || assetB.lastPrice == 0) {
            return 0;
        }

        uint256 maxPrice = assetA.lastPrice > assetB.lastPrice ? assetA.lastPrice : assetB.lastPrice;
        uint256 minPrice = assetA.lastPrice < assetB.lastPrice ? assetA.lastPrice : assetB.lastPrice;
        
        spread = ((maxPrice - minPrice) * 10000) / minPrice;
    }

    function mockPriceUpdate(
        string calldata platform,
        string calldata assetId,
        uint256 price
    ) external onlyOwner {
        platformAssets[platform][assetId] = PlatformAsset({
            platform: platform,
            assetId: assetId,
            lastPrice: price,
            lastUpdate: block.timestamp
        });
        
        emit PriceUpdated(platform, assetId, price, block.timestamp);
    }

    function isPriceStale(
        string calldata platform,
        string calldata assetId,
        uint256 maxAge
    ) external view returns (bool) {
        PlatformAsset memory asset = platformAssets[platform][assetId];
        return (block.timestamp - asset.lastUpdate) > maxAge;
    }
}
