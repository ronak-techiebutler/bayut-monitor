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
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logHeapUsage = (label) => {
  const used = process.memoryUsage().heapUsed / 1024 / 1024;
  console.log(`💾 [${label}] Heap Used: ${used.toFixed(2)} MB`);
};

const runId = uuidv4();

export const runMonitor = async (urlArray) => {
  try {
    console.log("🔄 Running monitor");
    await connectDB();

    const timestamp = new Date();
    const startOfDay = new Date(timestamp.setHours(0, 0, 0, 0));
    const endOfDay = new Date(timestamp.setHours(23, 59, 59, 999));

    // 🆕 Get latest run_id from today, or create new one
    let latestRun = await Models.change
      .findOne({ timestamp: { $gte: startOfDay, $lte: endOfDay } })
      .sort({ timestamp: -1 });

    let runId = latestRun?.run_id || new mongoose.Types.ObjectId().toString();

    // 🆕 Get URLs already crawled today under the same runId
    const alreadyProcessed = await Models.crawl
      .find({
        url: { $in: urlArray },
        timestamp: { $gte: startOfDay, $lte: endOfDay },
      })
      .distinct("url");

    // 🆕 Filter remaining URLs
    const remainingUrls = urlArray.filter(
      (url) => !alreadyProcessed.includes(url)
    );
    console.log(`🔁 Total remaining URLs to crawl: ${remainingUrls.length}`);

    if (!remainingUrls.length) {
      console.log("⚠️ All URLs already processed today. Skipping crawl.");
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
    const chunks = chunkArray(remainingUrls, BATCH_SIZE);

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
              await Models.change.create({
                url: pageUrl,
                diff,
                fullCurrent: currentSnapshot,
                run_id: runId, // must exist in schema
                timestamp,
              });
            } else {
              console.log("✅ No changes for:", pageUrl);
            }
          }

          await Models.crawl.create({
            url: pageUrl,
            data: currentSnapshot,
            timestamp,
          });
          console.log("✅ Crawl record inserted for", pageUrl);

          logHeapUsage(`After ${pageUrl}`);
        } catch (err) {
          console.error(`❌ Error processing ${pageUrl}:`, err);
        }

        // Free memory
        html = null;
        links = null;
        seoFields = null;
        techMetrics = null;
        currentSnapshot = null;
        previousData = null;
        diff = null;

        if (global.gc) global.gc();
      }

      if (global.gc) global.gc();
      await new Promise((res) => setTimeout(res, 100));
    }
    await browser.close();

    // ✅ Generate consolidated report for all URLs of this runId
    const changes = await Models.change.find({ run_id: runId });

    if (changes.length > 0) {
      const groupedByUrl = {};
      for (const change of changes) {
        groupedByUrl[change.url] = {
          ...change.diff,
          fullCurrent: change.fullCurrent,
        };
      }

      const reportFile = path.join(
        path.join(__dirname, "../reports"),
        `report-${runId}.pdf`
      );

      generateConsolidatedPDFReport(groupedByUrl, reportFile);
      console.log(`✅ Final PDF report saved: ${reportFile}`);
    } else {
      console.log("✅ No changes found. No report generated.");
    }

    console.log("✅ Finished monitoring all URLs.");
  } catch (error) {
    console.error("❌ Monitor failed:", error);
  }
};
