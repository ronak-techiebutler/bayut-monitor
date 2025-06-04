import { runMonitor } from "./services/monitorCore.js";
import { parseSitemap } from "./services/parseSitemap.js";
import cron from "node-cron";

// Schedule to run every day at 12:00 AM UTC
cron.schedule(
  "30 11 * * *",
  async () => {
    console.log("⏰ Running daily monitor at 11:30 AM UTC...");
    const urls = parseSitemap();
    await runMonitor(urls);
  },
  {
    timezone: "UTC",
  }
);
