// Cria o pedido e o link de pagamento do Mercado Pago.
// Preços, estoque e frete são sempre calculados aqui, no servidor, a partir do banco:
// o navegador só informa quais produtos e quantidades a pessoa quer.
// Segredos (Supabase → Edge Functions → Secrets): MP_ACCESS_TOKEN, SITE_URL
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const resposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return resposta({ erro: "Método não permitido." }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const servico = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // quem está comprando (pelo login da pessoa)
  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  const { data: auth } = await servico.auth.getUser(token);
  const usuario = auth?.user;
  if (!usuario) return resposta({ erro: "Entre na sua conta para finalizar a compra." }, 401);

  let corpo: { itens?: { produto_id: string; quantidade: number }[]; endereco_id?: string; mensagem_cartao?: string };
  try { corpo = await req.json(); } catch { return resposta({ erro: "Pedido inválido." }, 400); }
  // junta linhas repetidas do mesmo produto, senão cada uma passaria sozinha na conferência de estoque
  const somadas = new Map<string, number>();
  for (const i of corpo.itens || []) {
    if (i && typeof i.produto_id === "string" && Number.isInteger(i.quantidade) && i.quantidade > 0) somadas.set(i.produto_id, (somadas.get(i.produto_id) || 0) + i.quantidade);
  }
  const itens = [...somadas].map(([produto_id, quantidade]) => ({ produto_id, quantidade })).filter((i) => i.quantidade <= 20);
  if (!itens.length || itens.length > 50) return resposta({ erro: "Seu carrinho está vazio." }, 400);
  const mensagem = String(corpo.mensagem_cartao || "").slice(0, 300);

  const { data: endereco } = await servico.from("enderecos").select("*").eq("id", corpo.endereco_id).eq("usuario_id", usuario.id).maybeSingle();
  if (!endereco) return resposta({ erro: "Escolha um endereço de entrega." }, 400);

  const { data: produtos } = await servico.from("produtos").select("id, nome, preco, estoque, ativo").in("id", itens.map((i) => i.produto_id));
  const linhas = [];
  for (const i of itens) {
    const p = produtos?.find((x) => x.id === i.produto_id);
    if (!p || !p.ativo) return resposta({ erro: "Um dos produtos não está mais disponível. Atualize o carrinho." }, 409);
    if (p.estoque < i.quantidade) return resposta({ erro: `Temos só ${p.estoque} unidade(s) de “${p.nome}”.` }, 409);
    linhas.push({ produto_id: p.id, nome: p.nome, preco: Number(p.preco), quantidade: i.quantidade });
  }
  const { data: cfg } = await servico.from("configuracoes").select("*").eq("id", 1).single();
  const subtotal = linhas.reduce((s, l) => s + l.preco * l.quantidade, 0);
  const frete = subtotal >= Number(cfg.frete_gratis_acima) ? 0 : Number(cfg.frete_fixo);
  const total = Math.round((subtotal + frete) * 100) / 100;

  const { id: _id, usuario_id: _u, criado_em: _c, ...enderecoLimpo } = endereco;
  const { data: pedido, error } = await servico.from("pedidos")
    .insert({ usuario_id: usuario.id, subtotal, frete, total, endereco: enderecoLimpo, mensagem_cartao: mensagem })
    .select("id, numero").single();
  if (error) return resposta({ erro: "Não foi possível registrar o pedido." }, 500);
  const { error: erroItens } = await servico.from("itens_pedido").insert(linhas.map((l) => ({ ...l, pedido_id: pedido.id })));
  if (erroItens) {
    await servico.from("pedidos").update({ status: "cancelado" }).eq("id", pedido.id);
    return resposta({ erro: "Não foi possível registrar o pedido." }, 500);
  }

  const site = (Deno.env.get("SITE_URL") || "").replace(/\/$/, "");
  const volta = (status: string) => `${site}/loja.html?pedido=${pedido.id}&numero=${pedido.numero}&status=${status}`;
  const mp = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("MP_ACCESS_TOKEN")}`, "Content-Type": "application/json", "X-Idempotency-Key": pedido.id },
    body: JSON.stringify({
      items: [
        ...linhas.map((l) => ({ id: l.produto_id, title: l.nome, quantity: l.quantidade, unit_price: l.preco, currency_id: "BRL" })),
        ...(frete ? [{ id: "frete", title: "Frete", quantity: 1, unit_price: frete, currency_id: "BRL" }] : []),
      ],
      payer: { email: usuario.email },
      external_reference: pedido.id,
      statement_descriptor: "KAIRAVANA",
      back_urls: { success: volta("approved"), pending: volta("pending"), failure: volta("failure") },
      auto_return: "approved",
      notification_url: `${url}/functions/v1/mercadopago-webhook`,
      payment_methods: { installments: Math.max(1, Number(cfg.parcelas_sem_juros) || 1) },
    }),
  });
  const pref = await mp.json();
  if (!mp.ok) {
    await servico.from("pedidos").update({ status: "cancelado" }).eq("id", pedido.id);
    return resposta({ erro: "Não foi possível abrir o pagamento agora. Tente de novo em instantes." }, 502);
  }
  await servico.from("pedidos").update({ mp_preference_id: pref.id }).eq("id", pedido.id);
  return resposta({ url: pref.init_point, numero: pedido.numero });
});
