import PdfPrinter from "pdfmake";
import fs from "fs";
import _ from "lodash";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fonts = {
  Roboto: {
    normal: path.join(__dirname, "fonts/Roboto-Regular.ttf"),
    bold: path.join(__dirname, "fonts/Roboto-Medium.ttf"),
    italics: path.join(__dirname, "fonts/Roboto-Italic.ttf"),
    bolditalics: path.join(__dirname, "fonts/Roboto-MediumItalic.ttf"),
  },
};
const printer = new PdfPrinter(fonts);

export function generateConsolidatedPDFReport(diffsByUrl, outputFile) {
  const content = [];

  content.push({ text: "Bayut Monitoring Report", style: "header" });

  for (const [url, diff] of Object.entries(diffsByUrl)) {
    content.push({
      text: `URL: ${url}`,
      style: "subheader",
      margin: [0, 10, 0, 5],
    });

    const body = [
      [
        { text: "Field", style: "tableHeader" },
        { text: "Before", style: "tableHeader" },
        { text: "After", style: "tableHeader" },
      ],
    ];

    // Flatten changed fields
    function flattenDiffObject(diff, prefix = "") {
      const rows = [];

      for (const key in diff) {
        const value = diff[key];
        const fieldPath = prefix ? `${prefix}.${key}` : key;

        if (
          typeof value === "object" &&
          value !== null &&
          "before" in value &&
          "after" in value
        ) {
          rows.push([
            { text: fieldPath, style: "tableField" },
            {
              text: JSON.stringify(value.before, null, 2),
              color: "red",
              style: "tableContent",
            },
            {
              text: JSON.stringify(value.after, null, 2),
              color: "green",
              style: "tableContent",
            },
          ]);
        } else if (typeof value === "object" && value !== null) {
          rows.push(...flattenDiffObject(value, fieldPath));
        }
      }

      return rows;
    }

    const diffRows = flattenDiffObject(diff);
    if (diffRows.length > 0) {
      body.push(...diffRows);
    }

    // Now handle unchanged fields: include message + current values
    const sections = [
      "seoSnapshot",
      "technicalMetrics",
      "sitemapAndRobots",
      "internalLinks",
    ];
    for (const section of sections) {
      if (!diff[section]) {
        body.push([
          { text: section, style: "tableField" },
          {
            text: "No change detected",
            italics: true,
            colSpan: 2,
            style: "tableContent",
          },
          {},
        ]);
      }
    }

    content.push({
      style: "tableExample",
      table: {
        widths: ["*", "*", "*"],
        body,
      },
      layout: "lightHorizontalLines",
    });

    // Also add full current snapshot data as reference (optional)
    content.push({
      text: "Latest Snapshot Data (for reference)",
      style: "subheader",
      margin: [0, 10, 0, 3],
    });
    content.push({
      text: JSON.stringify(diff?.fullCurrent || {}, null, 2),
      style: "codeBlock",
    });
  }

  const docDefinition = {
    content,
    styles: {
      header: {
        fontSize: 22,
        bold: true,
        alignment: "center",
        margin: [0, 0, 0, 20],
      },
      subheader: {
        fontSize: 16,
        bold: true,
      },
      tableExample: {
        margin: [0, 5, 0, 15],
      },
      tableHeader: {
        bold: true,
        fontSize: 13,
        color: "black",
      },
      tableField: {
        fontSize: 12,
        bold: true,
      },
      tableContent: {
        fontSize: 11,
      },
      codeBlock: {
        fontSize: 9,
        font: "Roboto",
        margin: [0, 2, 0, 10],
      },
    },
    defaultStyle: {
      font: "Roboto",
    },
    footer: (currentPage, pageCount) => {
      return {
        text: `This is a computer-generated report - Page ${currentPage} of ${pageCount}`,
        alignment: "right",
        margin: [0, 0, 20, 10],
        fontSize: 9,
        color: "gray",
      };
    },
  };

  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  pdfDoc.pipe(fs.createWriteStream(outputFile));
  pdfDoc.end();
}
