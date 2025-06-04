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

  content.push({ text: "Report", style: "header" });

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
              text: JSON.stringify(value.before),
              color: "red",
              style: "tableContent",
            },
            {
              text: JSON.stringify(value.after),
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

    body.push(...flattenDiffObject(diff));

    content.push({
      style: "tableExample",
      table: {
        widths: ["*", "*", "*"],
        body,
      },
      layout: "lightHorizontalLines",
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
    },
    defaultStyle: {
      font: "Roboto",
    },
  };

  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  pdfDoc.pipe(fs.createWriteStream(outputFile));
  pdfDoc.end();
}
