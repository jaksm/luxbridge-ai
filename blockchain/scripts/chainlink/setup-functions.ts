import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Chainlink Functions configuration
const CHAINLINK_FUNCTIONS_ROUTER = {
  sepolia: "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0",
  polygon_mumbai: "0x6E2dc0F9DB014aE19888F539E59285D2Ea04244C",
};

const LINK_TOKEN = {
  sepolia: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
  polygon_mumbai: "0x326C977E6efc84E512bB9C30f76E30c160eD06FB",
};

async function setupChainlinkFunctions() {
  console.log("🔗 Setting up Chainlink Functions for cross-platform pricing...\n");

  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name;

  if (!["sepolia", "polygon_mumbai"].includes(networkName)) {
    console.log("⚠️  Chainlink Functions only available on Sepolia and Polygon Mumbai");
    console.log("   Using mock implementation for local testing");
    return;
  }

  console.log(`Network: ${networkName}`);
  console.log(`Deployer: ${deployer.address}`);

  // Deploy or get oracle contract
  const oracleAddress = await deployOrGetOracle();
  const oracle = await ethers.getContractAt("LuxBridgePriceOracle", oracleAddress);

  // Create subscription
  console.log("\n1️⃣ Creating Chainlink Functions subscription...");
  const subscriptionId = await createSubscription(networkName);
  console.log(`✅ Subscription ID: ${subscriptionId}`);

  // Fund subscription with LINK
  console.log("\n2️⃣ Funding subscription with LINK...");
  await fundSubscription(networkName, subscriptionId, "5"); // 5 LINK
  console.log("✅ Subscription funded");

  // Add oracle as consumer
  console.log("\n3️⃣ Adding oracle contract as consumer...");
  await addConsumer(networkName, subscriptionId, oracleAddress);
  console.log("✅ Oracle added as consumer");

  // Configure oracle
  console.log("\n4️⃣ Configuring oracle contract...");
  await oracle.setChainlinkConfig(
    CHAINLINK_FUNCTIONS_ROUTER[networkName as keyof typeof CHAINLINK_FUNCTIONS_ROUTER],
    subscriptionId
  );
  console.log("✅ Oracle configured");

  // Save configuration
  const config = {
    network: networkName,
    oracle: oracleAddress,
    subscriptionId,
    router: CHAINLINK_FUNCTIONS_ROUTER[networkName as keyof typeof CHAINLINK_FUNCTIONS_ROUTER],
    linkToken: LINK_TOKEN[networkName as keyof typeof LINK_TOKEN],
  };

  fs.writeFileSync(
    path.join(__dirname, `../../deployments/${networkName}/chainlink-config.json`),
    JSON.stringify(config, null, 2)
  );

  console.log("\n✅ Chainlink Functions setup complete!");
  console.log("\n📝 Configuration saved to deployments/chainlink-config.json");
}

async function deployOrGetOracle(): Promise<string> {
  // Check if already deployed
  const deploymentPath = path.join(__dirname, "../../deployments/localhost/LuxBridgePriceOracle.json");
  if (fs.existsSync(deploymentPath)) {
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    return deployment.address;
  }

  // Deploy new oracle
  const LuxBridgePriceOracle = await ethers.getContractFactory("LuxBridgePriceOracle");
  const oracle = await LuxBridgePriceOracle.deploy();
  await oracle.waitForDeployment();

  return await oracle.getAddress();
}

async function createSubscription(network: string): Promise<number> {
  // This would interact with Chainlink Functions router
  // For now, return mock subscription ID
  return 123;
}

async function fundSubscription(network: string, subscriptionId: number, amount: string) {
  // This would transfer LINK tokens to the subscription
  console.log(`   Would fund subscription ${subscriptionId} with ${amount} LINK`);
}

async function addConsumer(network: string, subscriptionId: number, consumer: string) {
  // This would add the consumer to the subscription
  console.log(`   Would add ${consumer} as consumer to subscription ${subscriptionId}`);
}

// Enhanced Oracle contract with Chainlink Functions
const ENHANCED_ORACLE_SOURCE = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";

contract LuxBridgePriceOracleV2 is FunctionsClient {
    using FunctionsRequest for FunctionsRequest.Request;

    struct PriceData {
        uint256 price;
        uint256 timestamp;
    }

    mapping(bytes32 => PriceData) private prices;
    mapping(bytes32 => bytes32) private pendingRequests;
    
    address public router;
    uint64 public subscriptionId;
    uint32 public gasLimit = 300000;
    bytes32 public donId = hex"66756e2d706f6c79676f6e2d6d756d6261692d31"; // fun-polygon-mumbai-1

    event PriceRequested(bytes32 indexed requestId, string platform, string assetId);
    event PriceUpdated(string platform, string assetId, uint256 price);

    constructor(address _router) FunctionsClient(_router) {
        router = _router;
    }

    function requestCrossPlatformPrices(
        string calldata assetId,
        string[] calldata platforms
    ) external returns (bytes32 requestId) {
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(getPriceSource());

        string[] memory args = new string[](platforms.length + 1);
        args[0] = assetId;
        for (uint i = 0; i < platforms.length; i++) {
            args[i + 1] = platforms[i];
        }
        req.setArgs(args);

        requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            gasLimit,
            donId
        );

        pendingRequests[requestId] = keccak256(abi.encodePacked(assetId));
        emit PriceRequested(requestId, platforms[0], assetId);

        return requestId;
    }

    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        if (err.length > 0) {
            emit RequestFailed(requestId, err);
            return;
        }

        uint256 price = abi.decode(response, (uint256));
        bytes32 assetKey = pendingRequests[requestId];
        
        prices[assetKey] = PriceData({
            price: price,
            timestamp: block.timestamp
        });

        delete pendingRequests[requestId];
    }

    function getPriceSource() private pure returns (string memory) {
        return \`
            const assetId = args[0];
            const platforms = args.slice(1);
            
            const requests = platforms.map(platform => {
                const url = \\\`https://mock-api.luxbridge.ai/\\\${platform}/assets/\\\${assetId}\\\`;
                return Functions.makeHttpRequest({
                    url: url,
                    headers: { "Content-Type": "application/json" }
                });
            });

            const responses = await Promise.all(requests);
            const prices = responses.map(res => res.data.valuation);
            
            // Return average price
            const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
            return Functions.encodeUint256(Math.floor(avgPrice * 1e18));
        \`;
    }
}
`;

// Save enhanced oracle contract
fs.writeFileSync(
  path.join(__dirname, "../../contracts/oracles/LuxBridgePriceOracleV2.sol"),
  ENHANCED_ORACLE_SOURCE
);

setupChainlinkFunctions().catch(console.error);