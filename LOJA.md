# Loja Kairavana: como ligar

A loja tem três partes:

| Página | Para quem | O que faz |
|---|---|---|
| `loja.html` | clientes | vitrine com categorias, busca, filtros, favoritos, página do produto, carrinho e finalização da compra |
| `conta.html` | clientes | criar conta, entrar, recuperar senha, ver pedidos, guardar endereços e dados |
| `gestao-loja.html` | equipe | visão geral, pedidos (status e rastreio), produtos com fotos e estoque, categorias, clientes e ajustes de frete e parcelas |

Enquanto `loja/config.js` estiver vazio, tudo funciona em **modo demonstração**: produtos e valores de exemplo, login com qualquer e-mail e nenhum pagamento. Serve para aprovar o visual no ambiente de testes.

Para vender de verdade, siga os passos abaixo. Leva cerca de 1 hora.

> ⚠️ **Antes de ligar:** os termos de uso e a política de privacidade (LGPD) precisam estar validados, porque a loja passa a guardar nome, e-mail, telefone e endereço de clientes.

## 1. Supabase (banco de dados e login)

1. Crie uma conta em https://supabase.com e um projeto novo (região: São Paulo).
2. Em **SQL Editor → New query**, cole todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e clique em **Run**. Isso cria as tabelas, as regras de acesso, o espaço das fotos e as categorias.
3. Em **Authentication → URL Configuration**, coloque em *Site URL* o endereço do site e em *Redirect URLs* os endereços de `conta.html` (oficial e de testes).
4. Em **Project Settings → API**, copie a *Project URL* e a chave **anon / publishable** para `loja/config.js`.
   **Nunca** coloque ali a chave `service_role` / `secret`: a revisão automática bloqueia.

## 2. Mercado Pago (pagamento)

1. Em https://www.mercadopago.com.br/developers, crie uma aplicação (Checkout Pro).
2. Copie o **Access Token**. Use o de teste primeiro e o de produção depois.
3. Em **Webhooks**, cadastre a URL `https://SEU-PROJETO.supabase.co/functions/v1/mercadopago-webhook` com o evento *Pagamentos* e copie a **assinatura secreta**.
4. Se for mostrar "3x sem juros", configure as parcelas sem juros na conta do Mercado Pago com o mesmo número usado em **Gestão da loja → Ajustes**.

## 3. Funções do servidor (Supabase Edge Functions)

Com a [Supabase CLI](https://supabase.com/docs/guides/cli) instalada, na pasta do projeto:

```bash
supabase login
supabase link --project-ref SEU-PROJETO
supabase secrets set MP_ACCESS_TOKEN=... MP_WEBHOOK_SECRET=... SITE_URL=https://luanacarmo.github.io/kairavana
supabase functions deploy checkout
supabase functions deploy mercadopago-webhook --no-verify-jwt
```

- `checkout` confere preços, estoque e frete no banco, cria o pedido e abre o pagamento.
- `mercadopago-webhook` marca o pedido como **Pago** quando o Mercado Pago confirma e baixa o estoque.

## 4. Primeira pessoa da equipe

1. Crie a conta em `conta.html`.
2. No SQL Editor do Supabase, rode (trocando o e-mail):

```sql
insert into public.admins (usuario_id) select id from auth.users where email = 'email-da-equipe@exemplo.com';
```

3. Entre em `gestao-loja.html` com esse e-mail e senha. Cadastre os produtos, as fotos e confira os ajustes de frete.

## Segurança

- Cada cliente só vê os próprios pedidos, endereços e dados (regras RLS no banco).
- Só quem está na tabela `admins` edita produtos, categorias, ajustes e status de pedidos.
- Preços e total são sempre recalculados no servidor: alterar o carrinho no navegador não muda o valor cobrado.
- O pedido só vira **Pago** depois de o servidor consultar o pagamento direto no Mercado Pago e conferir o valor.
- Nenhum dado de cliente fica no repositório (que é público).
