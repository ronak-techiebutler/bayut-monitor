import { chromium } from "playwright";

export const crawlPage = async (url) => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  try {
    // Increase timeout & fallback waitUntil
    await page.goto(url, {
      waitUntil: "domcontentloaded", // Less strict than "networkidle"
      timeout: 60000, // 60 seconds
    });
  } catch (err) {
    console.error(`⚠️ Page load failed for ${url}:`, err.message);
    await browser.close();
    return {
      html: "",
      links: [],
    };
  }

  const html = await page.content();

  const links = await page.$$eval("a", (anchors) => anchors.map((a) => a.href));

  await browser.close();

  return {
    html,
    links,
  };
};
