# Kairavana

Site institucional da Kairavana: terapias holísticas com delicadeza e com os pés no chão.

Reiki para adultos, Reiki infantil a distância, Florais de Bach e Mapa numerológico, com agenda de horários que envia o pedido pelo WhatsApp.

- Site: https://luanacarmo.github.io/kairavana/
- Gestão da agenda: https://luanacarmo.github.io/kairavana/admin.html

## Gerenciar a agenda

Na página `admin.html`, a equipe:

- fecha e reabre dias (feriados, folgas);
- marca horários como **reservados** quando alguém agenda;
- adiciona horários extras em um dia específico;
- edita a **semana padrão** de atendimento;
- ajusta o número de WhatsApp, a antecedência mínima e quantos dias a agenda mostra.

Ao clicar em **Publicar alterações**, a página salva o arquivo `agenda.json` neste repositório e, depois da revisão automática, o site atualiza em cerca de 3 a 4 minutos.

Para entrar, é preciso uma chave de acesso do GitHub (fine-grained token) com acesso apenas a este repositório e permissão **Contents: Read and write**. O passo a passo está na própria página de entrada.

## Fotos

Fotos do [Unsplash](https://unsplash.com/license), de uso livre: Jared Rice, Jon Cartagena, Anna Blake, Susie Ho, Kadarius Seegars e Andres Molina.

## Revisão automática (GitHub Actions)

Todo commit na `main` ou na `dev` (e todo pull request para elas) passa por três verificações, em **Actions → Revisão automática**:

1. **Segurança e dados expostos**: procura chaves e senhas em todo o histórico (gitleaks), confere se os links externos são seguros, se a área de gestão continua fora do Google e só fala com a API do GitHub, se o `agenda.json` tem só datas e horários (nunca dados de clientes) e se o CVV 188, o aviso de terapia complementar e o aviso do álcool nos florais continuam no site.
2. **Navegação e jornada do cliente**: abre o site no computador, num celular comum e num celular pequeno e percorre o agendamento como um cliente (terapia → dia → horário → nome → WhatsApp). Confere a mensagem gerada, os links do menu, o fechamento da data ao clicar de novo, o tamanho dos botões para o dedo, a rolagem lateral e a acessibilidade.
3. **Revisão de textos e experiência (Claude)**: lê o que mudou e comenta no commit sobre clareza dos textos, regras de comunicação da marca, navegação e segurança. É consultiva. Para ativar, cadastre o segredo `ANTHROPIC_API_KEY` em *Settings → Secrets and variables → Actions*.

Os arquivos ficam em `.github/` (fora do site publicado).

## Ambientes

| Ambiente | Branch | Link |
|---|---|---|
| Site oficial | `main` | https://luanacarmo.github.io/kairavana/ |
| Testes (dev) | `dev` | https://luanacarmo.github.io/kairavana/dev/ |

O workflow **Publicar site** roda sozinho quando a *Revisão automática* passa num commit da `main` ou da `dev`. Ele publica os dois ambientes juntos, cada um na última versão aprovada da sua branch. Se a revisão falhar, nada é publicado e o site continua na versão anterior.

O ambiente de testes mostra a faixa "Ambiente de testes (dev)", fica fora do Google, e a área de gestão dele (`/dev/admin.html`) edita a agenda da branch `dev`, sem mexer no site oficial.

Para levar uma mudança da `dev` para o site oficial, abra um pull request de `dev` para `main`.
