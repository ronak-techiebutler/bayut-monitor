import fs from "fs";
import path from "path";
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

export const runMonitor = async (urlArray) => {
  try {
    console.log("🔄 Running monitor");

    await connectDB();

    const crawlDataObject = {};

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

      const experiments = [];
      if (
        Object.keys(localStorage).some(
          (k) =>
            k.toLowerCase().includes("experiment") ||
            k.toLowerCase().includes("variant")
        )
      ) {
        experiments.push("Found experiment keys in localStorage.");
      }

      crawlDataObject[pageUrl] = {
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
          robotsTxt: robotsTxt.slice(0, 1000),
          robotsStatus,
        },
        internalLinks: {
          total: links.length,
          links,
        },
        experimentsDetected: experiments,
        localStorage,
      };

      const previousCrawl = await Models.crawl
        .findOne({})
        .sort({ timestamp: -1 });

      const previousData = previousCrawl?.data?.[pageUrl];
      const currentData = crawlDataObject[pageUrl];

      if (previousData) {
        const diff = {};

        for (const key of Object.keys(currentData)) {
          if (!_.isEqual(currentData[key], previousData[key])) {
            diff[key] = {
              before: previousData[key],
              after: currentData[key],
            };
          }
        }

        if (Object.keys(diff).length > 0) {
          console.log("🔍 Changes detected for:", pageUrl);
          console.dir(diff, { depth: null });

          // Optional: Save to DB, sendDigest(), etc.
          await Models.change.create({
            url: pageUrl,
            diff,
            timestamp: new Date(),
          });
        } else {
          console.log("✅ No changes for:", pageUrl);
        }
      }
    }

    // Store the full object
    await Models.crawl.create({ data: crawlDataObject });

    console.log("✅ Saved crawl data");

    // const finalDigest = digestParts.join("\n");
    // await sendDigest(finalDigest);
  } catch (error) {
    console.error("❌ Monitor failed:", error);
  }
};
