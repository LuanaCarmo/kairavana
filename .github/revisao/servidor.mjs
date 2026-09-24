// Servidor estático mínimo para os testes: serve a raiz do repositório.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, normalize } from "node:path";

const raiz = join(import.meta.dirname, "..", "..");
const tipos = { ".html": "text/html; charset=utf-8", ".json": "application/json", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml" };

createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  const arq = normalize(join(raiz, p));
  if (!arq.startsWith(raiz) || arq.includes(`${join(raiz, ".git")}`)) { res.writeHead(403).end(); return; }
  try { res.writeHead(200, { "Content-Type": tipos[extname(arq)] || "application/octet-stream" }).end(await readFile(arq)); }
  catch { res.writeHead(404).end("não encontrado"); }
}).listen(4173, () => console.log("servindo em http://localhost:4173"));
