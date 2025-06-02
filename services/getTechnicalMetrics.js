import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";

export const getTechnicalMetrics = async (url) => {
  const chrome = await launch({ chromeFlags: ["--headless"] });
  const result = await lighthouse(url, {
    port: chrome.port,
    output: "json",
    logLevel: "info",
  });

  const { audits } = result.lhr;

  return {
    TTFB: audits["server-response-time"]?.numericValue,
    LCP: audits["largest-contentful-paint"]?.numericValue,
    INP: audits["interactive"]?.numericValue,
  };
};
