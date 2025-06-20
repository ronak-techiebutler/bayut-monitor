export const crawlPage = async (browser, url) => {
  const page = await browser.newPage();

  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
  } catch (err) {
    console.error(`⚠️ Page load failed for ${url}:`, err.message);
    await page.close();
    return {
      html: "",
      links: [],
    };
  }

  const html = await page.content();
  const links = await page.$$eval("a", (anchors) => anchors.map((a) => a.href));

  await page.close();

  return {
    html,
    links,
  };
};
