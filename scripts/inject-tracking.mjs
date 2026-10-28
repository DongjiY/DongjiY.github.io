import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const siteDirectory = process.argv[2];

if (!siteDirectory) {
  throw new Error("Usage: node scripts/inject-tracking.mjs <site-directory>");
}

const trackingSource = "https://cloud.umami.is/script.js";
const trackingTag = `    <script
      defer
      src="${trackingSource}"
      data-website-id="4745ab48-fb8e-40c1-af2f-903b79af74e5"
    ></script>`;

async function injectIntoHtmlFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filePath = join(directory, entry.name);

    if (entry.isDirectory()) {
      await injectIntoHtmlFiles(filePath);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".html")) {
      continue;
    }

    const html = await readFile(filePath, "utf8");

    if (html.includes(trackingSource)) {
      continue;
    }

    if (!html.includes("</head>")) {
      throw new Error(`No </head> element found in ${filePath}`);
    }

    await writeFile(filePath, html.replace("</head>", `${trackingTag}\n  </head>`));
  }
}

await injectIntoHtmlFiles(siteDirectory);
