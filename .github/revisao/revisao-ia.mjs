// Revisão de textos, navegação e segurança feita pelo Claude a cada commit.
// Publica o parecer no resumo da execução e como comentário no commit (ou no pull request).
// É consultiva: não quebra a pipeline. Precisa do segredo ANTHROPIC_API_KEY no repositório.
import { execSync } from "node:child_process";
import { readFileSync, existsSync, appendFileSync } from "node:fs";

const { ANTHROPIC_API_KEY, GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_STEP_SUMMARY, BASE_SHA, HEAD_SHA, PR_NUMERO } = process.env;
const MODELO = process.env.MODELO || "claude-sonnet-5";
const resumo = t => { console.log(t); if (GITHUB_STEP_SUMMARY) appendFileSync(GITHUB_STEP_SUMMARY, t + "\n"); };
const sh = c => execSync(c, { encoding: "utf8", maxBuffer: 20e6 });

if (!ANTHROPIC_API_KEY){
  resumo("## Revisão do Claude\n\nℹ️ Revisão pulada: o segredo `ANTHROPIC_API_KEY` ainda não foi cadastrado no repositório (Settings → Secrets and variables → Actions).");
  process.exit(0);
}

// o que mudou neste commit (ou no pull request), sem o agenda.json, que só tem horários
const vazio = !BASE_SHA || /^0+$/.test(BASE_SHA);
const intervalo = vazio ? `${HEAD_SHA}~1..${HEAD_SHA}` : `${BASE_SHA}..${HEAD_SHA}`;
let arquivos = [];
try { arquivos = sh(`git diff --name-only ${intervalo}`).split("\n").filter(f => f && f !== "agenda.json" && existsSync(f)); }
catch { arquivos = sh(`git ls-files`).split("\n").filter(f => /\.html$/.test(f)); }

if (!arquivos.length){
  resumo("## Revisão do Claude\n\n✅ Só a agenda de horários mudou. Nada de texto ou navegação para revisar.");
  process.exit(0);
}

const diff = sh(`git diff ${intervalo} -- ${arquivos.map(f => `"${f}"`).join(" ")} || true`).slice(0, 120_000);
const paginas = arquivos.filter(f => f.endsWith(".html")).map(f => `===== ${f} (versão completa) =====\n${readFileSync(f, "utf8")}`).join("\n\n").slice(0, 250_000);

const instrucoes = `Você revisa o site da Kairavana, uma marca de terapias integrativas (Reiki para adultos, Reiki infantil a distância, Florais de Bach, Mapa numerológico). O site é uma página única, com agenda que envia o pedido pelo WhatsApp, e uma área de gestão (admin.html) que publica a agenda pela API do GitHub com uma chave da própria responsável.

Revise as ALTERAÇÕES deste commit, usando a página completa só como contexto. Responda em português do Brasil, em Markdown, curto e direto, para uma pessoa que não é programadora. Não elogie; aponte só o que vale mudar, citando o trecho e sugerindo o texto ou a correção.

Seções (omita as que não tiverem nada):
### 🔒 Segurança
Chaves, tokens ou senhas expostos; dados pessoais de clientes em arquivos públicos (o repositório é público); links externos inseguros; scripts de origem desconhecida; a chave da área de gestão indo para outro lugar que não api.github.com.
### ✍️ Textos
Clareza, tom acolhedor e simples, repetição, erros de português. Regras da marca: nunca prometer cura ou resultado; manter o aviso de que as terapias são complementares e nunca substituem tratamento médico ou psicológico; avisar que os florais contêm álcool; manter o CVV 188; usar "a distância" e não "on-line"; evitar palavras ligadas a toque físico; não repetir "crianças e crianças autistas".
### 🧭 Navegação e jornada
O caminho do cliente até agendar deve ser curto: terapia → dia → horário → nome → WhatsApp. Aponte passos extras, botões confusos, rótulos vagos, links que não levam a lugar nenhum, excesso de caminhos para o mesmo destino, problemas no celular, foco/teclado e leitores de tela.

Termine com uma linha exatamente neste formato:
**Parecer:** ✅ Pode seguir | ⚠️ Ajustes recomendados | ❌ Corrigir antes de publicar
(escolha um só; use ❌ apenas para risco de segurança ou quebra da regra de comunicação responsável).`;

const r = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
  body: JSON.stringify({
    model: MODELO, max_tokens: 3000, system: instrucoes,
    messages: [{ role: "user", content: `Arquivos alterados: ${arquivos.join(", ")}\n\n===== DIFF =====\n${diff}\n\n${paginas}` }]
  })
});
if (!r.ok){
  resumo(`## Revisão do Claude\n\n⚠️ Não foi possível revisar agora (${r.status}). ${(await r.text()).slice(0, 300)}`);
  process.exit(0);
}
const parecer = (await r.json()).content.filter(b => b.type === "text").map(b => b.text).join("\n").trim();
const corpo = `## 🌿 Revisão do Claude\n\n${parecer}\n\n<sub>Revisão automática de ${arquivos.length} arquivo(s). É uma sugestão: a decisão final é sua.</sub>`;
resumo(corpo);

// comenta no pull request ou no commit
const alvo = PR_NUMERO ? `issues/${PR_NUMERO}/comments` : `commits/${HEAD_SHA}/comments`;
const c = await fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}/${alvo}`, {
  method: "POST",
  headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" },
  body: JSON.stringify({ body: corpo })
});
if (!c.ok) console.log(`::warning::Não consegui comentar (${c.status}); o parecer está no resumo da execução.`);
