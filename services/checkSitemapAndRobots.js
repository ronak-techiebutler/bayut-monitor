import axios from "axios";

export const checkSitemapAndRobots = async () => {
  const sitemapURL = "https://www.bayut.com/sitemap.xml";
  const robotsURL = "https://www.bayut.com/robots.txt";

  let sitemapAvailable = false;
  let sitemapUrls = 0;
  let sitemapStatus = null;
  let robotsTxt = "";
  let robotsStatus = null;

  try {
    const res = await axios.get(sitemapURL);
    sitemapAvailable = true;
    sitemapStatus = res.status;
    sitemapUrls = (res.data.match(/<loc>/g) || []).length;
  } catch (err) {
    sitemapStatus = err?.response?.status || 0;
  }

  try {
    const res = await axios.get(robotsURL);
    robotsTxt = res.data;
    robotsStatus = res.status;
  } catch (err) {
    robotsStatus = err?.response?.status || 0;
  }

  return {
    sitemapAvailable,
    sitemapUrls,
    sitemapStatus,
    robotsTxt,
    robotsStatus,
  };
};
