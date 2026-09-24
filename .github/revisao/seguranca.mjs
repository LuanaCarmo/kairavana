// Regras de segurança específicas do site Kairavana. Sem dependências.
// Erros quebram a pipeline; avisos só aparecem no resumo.
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const erros = [], avisos = [];
const erro = (arq, msg) => { erros.push(`${arq}: ${msg}`); console.log(`::error file=${arq}::${msg}`); };
const aviso = (arq, msg) => { avisos.push(`${arq}: ${msg}`); console.log(`::warning file=${arq}::${msg}`); };

const arquivos = execSync("git ls-files", { encoding: "utf8" }).split("\n").filter(Boolean);
const texto = arquivos.filter(f => /\.(html|js|mjs|json|md|yml|yaml|css|txt)$/.test(f));

// 1. Chaves e senhas no código atual
const segredos = [
  [/github_pat_[A-Za-z0-9_]{20,}/, "token do GitHub (github_pat_)"],
  [/gh[pousr]_[A-Za-z0-9]{30,}/, "token do GitHub"],
  [/sk-ant-[A-Za-z0-9_-]{20,}/, "chave da Anthropic"],
  [/AKIA[0-9A-Z]{16}/, "chave da AWS"],
  [/AIza[0-9A-Za-z_-]{35}/, "chave do Google"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "chave privada"],
  [/(senha|password|passwd|secret)\s*[:=]\s*["'][^"'\s]{6,}["']/i, "senha escrita no código"]
];
for (const f of texto){
  const c = readFileSync(f, "utf8");
  for (const [re, nome] of segredos) if (re.test(c)) erro(f, `possível ${nome} exposto(a). Remova e gere uma nova chave.`);
}

// 2. Links e recursos nas páginas
for (const f of arquivos.filter(f => f.endsWith(".html"))){
  const c = readFileSync(f, "utf8");
  for (const m of c.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g))
    if (!/rel="[^"]*noopener/.test(m[0])) erro(f, `link que abre nova aba sem rel="noopener": ${m[0].slice(0, 90)}`);
  for (const m of c.matchAll(/(?:src|href)="(http:\/\/[^"]+)"/g))
    erro(f, `recurso sem HTTPS: ${m[1]}`);
  if (/\beval\s*\(|new Function\s*\(/.test(c)) erro(f, "uso de eval/new Function");
  if (/document\.write\s*\(/.test(c)) aviso(f, "uso de document.write");
}

// 3. Área de gestão: não pode ser indexada e só conversa com a API do GitHub
if (existsSync("admin.html")){
  const c = readFileSync("admin.html", "utf8");
  if (!/<meta name="robots" content="[^"]*noindex/.test(c)) erro("admin.html", "falta <meta name=\"robots\" content=\"noindex\">");
  const hosts = [...c.matchAll(/https:\/\/([a-z0-9.-]+)/gi)].map(m => m[1].toLowerCase());
  const permitidos = ["api.github.com", "github.com", "fonts.googleapis.com", "fonts.gstatic.com", "luanacarmo.github.io", "docs.github.com"];
  for (const h of new Set(hosts)) if (!permitidos.includes(h)) erro("admin.html", `a área de gestão referencia um domínio não esperado: ${h}. A chave de acesso só pode ir para api.github.com.`);
  if (/(console\.log|alert)\([^)]*token/i.test(c)) erro("admin.html", "o token pode estar sendo mostrado no console ou em alerta");
}

// 4. agenda.json é público: só pode ter datas e horários, nunca dados de clientes
if (existsSync("agenda.json")){
  let a;
  try { a = JSON.parse(readFileSync("agenda.json", "utf8")); }
  catch (e){ erro("agenda.json", `JSON inválido: ${e.message}`); }
  if (a){
    const HORA = /^([01]\d|2[0-3]):[0-5]\d$/, DATA = /^\d{4}-\d{2}-\d{2}$/;
    const chaves = ["whatsapp", "numeroExibido", "horarios", "ocupados", "bloqueados", "extras", "antecedenciaHoras", "janelaDias"];
    for (const k of Object.keys(a)) if (!chaves.includes(k)) erro("agenda.json", `campo inesperado "${k}". O arquivo é público: não guarde dados de clientes nele.`);
    const listaHoras = (onde, v) => Array.isArray(v) && v.every(h => HORA.test(h)) || erro("agenda.json", `${onde} deve ser uma lista de horários HH:MM (sem nomes ou recados)`);
    for (const [d, v] of Object.entries(a.horarios || {})) { if (!/^[0-6]$/.test(d)) erro("agenda.json", `dia da semana inválido em horarios: ${d}`); listaHoras(`horarios.${d}`, v); }
    for (const campo of ["ocupados", "extras"])
      for (const [d, v] of Object.entries(a[campo] || {})) { if (!DATA.test(d)) erro("agenda.json", `data inválida em ${campo}: ${d}`); listaHoras(`${campo}.${d}`, v); }
    if (!Array.isArray(a.bloqueados) || !a.bloqueados.every(d => DATA.test(d))) erro("agenda.json", "bloqueados deve ser uma lista de datas AAAA-MM-DD");
    if (a.whatsapp !== undefined && !/^\d{12,13}$/.test(a.whatsapp)) erro("agenda.json", "whatsapp deve ter só números, com 55 e DDD (ex.: 5511912345678)");
    if (a.whatsapp === "5511999999999") aviso("agenda.json", "o WhatsApp ainda é o número de exemplo. Troque na área de gestão → Ajustes.");
  }
}

// 5. Regras de comunicação responsável (obrigatórias pela identidade da marca)
if (existsSync("index.html")){
  const c = readFileSync("index.html", "utf8");
  const plano = c.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, " ").replace(/\s+/g, " ");
  if (!/CVV[^0-9]{0,10}188/.test(plano)) erro("index.html", "falta o CVV 188 no site");
  if (!/complementa/i.test(plano)) erro("index.html", "falta o aviso de que as terapias são complementares e não substituem tratamento");
  if (!/álcool/i.test(plano)) erro("index.html", "falta o aviso de que os florais contêm álcool");
  const proibidas = [/\bcura[rs]?\b/i, /\bgarantid[oa]s?\b/i, /\bon-?line\b/i, /\btoque\b/i];
  for (const re of proibidas){ const m = plano.match(re); if (m) aviso("index.html", `revise o termo "${m[0]}": ${plano.slice(Math.max(0, m.index - 60), m.index + 60).trim()}`); }
}

console.log(`\nSegurança: ${erros.length} erro(s), ${avisos.length} aviso(s).`);
if (process.env.GITHUB_STEP_SUMMARY){
  const { appendFileSync } = await import("node:fs");
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Segurança\n\n${erros.length ? erros.map(e => `- ❌ ${e}`).join("\n") : "- ✅ Nenhum problema de segurança encontrado."}\n${avisos.map(a => `- ⚠️ ${a}`).join("\n")}\n`);
}
process.exit(erros.length ? 1 : 0);
