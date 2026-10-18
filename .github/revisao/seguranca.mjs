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
  [/(senha|password|passwd|secret)\s*[:=]\s*["'][^"'\s]{6,}["']/i, "senha escrita no código"],
  [/sb_secret_[A-Za-z0-9_-]{10,}/, "chave secreta do Supabase"],
  [/(APP_USR|TEST)-\d{6,}-\d{6}-[0-9a-f]{32}-\d{6,}/, "token de acesso do Mercado Pago"]
];
for (const f of [...texto, ...arquivos.filter(f => /\.(ts|sql|toml)$/.test(f))]){
  const c = readFileSync(f, "utf8");
  for (const [re, nome] of segredos) if (re.test(c)) erro(f, `possível ${nome} exposto(a). Remova e gere uma nova chave.`);
  // chave JWT do Supabase: a "anon" é pública; a "service_role" dá acesso total e nunca pode ir para o site
  for (const m of c.matchAll(/eyJ[\w-]+\.(eyJ[\w-]+)\.[\w-]+/g)){
    try { if (JSON.parse(Buffer.from(m[1], "base64url").toString()).role === "service_role") erro(f, "chave service_role do Supabase exposta. Troque a chave no Supabase e use só a chave anon/publishable no site."); } catch {}
  }
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

// 3b. Loja: área do cliente e gestão fora do Google; o navegador nunca cria pedidos nem define preços
for (const f of ["conta.html", "gestao-loja.html", "equipe.html"].filter(existsSync)){
  if (!/<meta name="robots" content="[^"]*noindex/.test(readFileSync(f, "utf8"))) erro(f, "falta <meta name=\"robots\" content=\"noindex\">");
}
for (const f of arquivos.filter(f => /^(loja\/.*\.js|loja\.html|conta\.html|gestao-loja\.html)$/.test(f))){
  const c = readFileSync(f, "utf8");
  if (/from\(["']pedidos["']\)\.(insert|upsert)|from\(["']itens_pedido["']\)\.(insert|upsert)/.test(c)) erro(f, "o site não pode criar pedidos direto no banco: use a função checkout (preços calculados no servidor).");
  if (/MP_ACCESS_TOKEN|SERVICE_ROLE_KEY/.test(c)) erro(f, "segredo do servidor referenciado no site.");
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
  if (!/complementa/i.test(plano)) erro("index.html", "falta o aviso de que as terapias integrativas complementam, e não substituem, o acompanhamento médico");
  if (!/álcool/i.test(plano)) erro("index.html", "falta o aviso de que os florais contêm álcool");
  const proibidas = [/\bcura[rs]?\b/i, /\bgarantid[oa]s?\b/i, /\bon-?line\b/i, /\btoque\b/i];
  for (const re of proibidas){ const m = plano.match(re); if (m) aviso("index.html", `revise o termo "${m[0]}": ${plano.slice(Math.max(0, m.index - 60), m.index + 60).trim()}`); }
}

// 6. Terminologia oficial: "terapias integrativas"; nada que sugira tratamento médico.
//    Olha o texto visível, <title>, descrições, alt e rótulos das páginas públicas e os textos da loja.
const TERMOS = [
  [/terapias? hol[ií]stic[ao]s?/i, "use “terapias integrativas”"],
  [/pr[aá]ticas? hol[ií]stic[ao]s?/i, "use “terapias integrativas”"],
  [/servi[cç]os? hol[ií]stic[ao]s?/i, "use “terapias integrativas”"],
  [/pr[aá]ticas complementares/i, "use “terapias integrativas e complementares”"],
  [/\btratamentos?\b/i, "use “atendimento”, “sessão” ou “cuidado”"],
  [/\bcurar\b|\bcura\b/i, "não prometa resultados"],
  [/\bpacientes?\b/i, "use “cliente” ou “pessoa”"],
  [/\bdiagn[oó]stic(o|os|ar)\b/i, "evite termos clínicos"],
  [/\bterap[eê]utic[oa]s?\b/i, "evite termos clínicos"]
];
for (const f of ["index.html", "loja.html", "conta.html", "loja/comum.js"].filter(existsSync)){
  const c = readFileSync(f, "utf8");
  const atributos = [...c.matchAll(/\b(?:content|alt|title|aria-label|placeholder)="([^"]*)"/g)].map(m => m[1]).join(" ");
  const texto = f.endsWith(".js") ? c.replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, " ")
    : c.replace(/<style[\s\S]*?<\/style>|<[^>]+>/g, " ").replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, " ");
  const plano = (texto + " " + atributos).replace(/\s+/g, " ");
  for (const [re, dica] of TERMOS){ const m = plano.match(re); if (m) erro(f, `termo fora do padrão "${m[0]}" (${dica}): …${plano.slice(Math.max(0, m.index - 50), m.index + 50).trim()}…`); }
}

console.log(`\nSegurança: ${erros.length} erro(s), ${avisos.length} aviso(s).`);
if (process.env.GITHUB_STEP_SUMMARY){
  const { appendFileSync } = await import("node:fs");
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Segurança\n\n${erros.length ? erros.map(e => `- ❌ ${e}`).join("\n") : "- ✅ Nenhum problema de segurança encontrado."}\n${avisos.map(a => `- ⚠️ ${a}`).join("\n")}\n`);
}
process.exit(erros.length ? 1 : 0);
