import * as fs from "fs";
import * as path from "path";

export function cleanupEnvironment(): void {
  console.log("🧹 Cleaning up test environment...");

  // Remove contract addresses file
  const configPath = path.join(__dirname, "contract-addresses.json");
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
    console.log("✅ Removed contract addresses file");
  }

  // Clean up any temporary test files
  const tempFiles = [
    path.join(__dirname, "test-state.json"),
    path.join(__dirname, "tool-results.json"),
  ];

  tempFiles.forEach((file) => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`✅ Removed ${path.basename(file)}`);
    }
  });

  console.log("✅ Test environment cleaned up!");
}

// Run cleanup if called directly
if (require.main === module) {
  cleanupEnvironment();
}