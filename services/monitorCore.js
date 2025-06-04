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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const runMonitor = async (urlArray) => {
  try {
    console.log("🔄 Running monitor");

    await connectDB();
    const timestamp = new Date();
    const reportsDir = path.join(__dirname, "../reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const allDiffs = {};

    for (const pageUrl of urlArray) {
      console.log("🌐 Crawling:", pageUrl);

      const { html: newHtml, localStorage, links } = await crawlPage(pageUrl);
      const seoFields = extractSEOFields(newHtml);
      const techMetrics = await getTechnicalMetrics(pageUrl);
      const {
        sitemapAvailable,
        sitemapUrls,
        sitemapStatus,
        robotsTxt,
        robotsStatus,
      } = await checkSitemapAndRobots();

      const experiments = Object.keys(localStorage).some(
        (k) =>
          k.toLowerCase().includes("experiment") ||
          k.toLowerCase().includes("variant")
      )
        ? ["Found experiment keys in localStorage."]
        : [];

      const currentSnapshot = {
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
        experimentsDetected: experiments,
      };

      const previousCrawl = await Models.crawl
        .findOne({ url: pageUrl })
        .sort({ timestamp: -1 });
      const previousData = previousCrawl?.data;

      function getChangedFields(prev, curr) {
        const changes = {};
        for (const key in curr) {
          if (!_.isEqual(curr[key], prev?.[key])) {
            if (
              typeof curr[key] === "object" &&
              curr[key] !== null &&
              !Array.isArray(curr[key])
            ) {
              const nestedChanges = getChangedFields(
                prev?.[key] || {},
                curr[key]
              );
              if (Object.keys(nestedChanges).length > 0) {
                changes[key] = nestedChanges;
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
      }

      let diff = {};
      if (previousData) {
        diff = getChangedFields(previousData, currentSnapshot);

        if (Object.keys(diff).length > 0) {
          console.log("🔍 Changes detected for:", pageUrl);
          allDiffs[pageUrl] = diff;

          await Models.change.create({
            url: pageUrl,
            diff,
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

      if (global.gc) global.gc();
    }

    if (Object.keys(allDiffs).length > 0) {
      const reportFile = path.join(
        reportsDir,
        `report-${timestamp.toISOString().replace(/[:.]/g, "-")}.pdf`
      );

      generateConsolidatedPDFReport(allDiffs, reportFile);
      console.log(`✅ Final PDF report saved: ${reportFile}`);
    } else {
      console.log("✅ No changes found. No report generated.");
    }

    console.log("✅ Finished monitoring all URLs.");
  } catch (error) {
    console.error("❌ Monitor failed:", error);
  }
};
