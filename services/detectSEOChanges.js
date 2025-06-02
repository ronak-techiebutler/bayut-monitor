import { load } from "cheerio";

// Normalize by removing listing counts and extra spaces
const normalizeText = (text) =>
  text
    .replace(/\d+\s*listings?/gi, "")
    .replace(/\s+/g, " ")
    .trim();

export const extractSEOFields = (html) => {
  const $ = load(html);

  const fields = [
    { name: "title", selector: "title", type: "text" },
    {
      name: "description",
      selector: 'meta[name="description"]',
      type: "attr",
      attr: "content",
    },
    {
      name: "canonical",
      selector: 'link[rel="canonical"]',
      type: "attr",
      attr: "href",
    },
    {
      name: "robots",
      selector: 'meta[name="robots"]',
      type: "attr",
      attr: "content",
    },
    { name: "h1", selector: "h1", type: "text" },
    { name: "breadcrumbs", selector: ".breadcrumbs", type: "text" },
  ];

  const result = {};

  fields.forEach(({ name, selector, type, attr }) => {
    const getContent = () => {
      if (type === "text") {
        return normalizeText($(selector).first().text());
      } else if (type === "attr") {
        return ($(selector).attr(attr) || "").trim();
      }
    };

    result[name] = getContent();
  });

  return result;
};
