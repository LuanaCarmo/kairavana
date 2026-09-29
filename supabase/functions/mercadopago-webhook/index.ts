// Recebe os avisos do Mercado Pago e atualiza o pedido.
// Não confia no conteúdo do aviso: consulta o pagamento direto na API do Mercado Pago.
// Se MP_WEBHOOK_SECRET estiver definido, confere também a assinatura (x-signature).
// Publicar sem exigir login: supabase functions deploy mercadopago-webhook --no-verify-jwt
import { createClient } from "npm:@supabase/supabase-js@2";

async function assinaturaValida(req: Request, dataId: string) {
  const segredo = Deno.env.get("MP_WEBHOOK_SECRET");
  if (!segredo) return true;
  const partes = Object.fromEntries((req.headers.get("x-signature") || "").split(",").map((p) => p.trim().split("=")));
  const manifesto = `id:${dataId};request-id:${req.headers.get("x-request-id") || ""};ts:${partes.ts};`;
  const chave = await crypto.subtle.importKey("raw", new TextEncoder().encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const assinatura = await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(manifesto));
  const hex = [...new Uint8Array(assinatura)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === partes.v1;
}

Deno.serve(async (req) => {
  const u = new URL(req.url);
  let corpo: { type?: string; data?: { id?: string } } = {};
  try { corpo = await req.json(); } catch { /* alguns avisos vêm só na URL */ }
  const tipo = corpo.type || u.searchParams.get("type") || u.searchParams.get("topic");
  const pagamentoId = String(corpo.data?.id || u.searchParams.get("data.id") || u.searchParams.get("id") || "");
  if (tipo !== "payment" || !/^\d+$/.test(pagamentoId)) return new Response("ignorado", { status: 200 });
  if (!(await assinaturaValida(req, pagamentoId))) return new Response("assinatura inválida", { status: 401 });

  const r = await fetch(`https://api.mercadopago.com/v1/payments/${pagamentoId}`, {
    headers: { Authorization: `Bearer ${Deno.env.get("MP_ACCESS_TOKEN")}` },
  });
  if (!r.ok) return new Response("pagamento não encontrado", { status: 200 });
  const pagamento = await r.json();

  const servico = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: pedido } = await servico.from("pedidos").select("id, status, total").eq("id", pagamento.external_reference).maybeSingle();
  if (!pedido) return new Response("pedido não encontrado", { status: 200 });

  if (pagamento.status === "approved") {
    if (Math.abs(Number(pagamento.transaction_amount) - Number(pedido.total)) > 0.01) {
      return new Response("valor diferente do pedido", { status: 200 }); // não marca como pago; a equipe confere
    }
    if (pedido.status === "aguardando_pagamento" || pedido.status === "cancelado") {
      await servico.from("pedidos").update({ status: "pago", mp_payment_id: pagamentoId }).eq("id", pedido.id);
    }
    await servico.rpc("baixar_estoque", { p_pedido: pedido.id });
  } else if (["rejected", "cancelled", "refunded", "charged_back"].includes(pagamento.status) && pedido.status === "aguardando_pagamento") {
    await servico.from("pedidos").update({ status: "cancelado", mp_payment_id: pagamentoId }).eq("id", pedido.id);
  }
  return new Response("ok", { status: 200 });
});
