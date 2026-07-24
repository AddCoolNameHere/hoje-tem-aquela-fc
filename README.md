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

## Cartas e variantes

Cada jogador tem uma **lista de cartas**. Como o mesmo cara pode ter um FINISHER e um
THIEF, cada carta guarda a própria posição e o próprio overall. No elenco aparecem
botõezinhos com o arquétipo (`FIN+`, `THI`…) para escolher qual usar — e a carta
escolhida pode ir em qualquer posição do campo.

Um jogador ocupa **um lugar só**: escolher outra carta dele troca a que já está em campo.

```json
{
  "id": "boliclifer", "name": "boliclifer", "gamertag": "boliclifer",
  "cards": [
    { "id": "boliclifer-joker", "archetype": "JOKER",  "position": "CAM",   "rating": 86, "card": "cards/boliclifer.jpg" },
    { "id": "boliclifer-spark", "archetype": "SPARK+", "position": "RW/RM", "rating": 81, "card": "cards/boliclifer-spark.jpg" }
  ]
}
```

`position` aceita mais de uma separada por `/` (ex.: `"LB/LWB"`).
Se `card` for `null`, o site desenha sozinho uma carta verde e preta com as iniciais.

> As posições atuais foram **deduzidas** do arquétipo e dos atributos de cada carta —
> o print do Club Squad não mostra a posição. Confira em `admin.html`.

### Recorte automático

As imagens em `cards/` são recortes dos prints do menu **Club Squad**. Num print 4K
(3840x2160) a moldura da carta fica em `x=249, y=290, 720x995` — o que dá
`6.48% / 13.43% / 18.75% / 46.06%` da imagem, e é isso que o admin usa por padrão para
qualquer resolução 16:9.

## Admin

`admin.html` tem três coisas:

- **Divisão atual** — escolha o número e clique em **Aplicar**.
- **Elenco** — troque nome, arquétipo, posição e overall de cada carta; remova cartas ou jogadores.
- **Adicionar carta** — escolha o print do Club Squad, o recorte da moldura sai sozinho.
  Confira a prévia, preencha arquétipo/posição/overall e clique em **Adicionar ao elenco**.

Tudo isso vale **só no navegador de quem mexeu**. Para valer para o time todo:

1. **Baixar recorte** e colocar o `.jpg` em `cards/`.
2. Copiar o JSON gerado para `data/players.json` (e `data/club.json` para a divisão).
3. Commitar os dois.

Enquanto o arquivo não é commitado, a carta nova aparece só para quem a adicionou —
para os outros, o site desenha a carta verde e preta com as iniciais.

## Rodando local

```bash
python -m http.server 8000
# abre http://localhost:8000
```

Precisa de um servidor (os arquivos JSON são lidos via `fetch`, que não funciona em `file://`).
