import express from "express";
import cron from "node-cron";
import { runMonitor } from "./services/monitorCore.js";
import { parseSitemap } from "./services/parseSitemap.js";
import moment from "moment/moment.js";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Bayut-monitor is ready to go" });
});

console.log(moment());
//Schedule to run every day at 12:00 AM UTC
cron.schedule("0 0 4 6 *", async () => {
  console.log("⏰ Running daily monitor at 12:00 AM UTC...");
  const urls = parseSitemap();
  await runMonitor(urls);
});

app.listen(3000, () => {
  console.log("app running on 3000");
});
