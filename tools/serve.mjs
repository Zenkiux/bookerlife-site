// Tiny static server for local previews: node serve.mjs <root> <port> [base]
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
const [root, argPort = "4410", base = "/"] = process.argv.slice(2);
const port = process.env.PORT || argPort;
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif",
  ".svg": "image/svg+xml", ".ttf": "font/ttf", ".woff2": "font/woff2", ".txt": "text/plain", ".xml": "application/xml", ".webmanifest": "application/manifest+json" };
createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (!p.startsWith(base)) { res.writeHead(302, { location: base }); return res.end(); }
  p = normalize(join(root, p.slice(base.length)));
  if (!p.startsWith(normalize(root))) { res.writeHead(403); return res.end(); }
  try { if ((await stat(p)).isDirectory()) p = join(p, "index.html");
    res.writeHead(200, { "content-type": types[extname(p)] || "application/octet-stream", "cache-control": "no-store" }); res.end(await readFile(p));
  } catch { try { res.writeHead(404, { "content-type": types[".html"] }); res.end(await readFile(join(root, "404.html"))); } catch { res.end("404"); } }
}).listen(+port, () => console.log(`http://localhost:${port}${base}`));
