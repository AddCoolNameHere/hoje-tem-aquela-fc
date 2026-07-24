# HOJE TEM AQUELA F.C. — Montador de Formações

**No ar em:** https://addcoolnamehere.github.io/hoje-tem-aquela-fc/

Site do time para montar as escalações do Pro Clubs. Todas as **29 formações do EA FC 26**
estão disponíveis e qualquer carta pode ir em **qualquer posição**.

## Como usar

- **Arrastar** uma carta do elenco (esquerda) para o campo.
- **Clicar** no jogador e depois no slot — funciona melhor no celular.
- **Arrastar entre slots** para trocar dois jogadores de lugar.
- Arrastar de volta para a lista do elenco tira o jogador do time.
- **Salvar** guarda a escalação no navegador; **Copiar link** gera uma URL com a
  escalação embutida para mandar no grupo.

A cor da etiqueta embaixo da carta mostra o encaixe na posição:
verde = posição natural, amarelo = fora de posição mas jogável, vermelho = totalmente fora.

## Estrutura

```
index.html            página principal (montador)
admin.html            painel de admin (divisão atual)
assets/css/styles.css tema verde e preto
assets/js/formations.js  as 29 formações com coordenadas
assets/js/app.js      lógica do montador
cards/                PNGs das cartas dos jogadores
data/club.json        nome do clube + divisão atual
data/players.json     elenco
```

## Cadastrando um jogador

As cartas em `cards/` são recortes dos prints do menu **Club Squad** do jogo. Num print
4K (3840x2160) a moldura da carta fica exatamente em `x=249, y=290, 720x995` — é só
recortar essa região e salvar como `cards/<gamertag>.jpg`.

Depois adicione a entrada em `data/players.json`:

```json
{ "id": "boliclifer", "name": "boliclifer", "gamertag": "boliclifer",
  "archetype": "JOKER", "position": "CAM", "rating": 86, "card": "cards/boliclifer.jpg" }
```

`position` aceita mais de uma separada por `/` (ex.: `"LB/LWB"`).
Se `card` for `null`, o site desenha sozinho uma carta verde e preta com as iniciais.

> As posições atuais foram **deduzidas** do arquétipo e dos atributos de cada carta —
> o print do Club Squad não mostra a posição. Confira em `admin.html`.

## Admin

`admin.html` tem duas coisas:

- **Divisão atual** — escolha o número e clique em **Aplicar**; vale na hora naquele navegador.
- **Elenco** — troque nome, posição e overall de cada jogador.

Para valer para o time todo, copie o JSON gerado e salve em `data/club.json` /
`data/players.json` no repositório.

## Rodando local

```bash
python -m http.server 8000
# abre http://localhost:8000
```

Precisa de um servidor (os arquivos JSON são lidos via `fetch`, que não funciona em `file://`).
