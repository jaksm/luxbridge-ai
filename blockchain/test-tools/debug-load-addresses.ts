import { loadContractAddresses } from "../test-environment/setup-local-chain";
import * as fs from "fs";
import * as path from "path";

function debugLoadAddresses() {
  console.log("🔍 Debugging loadContractAddresses function");
  
  // Check raw file content
  const configPath = path.join(__dirname, "..", "test-environment", "contract-addresses.json");
  console.log(`📂 Config path: ${configPath}`);
  console.log(`📂 File exists: ${fs.existsSync(configPath)}`);
  
  if (fs.existsSync(configPath)) {
    const rawContent = fs.readFileSync(configPath, "utf8");
    console.log("📄 Raw file content:", rawContent);
    
    try {
      const parsed = JSON.parse(rawContent);
      console.log("📋 Parsed content:", parsed);
    } catch (error: any) {
      console.log(`❌ JSON parse error: ${error.message}`);
    }
  }
  
  // Test loadContractAddresses function
  console.log("\n🔧 Testing loadContractAddresses...");
  const result = loadContractAddresses();
  console.log("📦 Function result:", result);
  
  if (result) {
    console.log("✅ Successfully loaded addresses");
    console.log(`  Oracle: ${result.oracle}`);
  } else {
    console.log("❌ Function returned null");
  }
}

debugLoadAddresses();