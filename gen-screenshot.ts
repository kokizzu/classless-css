#! /usr/bin/env -S deno run --allow-env --allow-net --allow-read --allow-run --allow-write --check
// Generate the screenshot and its thumbnail for a project.
// To install the dependencies on Debian/Ubuntu:
// $ sudo apt install imagemagick optipng

import { launch } from "https://deno.land/x/astral@0.3.5/mod.ts";

const templateFile = "screenshot-page.html";
const temporaryFile = "temp.html";

const slugify = (str: string) =>
  str
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/(^-|-$)/g, "");

const saveScreenshot = async (src: string, dest: string) => {
  const browser = await launch();

  const page = await browser.newPage(src);
  await page.setViewportSize({ width: 1024, height: 1024 });

  const screenshot = await page.screenshot({ captureBeyondViewport: true });
  await Deno.writeFile(dest, screenshot);

  await browser.close();
};

if (Deno.args.length < 1 || Deno.args.length > 2) {
  console.error(
    "usage: gen-screenshot.ts project-name [css-file]\n\n" +
      "The image filename will be derived from the project name.",
  );
  Deno.exit(1);
}

const screenshotFile = `${slugify(Deno.args[0])}.png`;
const cssFile = Deno.args[1] || "";

try {
  const htmlTemplate = await Deno.readTextFile(templateFile);
  const css = cssFile === "" ? "" : await Deno.readTextFile(cssFile);
  const html = htmlTemplate.replace(/%CSS_HERE%/, css);
  await Deno.writeTextFile(temporaryFile, html);

  const tempFilePath = await Deno.realPath(temporaryFile);
  await saveScreenshot(
    `file://${tempFilePath}`,
    `screenshot/${screenshotFile}`,
  );

  await (new Deno.Command(
    "convert",
    {
      args: [
        "-resize",
        "25%",
        "-adaptive-sharpen",
        "10",
        `screenshot/${screenshotFile}`,
        `thumbnail/${screenshotFile}`,
      ],
      stderr: "inherit",
      stdout: "inherit",
    },
  )).output();

  await (new Deno.Command("optipng", {
    args: [
      "-o",
      "5",
      "-strip",
      "all",
      `screenshot/${screenshotFile}`,
      `thumbnail/${screenshotFile}`,
    ],
    stderr: "inherit",
    stdout: "inherit",
  })).output();
} catch (err) {
  console.error(err);
} finally {
  Deno.remove(temporaryFile);
}
