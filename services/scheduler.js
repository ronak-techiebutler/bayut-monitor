import cron from "node-cron";
import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve path to monitor.js (assumes monitor.js is in the project root)
const monitorScriptPath = path.join(__dirname, "..", "monitor.js");

console.log("🕒 Bayut Monitor Scheduler started");

cron.schedule("* * * * *", () => {
  console.log(`[${new Date().toLocaleString()}] ⏳ Running monitor.js...`);

  exec(`node "${monitorScriptPath}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Execution error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`⚠️ Stderr: ${stderr}`);
    }
    console.log(`✅ Output:\n${stdout}`);
  });
});
