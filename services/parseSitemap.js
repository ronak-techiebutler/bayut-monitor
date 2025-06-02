import fs from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";

export const parseSitemap = () => {
  const sitemapPath = path.join("sitemap", "sitemap.xml");
  const xmlData = fs.readFileSync(sitemapPath, "utf-8");

  const parser = new XMLParser();
  const parsed = parser.parse(xmlData);

  const rawUrls = parsed.urlset?.url;
  const urlArray = Array.isArray(rawUrls) ? rawUrls : [rawUrls];

  const urls = urlArray.map((entry) => entry.loc).filter(Boolean);
  return urls;
};
