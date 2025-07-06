import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const SUBGRAPH_NAME = "luxbridge-ai/rwa-trading";
const GRAPH_NODE_URL = "http://localhost:8020";
const IPFS_URL = "http://localhost:5001";

async function deploySubgraph() {
  console.log("🚀 Deploying The Graph Subgraph for LuxBridge AI...\n");

  try {
    // Check if Graph node is running
    console.log("1️⃣ Checking Graph node connectivity...");
    try {
      execSync(`curl -s ${GRAPH_NODE_URL}`, { stdio: "ignore" });
      console.log("✅ Graph node is accessible");
    } catch (error) {
      console.log("❌ Graph node not running. Please start it first:");
      console.log("   docker-compose up -d graph-node ipfs postgres");
      process.exit(1);
    }

    // Update subgraph.yaml with deployed contract addresses
    console.log("\n2️⃣ Updating subgraph configuration...");
    const deploymentPath = path.join(__dirname, "../deployments/localhost");

    const contracts = [
      { name: "RWATokenFactory", startBlock: 1 },
      { name: "LuxBridgeAMM", startBlock: 1 },
      { name: "LuxBridgeAutomation", startBlock: 1 },
    ];

    let subgraphYaml = fs.readFileSync(
      path.join(__dirname, "../subgraph/subgraph.yaml"),
      "utf8",
    );

    for (const contract of contracts) {
      const deploymentFile = path.join(deploymentPath, `${contract.name}.json`);
      if (fs.existsSync(deploymentFile)) {
        const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
        const address = deployment.address;

        // Update address in subgraph.yaml
        const regex = new RegExp(
          `(${contract.name}:[\\s\\S]*?address:\\s*)['"]\S+['"]`,
          "g",
        );
        subgraphYaml = subgraphYaml.replace(regex, `$1"${address}"`);

        console.log(`✅ Updated ${contract.name} address: ${address}`);
      } else {
        console.log(
          `⚠️  ${contract.name} deployment not found. Run deployment first.`,
        );
      }
    }

    fs.writeFileSync(
      path.join(__dirname, "../subgraph/subgraph.yaml"),
      subgraphYaml,
    );

    // Generate code from ABI
    console.log("\n3️⃣ Generating TypeScript code from ABIs...");
    execSync("cd subgraph && npm run codegen", {
      cwd: path.join(__dirname, ".."),
      stdio: "inherit",
    });
    console.log("✅ Code generation complete");

    // Build the subgraph
    console.log("\n4️⃣ Building subgraph...");
    execSync("cd subgraph && npm run build", {
      cwd: path.join(__dirname, ".."),
      stdio: "inherit",
    });
    console.log("✅ Build complete");

    // Create the subgraph on the node
    console.log("\n5️⃣ Creating subgraph on local node...");
    execSync(`npx graph create --node ${GRAPH_NODE_URL} ${SUBGRAPH_NAME}`, {
      cwd: path.join(__dirname, "../subgraph"),
      stdio: "inherit",
    });
    console.log("✅ Subgraph created");

    // Deploy the subgraph
    console.log("\n6️⃣ Deploying subgraph...");
    execSync(
      `npx graph deploy --node ${GRAPH_NODE_URL} --ipfs ${IPFS_URL} ${SUBGRAPH_NAME}`,
      {
        cwd: path.join(__dirname, "../subgraph"),
        stdio: "inherit",
      },
    );
    console.log("✅ Subgraph deployed successfully!");

    console.log("\n🎉 Subgraph deployment complete!");
    console.log(
      `\n📊 GraphQL endpoint: ${GRAPH_NODE_URL}/subgraphs/name/${SUBGRAPH_NAME}`,
    );
    console.log(
      "\nExample queries available in: subgraph/test-queries.graphql",
    );
  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
}

// Docker compose file for local Graph node
const dockerComposeContent = `version: '3'
services:
  graph-node:
    image: graphprotocol/graph-node
    ports:
      - '8000:8000'
      - '8001:8001'
      - '8020:8020'
      - '8030:8030'
      - '8040:8040'
    depends_on:
      - ipfs
      - postgres
    environment:
      postgres_host: postgres
      postgres_user: graph-node
      postgres_pass: let-me-in
      postgres_db: graph-node
      ipfs: 'ipfs:5001'
      ethereum: 'localhost:http://host.docker.internal:8545'
      GRAPH_LOG: info

  ipfs:
    image: ipfs/go-ipfs:v0.10.0
    ports:
      - '5001:5001'

  postgres:
    image: postgres
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: graph-node
      POSTGRES_PASSWORD: let-me-in
      POSTGRES_DB: graph-node
`;

// Save docker-compose file if it doesn't exist
const dockerComposePath = path.join(__dirname, "../docker-compose.yml");
if (!fs.existsSync(dockerComposePath)) {
  fs.writeFileSync(dockerComposePath, dockerComposeContent);
  console.log("📝 Created docker-compose.yml for Graph node");
}

// Run deployment
deploySubgraph().catch(console.error);
