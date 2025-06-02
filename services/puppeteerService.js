import puppeteer from "puppeteer";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const snapshotsDir = path.join(__dirname, "..", "snapshots");
await fs.ensureDir(snapshotsDir);

export async function takeScreenshot() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("https://monitoring-tools.vercel.app/", {
    waitUntil: "networkidle2",
  });

  const timestamp = Date.now();
  const screenshotPath = path.join(snapshotsDir, `snapshot-${timestamp}.png`);

  await page.setViewport({
    width: 1280,
    height: 800, // or any fixed size you want
  });

  await page.screenshot({ path: screenshotPath, fullPage: false });

  await browser.close();
  return screenshotPath;
}
