import express from "express";
import cron from "node-cron";
import { runMonitor } from "./services/monitorCore.js";
import { parseSitemap } from "./services/parseSitemap.js";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Bayut-monitor is good to go" });
});

cron.schedule("* * * * *", () => {
  console.log("🔥 Test: cron running every minute");
});

//Schedule to run every day at 12:00 AM UTC
cron.schedule(
  "50 11 * * *",
  async () => {
    console.log("⏰ Running daily monitor at 11:40 AM UTC...");
    const urls = parseSitemap();
    await runMonitor(urls);
  },
  {
    timezone: "UTC",
  }
);

app.listen(3000, () => {
  console.log("app running on 3000");
});
