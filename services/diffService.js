import fs from "fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";

export function compareScreenshots(oldPath, newPath, diffPath) {
  const img1 = PNG.sync.read(fs.readFileSync(oldPath));
  const img2 = PNG.sync.read(fs.readFileSync(newPath));
  const { width, height } = img1;
  const diff = new PNG({ width, height });

  const numDiffPixels = pixelmatch(
    img1.data,
    img2.data,
    diff.data,
    width,
    height,
    { threshold: 0.1 }
  );

  fs.writeFileSync(diffPath, PNG.sync.write(diff));
  return numDiffPixels;
}
