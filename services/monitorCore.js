import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import _ from "lodash";

dotenv.config();

import { crawlPage } from "./crawlPage.js";
import { checkSitemapAndRobots } from "./checkSitemapAndRobots.js";
import { getTechnicalMetrics } from "./getTechnicalMetrics.js";
import { extractSEOFields } from "./detectSEOChanges.js"; // renamed function
import { sendDigest } from "./sendDigest.js";
import connectDB from "../config/connectDB.js";
import Models from "../models/index.js";
import { generateConsolidatedPDFReport } from "./createChangeReportPDF.js";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logHeapUsage = (label) => {
  const used = process.memoryUsage().heapUsed / 1024 / 1024;
  console.log(`💾 [${label}] Heap Used: ${used.toFixed(2)} MB`);
};

export const runMonitor = async (urlArray) => {
  try {
    console.log("🔄 Running monitor");
    await connectDB();

    const timestamp = new Date();
    const reportsDir = path.join(__dirname, "../reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--remote-debugging-port=9222",
      ],
    });

    const chunkArray = (arr, size) =>
      arr.reduce(
        (acc, _, i) => (i % size ? acc : [...acc, arr.slice(i, i + size)]),
        []
      );

    const BATCH_SIZE = 5;
    const chunks = chunkArray(urlArray, BATCH_SIZE);
    let allDiffs = {};

    for (const chunk of chunks) {
      for (const pageUrl of chunk) {
        let html = "";
        let links = [];
        let techMetrics = {};
        let seoFields = {};
        let currentSnapshot = null;
        let previousData = null;
        let diff = {};

        try {
          console.log("🌐 Crawling:", pageUrl);
          const crawlResult = await crawlPage(browser, pageUrl);
          html = crawlResult.html;
          links = crawlResult.links;

          seoFields = extractSEOFields(html);
          techMetrics = await getTechnicalMetrics(pageUrl, browser);

          const {
            sitemapAvailable,
            sitemapUrls,
            sitemapStatus,
            robotsTxt,
            robotsStatus,
          } = await checkSitemapAndRobots();

          currentSnapshot = {
            seoSnapshot: { ...seoFields },
            technicalMetrics: {
              TTFB: +(techMetrics.TTFB / 1000).toFixed(2),
              LCP: +(techMetrics.LCP / 1000).toFixed(2),
              INP: +(techMetrics.INP / 1000).toFixed(2),
            },
            sitemapAndRobots: {
              sitemapAvailable,
              sitemapStatus,
              sitemapUrls,
              robotsTxt: robotsTxt?.slice(0, 1000),
              robotsStatus,
            },
            internalLinks: {
              total: links.length,
            },
          };

          const previousCrawl = await Models.crawl
            .findOne({ url: pageUrl })
            .sort({ timestamp: -1 });

          previousData = previousCrawl?.data;

          const getChangedFields = (prev, curr) => {
            const changes = {};
            for (const key in curr) {
              if (!_.isEqual(curr[key], prev?.[key])) {
                if (
                  typeof curr[key] === "object" &&
                  curr[key] !== null &&
                  !Array.isArray(curr[key])
                ) {
                  const nested = getChangedFields(prev?.[key] || {}, curr[key]);
                  if (Object.keys(nested).length > 0) {
                    changes[key] = nested;
                  }
                } else {
                  changes[key] = {
                    before: prev?.[key],
                    after: curr[key],
                  };
                }
              }
            }
            return changes;
          };

          if (previousData) {
            diff = getChangedFields(previousData, currentSnapshot);
            if (Object.keys(diff).length > 0) {
              console.log("🔍 Changes detected for:", pageUrl);
              allDiffs[pageUrl] = {
                ...diff,
                fullCurrent: currentSnapshot,
              };

              await Models.change.create({
                url: pageUrl,
                diff,
                timestamp,
              });
            } else {
              console.log("✅ No changes for:", pageUrl);
            }
          }
          try {
            await Models.crawl.create({
              url: pageUrl,
              data: currentSnapshot,
              timestamp,
            });
            console.log("✅ Crawl record inserted for", pageUrl);
          } catch (err) {
            console.error("❌ Failed to insert crawl record:", err);
          }

          logHeapUsage(`After ${pageUrl}`);
        } catch (err) {
          console.error(`❌ Error processing ${pageUrl}:`, err);
        }

        // ❌ Dereference large objects to allow GC
        html = null;
        links = null;
        seoFields = null;
        techMetrics = null;
        currentSnapshot = null;
        previousData = null;
        diff = null;

        // 🧹 Trigger GC after each URL
        if (global.gc) global.gc();
      }

      // 🧹 Also GC after each batch
      if (global.gc) global.gc();
      await new Promise((res) => setTimeout(res, 100));
    }

    await browser.close();

    // ✅ Final report generation
    if (Object.keys(allDiffs).length > 0) {
      const reportFile = path.join(
        reportsDir,
        `report-${timestamp.toISOString().split("T")[0]}.pdf`
      );
      generateConsolidatedPDFReport(allDiffs, reportFile);
      console.log(`✅ Final PDF report saved: ${reportFile}`);
    } else {
      console.log("✅ No changes found. No report generated.");
    }

    // ♻️ Clear allDiffs
    allDiffs = null;
    if (global.gc) global.gc();

    console.log("✅ Finished monitoring all URLs.");
  } catch (error) {
    console.error("❌ Monitor failed:", error);
  }
};
