/* Núcleo da loja Kairavana: dados (Supabase ou demonstração), carrinho, favoritos,
   login, cabeçalho e rodapé. Usado por loja.html, conta.html e gestao-loja.html. */
(() => {
const CFG = window.KAIRAVANA_LOJA || {};
const DEMO = !CFG.supabaseUrl || !CFG.supabaseChave || !window.supabase;
const sb = DEMO ? null : window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseChave);

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const brl = v => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const ler = (k, padrao) => { try { return JSON.parse(localStorage.getItem(k)) ?? padrao; } catch { return padrao; } };
const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const slug = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const falha = r => { if (r.error) throw new Error(traduzErro(r.error.message)); return r.data; };
function traduzErro(m = ""){
  if (/Invalid login credentials/i.test(m)) return "E-mail ou senha incorretos.";
  if (/Email not confirmed/i.test(m)) return "Confirme seu e-mail pelo link que enviamos antes de entrar.";
  if (/already registered/i.test(m)) return "Já existe uma conta com este e-mail. Tente entrar ou recuperar a senha.";
  if (/Password should be/i.test(m)) return "A senha precisa ter pelo menos 8 caracteres.";
  return m || "Algo deu errado. Tente de novo em instantes.";
}

/* ---------- ilustrações dos produtos de demonstração ---------- */
const DESENHOS = {
  velas: '<rect x="70" y="80" width="60" height="80" rx="8" fill="#F7EFE7"/><path d="M100 40c10 14 10 26 0 32-10-6-10-18 0-32z" fill="#C58A4A"/><rect x="98" y="70" width="4" height="12" fill="#3B1A16"/>',
  "oleos-essenciais": '<rect x="78" y="78" width="44" height="80" rx="10" fill="#6B4A42"/><rect x="84" y="56" width="32" height="24" rx="4" fill="#3B1A16"/><rect x="84" y="100" width="32" height="30" rx="3" fill="#EFE3D8"/>',
  incensos: '<path d="M60 160 140 60" stroke="#3B1A16" stroke-width="6" stroke-linecap="round"/><path d="M82 160 150 76" stroke="#6B4A42" stroke-width="6" stroke-linecap="round"/><path d="M142 56c-10-10 8-18-2-30" fill="none" stroke="#F7EFE7" stroke-width="4" stroke-linecap="round"/>',
  sprays: '<rect x="74" y="84" width="52" height="76" rx="12" fill="#F7EFE7"/><rect x="88" y="62" width="24" height="24" rx="4" fill="#3B1A16"/><path d="M112 68h16" stroke="#3B1A16" stroke-width="6" stroke-linecap="round"/>',
  "banhos-de-ervas": '<path d="M100 150C50 120 60 60 100 44c40 16 50 76 0 106z" fill="#3F6B4A"/><path d="M100 150V60" stroke="#F7EFE7" stroke-width="4"/>',
  "sais-de-banho": '<rect x="66" y="74" width="68" height="80" rx="14" fill="#F7EFE7"/><rect x="72" y="60" width="56" height="18" rx="6" fill="#6B4A42"/><g fill="#D9A597"><circle cx="86" cy="116" r="6"/><circle cx="104" cy="128" r="6"/><circle cx="116" cy="108" r="6"/><circle cx="92" cy="138" r="5"/></g>',
  cristais: '<path d="M100 40 136 84 100 160 64 84z" fill="#D9A597"/><path d="M100 40v120M64 84h72" stroke="#F7EFE7" stroke-width="3"/>',
  florais: '<rect x="78" y="86" width="44" height="72" rx="10" fill="#8E3A30"/><rect x="88" y="64" width="24" height="24" rx="4" fill="#3B1A16"/><ellipse cx="100" cy="56" rx="10" ry="14" fill="#3B1A16"/>',
  oraculos: '<rect x="58" y="62" width="60" height="90" rx="8" fill="#F7EFE7" transform="rotate(-10 88 107)"/><rect x="82" y="56" width="60" height="90" rx="8" fill="#8E3A30"/><circle cx="112" cy="101" r="14" fill="none" stroke="#EFE3D8" stroke-width="4"/>'
};
function arte(cat, fundo = "#D9A597"){
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="${fundo}"/>${DESENHOS[cat] || DESENHOS.cristais}</svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

/* ---------- dados de demonstração (valores e produtos são exemplos) ---------- */
const DEMO_CATS = [
  ["velas", "Velas aromáticas", "Velas de cera vegetal com aromas para acompanhar seus momentos de pausa."],
  ["oleos-essenciais", "Óleos essenciais", "Óleos essenciais para difusor e para compor os seus rituais de autocuidado."],
  ["incensos", "Incensos", "Incensos naturais para perfumar o ambiente."],
  ["sprays", "Sprays áuricos e home sprays", "Sprays para ambientes, tecidos e para o seu momento de cuidado."],
  ["banhos-de-ervas", "Banhos de ervas", "Ervas desidratadas para banhos de assento, escalda-pés e infusões de banho."],
  ["sais-de-banho", "Sais de banho", "Sais com ervas e óleos essenciais para banhos e escalda-pés."],
  ["cristais", "Cristais e pedras", "Cristais e pedras naturais, escolhidos um a um."],
  ["florais", "Florais de Bach", "Essências florais de Bach. A maioria é conservada em conhaque: contém álcool."],
  ["oraculos", "Oráculos e cartas", "Baralhos e cartas de autoconhecimento, para reflexão e não para previsão."]
].map(([id, nome, descricao], ordem) => ({ id, slug: id, nome, descricao, ordem }));
const P = (nome, cat, preco, extra = {}) => ({ nome, categoria_id: cat, preco, estoque: 12, destaque: false, ativo: true, aviso: "", como_usar: "", preco_antigo: null, ...extra });
const DEMO_PRODUTOS = [
  P("Vela aromática Lavanda e Alecrim 180 g", "velas", 69.9, { preco_antigo: 79.9, destaque: true, descricao: "Vela de cera vegetal com pavio de algodão, em pote de vidro reutilizável.", como_usar: "Na primeira queima, deixe derreter toda a superfície. Apague antes de 4 horas acesa e nunca deixe sem supervisão." }),
  P("Vela aromática Laranja e Canela 180 g", "velas", 69.9, { descricao: "Vela de cera vegetal com aroma cítrico e especiado." }),
  P("Vela de massagem Baunilha 100 g", "velas", 59.9, { descricao: "Vela de cera vegetal que derrete em óleo morno.", aviso: "Teste numa pequena área da pele antes de usar." }),
  P("Óleo essencial de Lavanda 10 ml", "oleos-essenciais", 39.9, { destaque: true, descricao: "Óleo essencial de lavanda para difusor.", como_usar: "Pingue de 3 a 5 gotas no difusor com água.", aviso: "Uso externo. Não ingerir. Mantenha longe de crianças e animais. Dilua antes de aplicar na pele." }),
  P("Óleo essencial de Laranja-doce 10 ml", "oleos-essenciais", 29.9, { descricao: "Óleo essencial de laranja-doce para difusor.", aviso: "Uso externo. Não ingerir. Pode manchar tecidos. Evite sol após aplicar na pele." }),
  P("Kit 3 óleos essenciais: Lavanda, Alecrim e Hortelã", "oleos-essenciais", 99.9, { preco_antigo: 119.7, descricao: "Três frascos de 10 ml em caixa presente.", aviso: "Uso externo. Não ingerir." }),
  P("Incenso natural Palo Santo (caixa com 8)", "incensos", 24.9, { descricao: "Varetas de incenso natural, sem carvão." }),
  P("Incenso natural Sândalo (caixa com 8)", "incensos", 22.9, { descricao: "Varetas de incenso natural com aroma amadeirado." }),
  P("Home spray Brisa do Campo 120 ml", "sprays", 54.9, { destaque: true, descricao: "Spray para ambientes e tecidos.", como_usar: "Borrife a 30 cm de tecidos e no ar." }),
  P("Spray áurico Calmaria 60 ml", "sprays", 49.9, { descricao: "Spray com óleos essenciais para o seu momento de pausa." }),
  P("Banho de ervas Alecrim, Arruda e Guiné", "banhos-de-ervas", 29.9, { descricao: "Mistura de ervas desidratadas para banho.", como_usar: "Faça uma infusão com 1 litro de água quente, deixe amornar, coe e use do pescoço para baixo." }),
  P("Banho de ervas Camomila e Lavanda", "banhos-de-ervas", 29.9, { descricao: "Mistura de ervas desidratadas para banho e escalda-pés." }),
  P("Sal de banho Rosas 300 g", "sais-de-banho", 44.9, { destaque: true, descricao: "Sal grosso com pétalas de rosa e óleo essencial.", como_usar: "Dissolva um punhado na banheira ou no escalda-pés." }),
  P("Sal de banho Eucalipto 300 g", "sais-de-banho", 44.9, { descricao: "Sal grosso com folhas de eucalipto." }),
  P("Ametista bruta (unidade)", "cristais", 34.9, { descricao: "Pedra natural. Cada peça é única: tamanho e cor variam." }),
  P("Quartzo rosa rolado (unidade)", "cristais", 19.9, { descricao: "Pedra natural polida. Cada peça é única." }),
  P("Kit 7 pedras dos chakras", "cristais", 59.9, { preco_antigo: 69.9, destaque: true, descricao: "Sete pedras roladas em saquinho de algodão." }),
  P("Floral de Bach Rescue 20 ml", "florais", 64.9, { descricao: "Fórmula floral de Bach em conta-gotas.", aviso: "Contém álcool (conhaque). Se você evita álcool, está grávida ou é para uma criança, fale com a gente antes." }),
  P("Floral de Bach personalizado 30 ml", "florais", 79.9, { descricao: "Frasco montado para você a partir de uma conversa pelo WhatsApp.", aviso: "Contém álcool (conhaque). Existem alternativas: pergunte." }),
  P("Oráculo Caminhos (44 cartas)", "oraculos", 119.9, { destaque: true, descricao: "Baralho de autoconhecimento com livreto. Para reflexão, não para previsão." }),
  P("Baralho Cigano tradicional (36 cartas)", "oraculos", 59.9, { estoque: 0, descricao: "Baralho cigano com livreto explicativo." })
].map((p, i) => ({ ...p, id: "demo-" + (i + 1), slug: slug(p.nome), imagens: [], criado_em: new Date(Date.now() - i * 864e5 * 3).toISOString() }));
const CORES = { velas: "#D9A597", "oleos-essenciais": "#F7EFE7", incensos: "#C58A4A", sprays: "#D9A597", "banhos-de-ervas": "#F7EFE7", "sais-de-banho": "#C58A4A", cristais: "#6B4A42", florais: "#F7EFE7", oraculos: "#D9A597" };
const CONFIG_PADRAO = { frete_fixo: 22, frete_gratis_acima: 250, parcelas_sem_juros: 3 };

// estado da demonstração, guardado na aba do navegador
const demoEstado = (() => {
  const salvo = (() => { try { return JSON.parse(sessionStorage.getItem("kv-demo")); } catch { return null; } })();
  const base = salvo || { categorias: DEMO_CATS, produtos: DEMO_PRODUTOS, config: CONFIG_PADRAO, pedidos: pedidosExemplo(), enderecos: [], perfil: null };
  return { ...base, salvar(){ try { sessionStorage.setItem("kv-demo", JSON.stringify({ ...this, salvar: undefined })); } catch {} } };
})();
function pedidosExemplo(){
  const item = (id, q) => { const p = DEMO_PRODUTOS[id]; return { produto_id: p.id, nome: p.nome, preco: p.preco, quantidade: q }; };
  const pedido = (numero, dias, status, itens, cliente) => {
    const subtotal = itens.reduce((s, i) => s + i.preco * i.quantidade, 0), frete = subtotal >= 250 ? 0 : 22;
    return { id: "pedido-" + numero, numero, status, itens_pedido: itens, subtotal, frete, total: subtotal + frete, rastreio: status === "enviado" ? "BR123456789BR" : "",
      criado_em: new Date(Date.now() - dias * 864e5).toISOString(), usuario_id: cliente.id, perfis: cliente,
      endereco: { rua: "Rua das Flores", numero: "100", bairro: "Centro", cidade: "São Paulo", uf: "SP", cep: "01000-000" } };
  };
  const ana = { id: "cliente-1", nome: "Ana (exemplo)", email: "ana@exemplo.com", telefone: "(11) 90000-0001" };
  const bia = { id: "cliente-2", nome: "Bia (exemplo)", email: "bia@exemplo.com", telefone: "(11) 90000-0002" };
  return [
    pedido(1004, 0, "pago", [item(0, 1), item(3, 2)], ana),
    pedido(1003, 2, "em_preparo", [item(19, 1)], bia),
    pedido(1002, 6, "enviado", [item(12, 2), item(16, 1)], ana),
    pedido(1001, 15, "entregue", [item(8, 1)], bia),
    pedido(1000, 20, "cancelado", [item(6, 3)], ana)
  ];
}

/* ---------- API ---------- */
const imagemDe = p => (p.imagens && p.imagens[0]) || arte(p.categoria_id && DESENHOS[p.categoria_id] ? p.categoria_id : (p._catSlug || ""), CORES[p.categoria_id] || CORES[p._catSlug] || "#D9A597");
const usuarioDemo = () => ler("kv-demo-usuario", null);

const Loja = {
  demo: DEMO, sb, esc, brl, slug, imagemDe,
  STATUS: { aguardando_pagamento: "Aguardando pagamento", pago: "Pago", em_preparo: "Em preparação", enviado: "Enviado", entregue: "Entregue", cancelado: "Cancelado" },
  whatsapp: CFG.whatsapp || "5511999999999",

  async catalogo({ todos = false } = {}){
    if (DEMO) return { categorias: [...demoEstado.categorias].sort((a, b) => a.ordem - b.ordem), produtos: demoEstado.produtos.filter(p => todos || p.ativo) };
    const [cats, prods] = await Promise.all([
      sb.from("categorias").select("*").order("ordem"),
      (() => { let q = sb.from("produtos").select("*").order("criado_em", { ascending: false }); if (!todos) q = q.eq("ativo", true); return q; })()
    ]);
    const categorias = falha(cats);
    const porId = Object.fromEntries(categorias.map(c => [c.id, c.slug]));
    return { categorias, produtos: falha(prods).map(p => ({ ...p, preco: Number(p.preco), preco_antigo: p.preco_antigo && Number(p.preco_antigo), _catSlug: porId[p.categoria_id] })) };
  },
  async config(){
    if (DEMO) return demoEstado.config;
    const r = await sb.from("configuracoes").select("*").eq("id", 1).maybeSingle();
    return { ...CONFIG_PADRAO, ...(r.data || {}) };
  },
  frete(subtotal, cfg){ return subtotal <= 0 || (cfg.frete_gratis_acima && subtotal >= cfg.frete_gratis_acima) ? 0 : Number(cfg.frete_fixo || 0); },
  parcelas(valor, cfg){ const n = Number(cfg.parcelas_sem_juros || 0); return n > 1 && valor >= n * 10 ? `ou ${n}x de ${brl(valor / n)} sem juros` : ""; },

  /* login */
  async usuario(){
    if (DEMO) return usuarioDemo();
    const { data } = await sb.auth.getSession();
    return data.session ? data.session.user : null;
  },
  async entrar(email, senha){
    if (DEMO){ const u = { id: "cliente-demo", email, user_metadata: { nome: email.split("@")[0] } }; gravar("kv-demo-usuario", u); return u; }
    return falha(await sb.auth.signInWithPassword({ email, password: senha })).user;
  },
  async cadastrar({ nome, email, senha, telefone }){
    if (DEMO){ const u = { id: "cliente-demo", email, user_metadata: { nome, telefone } }; gravar("kv-demo-usuario", u); return { user: u, session: true }; }
    const volta = new URL("conta.html", location.href).href;
    return falha(await sb.auth.signUp({ email, password: senha, options: { data: { nome, telefone }, emailRedirectTo: volta } }));
  },
  async recuperarSenha(email){
    if (DEMO) return;
    falha(await sb.auth.resetPasswordForEmail(email, { redirectTo: new URL("conta.html#nova-senha", location.href).href }));
  },
  async novaSenha(senha){ if (!DEMO) falha(await sb.auth.updateUser({ password: senha })); },
  async sair(){ if (DEMO) localStorage.removeItem("kv-demo-usuario"); else await sb.auth.signOut(); },

  /* área do cliente */
  async perfil(){
    const u = await Loja.usuario(); if (!u) return null;
    if (DEMO) return demoEstado.perfil || { id: u.id, nome: u.user_metadata?.nome || "", telefone: u.user_metadata?.telefone || "", email: u.email };
    return falha(await sb.from("perfis").select("*").eq("id", u.id).maybeSingle()) || { id: u.id, email: u.email, nome: "", telefone: "" };
  },
  async salvarPerfil({ nome, telefone }){
    if (DEMO){ demoEstado.perfil = { ...(await Loja.perfil()), nome, telefone }; demoEstado.salvar(); return; }
    const u = await Loja.usuario();
    falha(await sb.from("perfis").update({ nome, telefone }).eq("id", u.id));
  },
  async enderecos(){
    if (DEMO) return demoEstado.enderecos;
    return falha(await sb.from("enderecos").select("*").order("principal", { ascending: false }).order("criado_em"));
  },
  async salvarEndereco(e){
    if (DEMO){
      if (e.principal) demoEstado.enderecos.forEach(x => x.principal = false);
      const i = demoEstado.enderecos.findIndex(x => x.id === e.id);
      if (i >= 0) demoEstado.enderecos[i] = e; else demoEstado.enderecos.push({ ...e, id: "end-" + Date.now() });
      demoEstado.salvar(); return;
    }
    if (e.principal) await sb.from("enderecos").update({ principal: false }).neq("id", e.id || "00000000-0000-0000-0000-000000000000");
    const { id, ...dados } = e;
    falha(id ? await sb.from("enderecos").update(dados).eq("id", id) : await sb.from("enderecos").insert(dados));
  },
  async excluirEndereco(id){
    if (DEMO){ demoEstado.enderecos = demoEstado.enderecos.filter(e => e.id !== id); demoEstado.salvar(); return; }
    falha(await sb.from("enderecos").delete().eq("id", id));
  },
  async meusPedidos(){
    if (DEMO){ const u = usuarioDemo(); return demoEstado.pedidos.filter(p => p.usuario_id === (u && u.id)); }
    return falha(await sb.from("pedidos").select("*, itens_pedido(*)").order("criado_em", { ascending: false }));
  },
  // cria o pedido no servidor (preços e estoque conferidos lá) e devolve o link de pagamento
  async finalizar(itens, enderecoId, mensagem = ""){
    if (DEMO){
      const u = usuarioDemo(), cat = await Loja.catalogo(), cfg = await Loja.config();
      const linhas = itens.map(i => { const p = cat.produtos.find(x => x.id === i.produto_id); return { produto_id: p.id, nome: p.nome, preco: p.preco, quantidade: i.quantidade }; });
      const subtotal = linhas.reduce((s, i) => s + i.preco * i.quantidade, 0), frete = Loja.frete(subtotal, cfg);
      const numero = Math.max(...demoEstado.pedidos.map(p => p.numero)) + 1;
      demoEstado.pedidos.unshift({ id: "pedido-" + numero, numero, status: "aguardando_pagamento", itens_pedido: linhas, subtotal, frete, total: subtotal + frete, criado_em: new Date().toISOString(), usuario_id: u.id,
        perfis: { id: u.id, nome: u.user_metadata?.nome, email: u.email }, endereco: demoEstado.enderecos.find(e => e.id === enderecoId) || null, mensagem_cartao: mensagem });
      demoEstado.salvar();
      return { demo: true, numero };
    }
    const { data, error } = await sb.functions.invoke("checkout", { body: { itens, endereco_id: enderecoId, mensagem_cartao: mensagem } });
    if (error || !data?.url) throw new Error(data?.erro || "Não foi possível iniciar o pagamento. Tente de novo em instantes.");
    return data;
  },

  /* gestão da loja */
  admin: {
    async ehAdmin(){
      if (DEMO) return !!sessionStorage.getItem("kv-demo-admin");
      const { data } = await sb.rpc("eh_admin");
      return data === true;
    },
    entrarDemo(){ sessionStorage.setItem("kv-demo-admin", "1"); },
    async pedidos(){
      if (DEMO) return demoEstado.pedidos;
      return falha(await sb.from("pedidos").select("*, itens_pedido(*), perfis(nome, email, telefone)").order("criado_em", { ascending: false }).limit(500));
    },
    async atualizarPedido(id, campos){
      if (DEMO){ Object.assign(demoEstado.pedidos.find(p => p.id === id), campos); demoEstado.salvar(); return; }
      falha(await sb.from("pedidos").update(campos).eq("id", id));
    },
    async salvarProduto(p){
      const dados = { ...p }; delete dados._catSlug;
      dados.slug = dados.slug || slug(dados.nome);
      if (DEMO){
        const i = demoEstado.produtos.findIndex(x => x.id === dados.id);
        if (i >= 0) demoEstado.produtos[i] = { ...demoEstado.produtos[i], ...dados };
        else demoEstado.produtos.unshift({ ...dados, id: "demo-" + Date.now(), criado_em: new Date().toISOString() });
        demoEstado.salvar(); return;
      }
      const { id, criado_em, ...resto } = dados;
      falha(id ? await sb.from("produtos").update(resto).eq("id", id) : await sb.from("produtos").insert(resto));
    },
    async excluirProduto(id){
      if (DEMO){ demoEstado.produtos = demoEstado.produtos.filter(p => p.id !== id); demoEstado.salvar(); return; }
      falha(await sb.from("produtos").delete().eq("id", id));
    },
    async enviarImagem(arquivo){
      if (DEMO) return new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(arquivo); });
      const nome = `${crypto.randomUUID()}-${slug(arquivo.name.replace(/\.[^.]+$/, ""))}.${(arquivo.name.split(".").pop() || "jpg").toLowerCase()}`;
      falha(await sb.storage.from("produtos").upload(nome, arquivo, { cacheControl: "31536000", upsert: false }));
      return sb.storage.from("produtos").getPublicUrl(nome).data.publicUrl;
    },
    async salvarCategoria(c){
      const dados = { ...c, slug: c.slug || slug(c.nome) };
      if (DEMO){
        const i = demoEstado.categorias.findIndex(x => x.id === dados.id);
        if (i >= 0) demoEstado.categorias[i] = dados; else demoEstado.categorias.push({ ...dados, id: dados.slug });
        demoEstado.salvar(); return;
      }
      const { id, ...resto } = dados;
      falha(id ? await sb.from("categorias").update(resto).eq("id", id) : await sb.from("categorias").insert(resto));
    },
    async excluirCategoria(id){
      if (DEMO){ demoEstado.categorias = demoEstado.categorias.filter(c => c.id !== id); demoEstado.salvar(); return; }
      falha(await sb.from("categorias").delete().eq("id", id));
    },
    async clientes(){
      if (DEMO){
        const mapa = {};
        demoEstado.pedidos.forEach(p => { const c = p.perfis; mapa[c.id] ||= { ...c, pedidos: 0, total: 0 }; mapa[c.id].pedidos++; if (p.status !== "cancelado") mapa[c.id].total += p.total; });
        return Object.values(mapa);
      }
      const lista = falha(await sb.from("perfis").select("id, nome, email, telefone, criado_em, pedidos(total, status)").order("criado_em", { ascending: false }));
      return lista.map(c => ({ ...c, pedidos: c.pedidos.length, total: c.pedidos.filter(p => p.status !== "cancelado").reduce((s, p) => s + Number(p.total), 0) }));
    },
    async salvarConfig(c){
      if (DEMO){ demoEstado.config = { ...demoEstado.config, ...c }; demoEstado.salvar(); return; }
      falha(await sb.from("configuracoes").update(c).eq("id", 1));
    },
    async sair(){ sessionStorage.removeItem("kv-demo-admin"); if (!DEMO) await sb.auth.signOut(); }
  },

  /* carrinho e favoritos (ficam no navegador da pessoa) */
  carrinho: {
    ler: () => ler("kv-carrinho", []),
    gravar(lista){ gravar("kv-carrinho", lista.filter(i => i.q > 0)); document.dispatchEvent(new CustomEvent("carrinho")); },
    adicionar(id, q = 1){ const l = this.ler(), i = l.find(x => x.id === id); if (i) i.q += q; else l.push({ id, q }); this.gravar(l); },
    definir(id, q){ this.gravar(this.ler().map(x => x.id === id ? { ...x, q } : x)); },
    remover(id){ this.gravar(this.ler().filter(x => x.id !== id)); },
    limpar(){ this.gravar([]); },
    contar(){ return this.ler().reduce((s, i) => s + i.q, 0); }
  },
  favoritos: {
    ler: () => ler("kv-favoritos", []),
    alternar(id){ const l = this.ler(); const tem = l.includes(id); gravar("kv-favoritos", tem ? l.filter(x => x !== id) : [...l, id]); return !tem; }
  },

  toast(msg){
    let t = document.querySelector(".toast");
    if (!t){ t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.append(t); }
    t.textContent = msg; t.classList.add("visivel");
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("visivel"), 2600);
  }
};

/* ---------- ícones, cabeçalho e rodapé ---------- */
Loja.ICONES = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="roda" viewBox="0 0 100 100"><g fill="none" stroke="currentColor" stroke-linecap="round"><circle cx="50" cy="50" r="42" stroke-width="12"/><path stroke-width="7" d="M50 41V16M50 59v25M41 50H16M59 50h25M43.6 43.6 26 26M56.4 56.4 74 74M56.4 43.6 74 26M43.6 56.4 26 74"/><circle cx="50" cy="50" r="7" stroke-width="5"/></g></symbol>
  <symbol id="i-busca" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></g></symbol>
  <symbol id="i-conta" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></g></symbol>
  <symbol id="i-sacola" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></g></symbol>
  <symbol id="i-coracao" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></symbol>
  <symbol id="i-fechar" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 6l12 12M18 6 6 18"/></symbol>
  <symbol id="i-menu" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16"/></symbol>
  <symbol id="i-filtro" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M4 6h16M7 12h10M10 18h4"/></symbol>
  <symbol id="i-wa" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></symbol>
</svg>`;

// mesmo topo do site em todas as páginas; na loja, uma segunda linha com busca e categorias
const atual = cond => cond ? ' aria-current="page"' : "";
Loja.cabecalho = (categorias = [], ativa = "", pagina = "loja") => `
  ${DEMO ? `<p class="aviso-demo">Loja em demonstração: os produtos e valores são exemplos e nenhuma compra é cobrada.</p>` : ""}
  ${pagina === "loja" ? `<p class="faixa">Todo pedido vai embalado com carinho, com cartão e mensagem. <strong>Frete grátis</strong> a partir de <span data-frete-gratis>${brl(CONFIG_PADRAO.frete_gratis_acima)}</span>.</p>` : ""}
  <header class="cab">
    <div class="wrap cab-linha">
      <a class="logo" href="index.html" aria-label="Kairavana, página inicial"><svg aria-hidden="true"><use href="#roda"/></svg>kairavana</a>
      <nav class="cab-menu" id="cab-menu" aria-label="Principal">
        <a href="index.html#sobre">Sobre</a>
        <a href="index.html#terapias">Terapias</a>
        <a href="index.html#cuidado">Nosso cuidado</a>
        <a href="index.html#perguntas">Perguntas</a>
        <a href="loja.html#/"${atual(pagina === "loja")}>Loja</a>
        <a href="conta.html" class="so-celular"${atual(pagina === "conta")}>Minha conta</a>
        <a href="index.html#contato">Contato</a>
        <a class="btn btn-primario" href="index.html#agenda">Agendar um horário</a>
      </nav>
      <div class="icones">
        <a class="icone icone-conta" href="conta.html" aria-label="Minha conta"${atual(pagina === "conta")}><svg aria-hidden="true"><use href="#i-conta"/></svg></a>
        <button class="icone" type="button" id="abrir-carrinho" aria-label="Abrir carrinho"><svg aria-hidden="true"><use href="#i-sacola"/></svg><span class="contagem" id="contagem" hidden></span></button>
        <button class="icone cab-menu-botao" type="button" id="cab-menu-botao" aria-expanded="false" aria-controls="cab-menu" aria-label="Abrir menu"><svg aria-hidden="true"><use href="#i-menu"/></svg></button>
      </div>
    </div>
    ${pagina === "loja" ? `<div class="cab-loja"><div class="wrap cab-loja-linha">
      <nav class="cats" aria-label="Categorias da loja"><ul>
        <li><a href="loja.html#/"${atual(ativa === "todos")}>Todos</a></li>
        ${categorias.map(c => `<li><a href="loja.html#/categoria/${esc(c.slug)}"${atual(ativa === c.slug)}>${esc(c.nome)}</a></li>`).join("")}
        <li><a href="loja.html#/favoritos"${atual(ativa === "favoritos")}><svg width="16" height="16" aria-hidden="true"><use href="#i-coracao"/></svg>Favoritos</a></li>
      </ul></nav>
      <form class="busca" role="search" id="form-busca"><label class="sr" for="busca">Buscar produtos</label>
        <input id="busca" type="search" placeholder="O que você procura?" autocomplete="off">
        <button type="submit" aria-label="Buscar"><svg width="20" height="20" aria-hidden="true"><use href="#i-busca"/></svg></button></form>
    </div></div>` : ""}
  </header>`;

Loja.rodape = () => `
  <footer class="rod"><div class="wrap">
    <div class="rod-grade">
      <div style="display:grid; gap:12px; align-content:start">
        <a class="logo" href="index.html"><svg aria-hidden="true"><use href="#roda"/></svg>kairavana</a>
        <p>Centro holístico de bem-estar. Nossos produtos acompanham seus momentos de autocuidado e não substituem acompanhamento médico ou psicológico.</p>
      </div>
      <div><h2>Loja</h2><ul><li><a href="loja.html#/">Todos os produtos</a></li><li><a href="loja.html#/favoritos">Favoritos</a></li><li><a href="conta.html">Minha conta</a></li></ul></div>
      <div><h2>Kairavana</h2><ul><li><a href="index.html#terapias">Atendimentos</a></li><li><a href="index.html#agenda">Agendar</a></li><li><a href="index.html#perguntas">Perguntas</a></li></ul></div>
      <div><h2>Atendimento</h2><ul><li><a href="https://wa.me/${esc(Loja.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a></li><li><a href="https://www.instagram.com/kairavana/" target="_blank" rel="noopener">Instagram</a></li></ul></div>
    </div>
    <div class="rod-base"><span>© ${new Date().getFullYear()} Kairavana · <a href="equipe.html">Área da equipe</a></span><span>Em crise? CVV 188, 24 horas.</span></div>
  </div></footer>`;

/* gaveta do carrinho, usada na loja e na conta */
Loja.montarCarrinho = async ({ aoFinalizar } = {}) => {
  document.body.insertAdjacentHTML("beforeend", `
    <div class="fundo" id="fundo" hidden></div>
    <aside class="gaveta" id="gaveta" aria-labelledby="gaveta-titulo" inert>
      <div class="gaveta-topo"><h2 id="gaveta-titulo">Seu carrinho</h2><button class="icone" type="button" id="fechar-carrinho" aria-label="Fechar carrinho"><svg aria-hidden="true"><use href="#i-fechar"/></svg></button></div>
      <div class="gaveta-itens" id="gaveta-itens"></div>
      <div class="gaveta-rodape" id="gaveta-rodape"></div>
    </aside>`);
  const [cat, cfg] = await Promise.all([Loja.catalogo(), Loja.config()]);
  document.querySelectorAll("[data-frete-gratis]").forEach(e => e.textContent = brl(cfg.frete_gratis_acima));
  const gaveta = document.getElementById("gaveta"), fundo = document.getElementById("fundo");
  let voltarFoco = null;
  const abrir = () => { voltarFoco = document.activeElement; gaveta.classList.add("aberta"); gaveta.inert = false; fundo.hidden = false; document.getElementById("fechar-carrinho").focus(); };
  const fechar = () => { gaveta.classList.remove("aberta"); gaveta.inert = true; fundo.hidden = true; voltarFoco?.focus(); };
  function render(){
    const itens = Loja.carrinho.ler().map(i => ({ ...i, p: cat.produtos.find(p => p.id === i.id) })).filter(i => i.p);
    const n = itens.reduce((s, i) => s + i.q, 0), c = document.getElementById("contagem");
    if (c){ c.hidden = !n; c.textContent = n; }
    document.querySelectorAll("[data-frete-gratis]").forEach(e => e.textContent = brl(cfg.frete_gratis_acima));
    const subtotal = itens.reduce((s, i) => s + i.p.preco * i.q, 0), frete = Loja.frete(subtotal, cfg);
    document.getElementById("gaveta-itens").innerHTML = itens.length ? itens.map(i => `
      <div class="item"><img src="${esc(imagemDe(i.p))}" alt="" loading="lazy">
        <div><strong>${esc(i.p.nome)}</strong><span class="apoio">${brl(i.p.preco)}</span>
          <div style="display:flex; align-items:center; gap:10px; margin-top:6px"><div class="qtd"><button type="button" data-menos="${esc(i.id)}" aria-label="Diminuir">−</button><output>${i.q}</output><button type="button" data-mais="${esc(i.id)}" aria-label="Aumentar"${i.q >= i.p.estoque ? " disabled" : ""}>+</button></div>
          <button type="button" class="remover" data-remover="${esc(i.id)}">Remover</button></div></div>
        <strong>${brl(i.p.preco * i.q)}</strong></div>`).join("")
      : `<p class="vazio" style="margin-top:20px">Seu carrinho está vazio.<br>Escolha algo especial na loja.</p>`;
    const falta = cfg.frete_gratis_acima - subtotal;
    document.getElementById("gaveta-rodape").innerHTML = itens.length ? `
      ${falta > 0 ? `<p class="apoio">Faltam <strong>${brl(falta)}</strong> para o frete grátis.</p>` : `<p class="ok">Você ganhou frete grátis.</p>`}
      <div class="barra-frete" aria-hidden="true"><span style="width:${Math.min(100, subtotal / cfg.frete_gratis_acima * 100)}%"></span></div>
      <div class="linha-valor"><span>Subtotal</span><span>${brl(subtotal)}</span></div>
      <div class="linha-valor"><span>Frete</span><span>${frete ? brl(frete) : "Grátis"}</span></div>
      <div class="linha-valor total"><span>Total</span><span>${brl(subtotal + frete)}</span></div>
      <a class="btn btn-primario" href="loja.html#/finalizar" id="ir-finalizar">Finalizar compra</a>
      <button type="button" class="btn btn-secundario" id="continuar">Continuar comprando</button>` : "";
  }
  document.addEventListener("click", e => { if (e.target.closest("#abrir-carrinho")) abrir(); }); // o cabeçalho pode ser redesenhado
  document.getElementById("fechar-carrinho").addEventListener("click", fechar);
  fundo.addEventListener("click", fechar);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && gaveta.classList.contains("aberta")) fechar(); });
  gaveta.addEventListener("click", e => {
    const t = e.target.closest("button, a"); if (!t) return;
    const l = Loja.carrinho.ler(), q = id => (l.find(x => x.id === id) || {}).q || 0;
    if (t.dataset.mais) Loja.carrinho.definir(t.dataset.mais, q(t.dataset.mais) + 1);
    else if (t.dataset.menos) Loja.carrinho.definir(t.dataset.menos, q(t.dataset.menos) - 1);
    else if (t.dataset.remover) Loja.carrinho.remover(t.dataset.remover);
    else if (t.id === "continuar" || t.id === "ir-finalizar"){ fechar(); if (t.id === "ir-finalizar" && aoFinalizar){ e.preventDefault(); aoFinalizar(); } }
  });
  document.addEventListener("carrinho", render);
  addEventListener("storage", e => { if (e.key === "kv-carrinho") render(); });
  render();
  return { abrir, fechar, cat, cfg };
};

// liga a busca e o menu do celular; chamada sempre que o topo é desenhado
Loja.busca = () => {
  document.getElementById("form-busca")?.addEventListener("submit", e => {
    e.preventDefault();
    const q = document.getElementById("busca").value.trim();
    location.href = "loja.html#/busca/" + encodeURIComponent(q);
  });
  const botao = document.getElementById("cab-menu-botao"), menu = document.getElementById("cab-menu");
  if (!botao) return;
  const alternar = abrir => {
    menu.classList.toggle("aberto", abrir); botao.setAttribute("aria-expanded", abrir);
    botao.setAttribute("aria-label", abrir ? "Fechar menu" : "Abrir menu");
    botao.querySelector("use").setAttribute("href", abrir ? "#i-fechar" : "#i-menu");
  };
  botao.addEventListener("click", () => alternar(!menu.classList.contains("aberto")));
  menu.addEventListener("click", e => { if (e.target.closest("a")) alternar(false); });
};

window.Loja = Loja;
})();
