# Guia de imagens da Kairavana

Referência para escolher, editar e publicar qualquer foto nova do site.

## Estilo

- Fotos reais, com cara de reportagem e luz natural vinda de lado.
- **Proibido:** brilhos, auras, raios de luz, "energia" desenhada, pessoas sorrindo e posando para a câmera, clichê de yoga na praia.

## Paleta da foto

- **Usar:** bege, areia, creme, linho cru, madeira, terracota, caramelo, vidro âmbar, ervas secas.
- **Evitar:** branco frio, azul, roxo, rosa vivo, verde saturado, preto puro, cinza.

## Luz

Dourada, de fim de tarde ou de vela. Nada de luz branca de estúdio.

## Edição padrão

| Ajuste      | Valor       |
|-------------|-------------|
| Temperatura | +10 a +20   |
| Tint        | +5          |
| Saturação   | −10 a −20   |
| Contraste   | −5 a −10    |
| Realces     | −10         |
| Sombras     | +10         |

## Formato

- **Hero:** vertical, na proporção de cerca de 4:5. Deixe o assunto no centro, porque o topo é recortado em arco.
- **Sobre:** vertical, 4:5, também com recorte em arco.
- **Cartões das terapias:** horizontal, 16:9, com cantos arredondados.

## Técnico

- Use WebP. As fotos que vêm do Unsplash usam `auto=format`, e o próprio Unsplash entrega AVIF, WebP ou JPG conforme o navegador.
- Peso máximo: cerca de 200 KB na hero e cerca de 120 KB nas demais fotos.
- Sempre com versões responsivas (`srcset` + `sizes`).
- A hero carrega com prioridade (`fetchpriority="high"`, sem `loading="lazy"`). Todas as outras imagens usam `loading="lazy"`.
- Toda imagem precisa de `width` e `height` (ou de um `aspect-ratio` no CSS) para a página não "pular" enquanto carrega.

## Texto alternativo

- Sempre em português e descritivo: diga o que aparece na foto, sem prometer efeito nenhum.
- Imagem só decorativa usa `alt=""`.

## Harmonização no site

A classe `.img-kairavana` aplica um filtro leve (token `--foto-filtro`: menos saturação, contraste suave e um pouco de sépia) para aproximar a foto da paleta do site.

- **Usar em:** hero, Sobre, cartões das terapias e banner da loja.
- **Nunca usar em fotos de produto da loja:** ali a cor real do produto precisa aparecer.

## Como trocar a foto da hero

Coloque na pasta `imagens/`, já editados conforme este guia:

| Arquivo                | Tamanho (px) | Obrigatório |
|------------------------|--------------|-------------|
| `hero-reiki.webp`      | 1200 × 1500  | sim         |
| `hero-reiki-800.webp`  | 800 × 1000   | recomendado |
| `hero-reiki-480.webp`  | 480 × 600    | recomendado |

- Se faltar alguma das versões menores, o site usa o `hero-reiki.webp`.
- Enquanto nenhum arquivo existir, o site continua mostrando a foto atual.
- Para ajustar o enquadramento, mude `--hero-foco` em `.foto-hero` no `index.html`. O valor é "horizontal vertical": por exemplo, `50% 30%` sobe o foco e `40% 50%` puxa para a esquerda.
- Nas outras fotos, o enquadramento se ajusta com `style="--foco:center 80%"` na própria imagem.

## Fotos em uso

| Onde | Foto | Observação |
|---|---|---|
| Hero | `imagens/hero-reiki*.webp` (Unsplash 1757066033647) | provisória, até chegar a foto real da sessão |
| Sobre | trilha ao entardecer (Unsplash 1759357557586) | pesada em telas de alta resolução (~220 KB); trocar quando possível |
| Reiki | mãos sobre a cabeça, à luz de vela (Unsplash 1598901986949) | |
| Reiki infantil | criança descansando em casa (Unsplash 1672928499632) | |
| Florais | frasco âmbar (Unsplash 1608571424237) | |
| Numerologia | caderno sobre madeira (Unsplash 1637689113621) | |
