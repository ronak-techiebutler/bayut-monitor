import { chromium } from "playwright";
import lighthouse from "lighthouse";

export const getTechnicalMetrics = async (url) => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--remote-debugging-port=9222"],
  });

  const result = await lighthouse(url, {
    port: 9222,
    output: "json",
    logLevel: "info",
  });

  await browser.close();

  const { audits } = result.lhr;

  return {
    TTFB: audits["server-response-time"]?.numericValue,
    LCP: audits["largest-contentful-paint"]?.numericValue,
    INP: audits["experimental-interaction-to-next-paint"]?.numericValue,
  };
};
