# HOJE TEM AQUELA F.C. — Montador de Formações

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

1. Coloque o PNG recortado (fundo transparente) em `cards/`.
2. Adicione a entrada em `data/players.json`:

```json
{ "id": "p01", "name": "LUCAS", "position": "CAM", "rating": 87, "card": "cards/lucas.png" }
```

`position` aceita mais de uma separada por `/` (ex.: `"LB/LWB"`).
Se `card` for `null`, o site desenha sozinho uma carta verde e preta com as iniciais.

## Mudando a divisão

Abra `admin.html`, escolha a divisão e clique em **Aplicar** — vale na hora para aquele
navegador. Para valer para o time todo, copie o JSON gerado e salve em `data/club.json`.

## Rodando local

```bash
python -m http.server 8000
# abre http://localhost:8000
```

Precisa de um servidor (os arquivos JSON são lidos via `fetch`, que não funciona em `file://`).
