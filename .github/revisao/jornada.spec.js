// Testes da experiência do cliente: navegação, jornada de agendamento e acessibilidade.
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Agenda fixa para os testes não dependerem dos horários reais publicados
const AGENDA = {
  whatsapp: "5511999999999", numeroExibido: "(11) 99999-9999",
  horarios: Object.fromEntries([0,1,2,3,4,5,6].map(d => [d, ["09:00", "10:30", "14:00", "19:00"]])),
  ocupados: {}, bloqueados: [], extras: {}, antecedenciaHoras: 0, janelaDias: 30
};

let errosJs;
test.beforeEach(async ({ page }) => {
  errosJs = [];
  page.on("pageerror", e => errosJs.push(e.message));
  await page.route("**/agenda.json*", r => r.fulfill({ contentType: "application/json", body: JSON.stringify(AGENDA) }));
});
test.afterEach(() => expect(errosJs, "erros de JavaScript na página").toEqual([]));

const ehCelular = page => page.viewportSize().width < 900;

test("a página abre sem rolagem lateral", async ({ page }) => {
  await page.goto("/index.html");
  await expect(page.locator("h1")).toBeVisible();
  const sobra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(sobra, "a página não pode rolar para os lados").toBeLessThanOrEqual(0);
});

test("todos os links internos levam a uma seção que existe", async ({ page }) => {
  await page.goto("/index.html");
  const quebrados = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')]
    .map(a => a.getAttribute("href")).filter(h => h.length > 1 && !document.getElementById(h.slice(1))));
  expect(quebrados).toEqual([]);
});

test("o menu leva o cliente até a agenda", async ({ page }) => {
  await page.goto("/index.html");
  if (ehCelular(page)){
    await page.click("#menu-botao");
    await expect(page.locator("#menu-botao")).toHaveAttribute("aria-expanded", "true");
  }
  await page.locator('#menu a[href="#agenda"]').first().click();
  await expect(page.locator("#agenda h2").first()).toBeInViewport();
  if (ehCelular(page)) await expect(page.locator("#menu-botao")).toHaveAttribute("aria-expanded", "false");
});

test("jornada completa: agendar em 4 toques e abrir o WhatsApp com a mensagem certa", async ({ page }) => {
  await page.goto("/index.html#agenda");
  await expect(page.locator("#passo-hora"), "horários só aparecem depois de escolher o dia").toBeHidden();

  await page.locator("#opcoes-terapia label", { hasText: "Reiki para adultos" }).click();         // toque 1
  await page.locator("#dias button.dia:not([disabled])").first().click();                         // toque 2
  await expect(page.locator("#passo-hora")).toBeVisible();
  const hora = page.locator("#horas button").first();
  const horaEscolhida = (await hora.textContent()).trim();
  await hora.click();                                                                             // toque 3
  await expect(page.locator("#passo-nome")).toBeVisible();
  await page.fill("#ag-nome", "Maria Teste");

  const enviar = page.locator("#ag-enviar");
  await expect(enviar).not.toHaveClass(/incompleto/);
  const href = await enviar.getAttribute("href");
  expect(href).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
  const msg = decodeURIComponent(href.split("text=")[1]);
  for (const trecho of ["Reiki para adultos", "Maria Teste", `Horário: ${horaEscolhida}`, "Modalidade:"]) expect(msg).toContain(trecho);

  const [aba] = await Promise.all([page.waitForEvent("popup"), enviar.click()]);                  // toque 4
  expect(aba.url()).toMatch(/wa\.me|whatsapp\.com/);
});

test("clicar de novo no dia escolhido fecha horários e nome", async ({ page }) => {
  await page.goto("/index.html#agenda");
  await page.locator("#opcoes-terapia label").first().click();
  const dia = page.locator("#dias button.dia:not([disabled])").first();
  await dia.click();
  await expect(page.locator("#passo-hora")).toBeVisible();
  await dia.click();
  await expect(dia).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#passo-hora")).toBeHidden();
  await expect(page.locator("#passo-nome")).toBeHidden();
});

test("enviar sem preencher não abre o WhatsApp e mostra o que falta", async ({ page, context }) => {
  await page.goto("/index.html#agenda");
  let abriu = false; context.on("page", () => { abriu = true; });
  await page.locator("#ag-enviar").click();
  await page.waitForTimeout(800);
  expect(abriu, "não pode abrir o WhatsApp com o pedido incompleto").toBe(false);
  await expect(page.locator("#passo-terapia")).toBeInViewport();
  await expect(page.locator("#ag-status")).not.toBeEmpty();
});

test("reiki infantil pede nome e idade da criança e é só a distância", async ({ page }) => {
  await page.goto("/index.html#agenda");
  await page.locator("#opcoes-terapia label", { hasText: "infantil" }).click();
  await page.locator("#dias button.dia:not([disabled])").first().click();
  await expect(page.locator("#campo-crianca")).toBeVisible();
  await expect(page.locator("#linha-modalidade")).toContainText(/a distância/i);
});

test("dia sem horários aparece desativado com o aviso", async ({ page }) => {
  const amanha = new Date(Date.now() + 864e5);
  const k = `${amanha.getFullYear()}-${String(amanha.getMonth() + 1).padStart(2, "0")}-${String(amanha.getDate()).padStart(2, "0")}`;
  await page.route("**/agenda.json*", r => r.fulfill({ contentType: "application/json", body: JSON.stringify({ ...AGENDA, ocupados: { [k]: AGENDA.horarios[0] } }) }));
  await page.goto("/index.html#agenda");
  const semVaga = page.locator("#dias button.dia[disabled]");
  await expect(semVaga.first()).toContainText("sem horários");
  await expect(page.locator("#dias button.dia:not([disabled]) .vagas"), "dias com vaga não mostram contagem").toHaveCount(0);
});

test("botões e opções têm tamanho confortável para o dedo (44px)", async ({ page }) => {
  test.skip(!ehCelular(page), "só no celular");
  await page.goto("/index.html#agenda");
  await page.locator("#opcoes-terapia label").first().click();
  await page.locator("#dias button.dia:not([disabled])").first().click();
  const pequenos = await page.evaluate(() => [...document.querySelectorAll("#menu-botao, .btn, .opcao, .dia, #horas button, .segmentado label, .faq summary")]
    .filter(el => el.offsetParent !== null)
    .map(el => ({ el: (el.id ? "#" + el.id : el.className || el.tagName) + " " + el.textContent.trim().slice(0, 25), ...el.getBoundingClientRect().toJSON() }))
    .filter(r => r.height < 44 || r.width < 44).map(r => `${r.el} (${Math.round(r.width)}x${Math.round(r.height)})`));
  expect(pequenos).toEqual([]);
});

test("acessibilidade do site (sem problemas graves)", async ({ page }) => {
  await page.goto("/index.html");
  // mostra tudo que estaria aparecendo com a animação de entrada, para medir o contraste real
  await page.addStyleTag({ content: "*{transition:none!important;animation:none!important}" });
  await page.evaluate(() => document.querySelectorAll(".aguardando").forEach(el => el.classList.remove("aguardando")));
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const graves = r.violations.filter(v => ["critical", "serious"].includes(v.impact))
    .map(v => `${v.id}: ${v.help} → ${v.nodes.slice(0, 3).map(n => n.target.join(" ")).join(" | ")}`);
  expect(graves).toEqual([]);
});

test("área de gestão abre, pede a chave e não é indexada", async ({ page }) => {
  await page.goto("/admin.html");
  await expect(page.locator("#token")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const sobra = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(sobra).toBeLessThanOrEqual(0);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(r.violations.filter(v => v.impact === "critical").map(v => v.id)).toEqual([]);
});
