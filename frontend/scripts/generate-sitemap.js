import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_URL =
  process.env.VITE_SITE_URL || "https://placementos.example.edu";

// only public, indexable routes belong in the sitemap
const PUBLIC_ROUTES = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/success-stories", priority: "0.8", changefreq: "weekly" },
  { path: "/about", priority: "0.6", changefreq: "monthly" },
  { path: "/contact", priority: "0.5", changefreq: "monthly" },
];

const today = new Date().toISOString().split("T")[0];

const urlEntries = PUBLIC_ROUTES.map(
  ({ path: routePath, priority, changefreq }) => `
  <url>
    <loc>${SITE_URL}${routePath}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
).join("");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`;

const outputPath = path.resolve(__dirname, "../public/sitemap.xml");

fs.writeFileSync(outputPath, sitemap.trim(), "utf8");

console.log(`✓ sitemap.xml generated at ${outputPath}`);