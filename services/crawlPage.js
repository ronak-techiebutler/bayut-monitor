import puppeteer from "puppeteer";

export const crawlPage = async (url) => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2" });

  const html = await page.content();

  const localStorageData = await page.evaluate(() => {
    const obj = {};
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      obj[key] = window.localStorage.getItem(key);
    }
    return obj;
  });

  const links = await page.$$eval("a", (anchors) => anchors.map((a) => a.href));

  await browser.close();

  return {
    html,
    localStorage: localStorageData, // safe object
    links,
  };
};
