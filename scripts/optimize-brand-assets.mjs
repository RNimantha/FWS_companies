import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CHROME_PATH
    ? { executablePath: process.env.CHROME_PATH }
    : {}),
});
// The truck crop excludes the camera watermark, while retaining the truck branding.
// Original client files remain untouched. The logo is resized only, never cropped or recolored.
const assets = [
  {
    source: "public/Lory.jpeg",
    target: "public/assets/images/fwc-truck-800.webp",
    width: 800,
    type: "image/webp",
    crop: [180, 200, 1300, 800],
  },
  {
    source: "public/Lory.jpeg",
    target: "public/assets/images/fwc-truck-1300.webp",
    width: 1300,
    type: "image/webp",
    crop: [180, 200, 1300, 800],
  },
  {
    source: "public/Lory.jpeg",
    target: "public/assets/images/fwc-truck-clean.jpg",
    width: 1300,
    type: "image/jpeg",
    crop: [180, 200, 1300, 800],
  },
  {
    source: "public/lofwc.jpeg",
    target: "public/assets/images/fwc-logo-512.webp",
    width: 512,
    type: "image/webp",
  },
];
try {
  const page = await browser.newPage();
  for (const asset of assets) {
    const bytes = await readFile(asset.source);
    const result = await page.evaluate(
      async ({ encoded, width, type, crop }) => {
        const image = new Image();
        image.src = "data:image/jpeg;base64," + encoded;
        await image.decode();
        const [x, y, w, h] = crop ?? [
          0,
          0,
          image.naturalWidth,
          image.naturalHeight,
        ];
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = Math.round((width * h) / w);
        canvas
          .getContext("2d")
          .drawImage(image, x, y, w, h, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL(type, 0.85).split(",")[1];
      },
      { encoded: bytes.toString("base64"), ...asset },
    );
    const output = Buffer.from(result, "base64");
    await writeFile(asset.target, output);
    console.log(`${asset.target}: ${Math.round(output.length / 1024)}KB`);
  }
} finally {
  await browser.close();
}
