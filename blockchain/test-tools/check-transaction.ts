import { ethers } from "hardhat";

async function checkTransaction() {
  console.log("🔍 Checking Transaction Status");

  const txHash =
    "0xd83364fe9ff599ca6f675239ec4ce48d3044df4e4762d5155027a824c8b4e68d";

  try {
    const receipt = await ethers.provider.getTransactionReceipt(txHash);

    if (receipt) {
      console.log("📋 Transaction Receipt:");
      console.log(
        `  Status: ${receipt.status} (${receipt.status === 1 ? "SUCCESS" : "FAILED"})`,
      );
      console.log(`  Block: ${receipt.blockNumber}`);
      console.log(`  Gas Used: ${receipt.gasUsed}`);
      console.log(`  To: ${receipt.to}`);
      console.log(`  From: ${receipt.from}`);

      if (receipt.logs.length > 0) {
        console.log(`  Events: ${receipt.logs.length} logs emitted`);
      } else {
        console.log("  No events emitted (suspicious for a state change)");
      }

      if (receipt.status === 0) {
        console.log("❌ Transaction FAILED - this explains the issue!");
      }
    } else {
      console.log("❌ Transaction not found");
    }
  } catch (error: any) {
    console.log(`❌ Error checking transaction: ${error.message}`);
  }

  // Also check the contract address
  const oracleAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const code = await ethers.provider.getCode(oracleAddress);
  console.log(`📋 Oracle contract code length: ${code.length}`);

  if (code === "0x") {
    console.log("❌ No contract at oracle address!");
  } else {
    console.log("✅ Contract exists at oracle address");
  }
}

checkTransaction().catch(console.error);
