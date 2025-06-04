import { chromium } from "playwright";
export const crawlPage = async (url) => {
  try {
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    // const browser = await puppeteer.launch({
    //   executablePath: "/snap/bin/chromium",
    //   headless: "new",
    //   args: ["--no-sandbox", "--disable-setuid-sandbox"],
    // });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    const html = await page.content();

    const links = await page.$$eval("a", (anchors) =>
      anchors.map((a) => a.href)
    );

    await browser.close();

    return {
      html,
      links,
    };
  } catch (error) {
    console.log(error);
  }
};
