/* ==========================================================================
   Exporta a escalação como imagem PNG em alta resolução.

   Desenha tudo num canvas em vez de fotografar a tela: assim a saída não
   depende do tamanho do navegador e sai grande de verdade (ESCALA = 3, ou
   seja, 2700px de largura), boa para mandar no grupo como foto.
   ========================================================================== */

const ESCALA = 3;
const L = 900;                       // largura de referência; o resto deriva daqui
const CABECALHO = 150;
const PITCH_W = L - 60;
const PITCH_H = Math.round(PITCH_W * 830 / 900);
const RODAPE = 74;

/* mesma geometria do campo na tela: gramado com inset 11% 3% 9% */
const TURF_EXP = { left: 3, top: 11, w: 94, h: 80 };

const cores = {
  fundo:   '#050a07',
  painel:  '#0b1510',
  linha:   '#1e3527',
  verde:   '#00e676',
  texto:   '#e9f7ef',
  fraco:   '#8fae9c',
  fraquin: '#5c7466',
  gold:    '#f5c542',
  vermelho:'#ff7b6b',
};

/** Carrega uma imagem pronta pro canvas (crossOrigin pra não sujar o canvas). */
function carregarImagem(src) {
  return new Promise(resolve => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);      // cai no desenho da carta genérica
    img.src = src;
  });
}

function retanguloArredondado(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y,     x + w, y + h, r);
  g.arcTo(x + w, y + h, x,     y + h, r);
  g.arcTo(x,     y + h, x,     y,     r);
  g.arcTo(x,     y,     x + w, y,     r);
  g.closePath();
}

/** Pílula com texto centralizado, usada na posição e no nome. */
function pilula(g, texto, cx, cy, opc = {}) {
  const { fonte = '600 13px Inter, sans-serif', cor = cores.fraco,
          borda = cores.linha, fundo = 'rgba(4,12,8,.88)', padX = 9 } = opc;
  g.font = fonte;
  const larg = g.measureText(texto).width + padX * 2;
  const alt = 21;
  retanguloArredondado(g, cx - larg / 2, cy - alt / 2, larg, alt, 6);
  g.fillStyle = fundo; g.fill();
  g.strokeStyle = borda; g.lineWidth = 1; g.stroke();
  g.fillStyle = cor;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(texto, cx, cy + 1);
}

/** Carta genérica, para quem ainda não tem imagem recortada. */
function cartaGenerica(g, x, y, w, h, v) {
  const grad = g.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, '#123a24'); grad.addColorStop(1, '#05100a');
  retanguloArredondado(g, x, y, w, h, w * 0.07);
  g.fillStyle = grad; g.fill();
  g.strokeStyle = 'rgba(0,230,118,.4)'; g.lineWidth = 1.5; g.stroke();

  g.textAlign = 'left'; g.textBaseline = 'top';
  g.fillStyle = cores.verde;
  g.font = `700 ${Math.round(h * 0.16)}px 'Barlow Condensed', sans-serif`;
  g.fillText(v.rating ?? '—', x + w * 0.1, y + h * 0.07);

  g.textAlign = 'center';
  g.fillStyle = 'rgba(0,230,118,.25)';
  g.font = `700 ${Math.round(h * 0.24)}px 'Barlow Condensed', sans-serif`;
  g.fillText(iniciaisDe(v.name), x + w / 2, y + h * 0.34);

  g.fillStyle = cores.texto;
  g.font = `600 ${Math.round(h * 0.085)}px 'Barlow Condensed', sans-serif`;
  g.textBaseline = 'middle';
  g.fillText(String(v.name).toUpperCase().slice(0, 12), x + w / 2, y + h * 0.9);
}

const iniciaisDe = nome => {
  const p = String(nome || '?').trim().split(/\s+/);
  return (p.length === 1 ? p[0].slice(0, 2) : p[0][0] + p[p.length - 1][0]).toUpperCase();
};

/** Desenha o gramado em trapézio com as marcações, igual à tela. */
function desenharGramado(g, x, y, w, h) {
  const tx = x + w * TURF_EXP.left / 100;
  const ty = y + h * TURF_EXP.top / 100;
  const tw = w * TURF_EXP.w / 100;
  const th = h * TURF_EXP.h / 100;

  // o trapézio: 14%..86% em cima, 0..100% embaixo
  const X = (u, t) => tx + tw * (0.14 * (1 - t) + u * (0.72 + 0.28 * t));
  const Y = t => ty + th * t;

  g.save();
  g.beginPath();
  g.moveTo(X(0, 0), Y(0)); g.lineTo(X(1, 0), Y(0));
  g.lineTo(X(1, 1), Y(1)); g.lineTo(X(0, 1), Y(1));
  g.closePath();
  g.clip();

  const grad = g.createLinearGradient(0, ty, 0, ty + th);
  grad.addColorStop(0, '#1f7a45'); grad.addColorStop(.45, '#17663a'); grad.addColorStop(1, '#0f4d2b');
  g.fillStyle = grad;
  g.fillRect(tx - tw, ty, tw * 3, th);

  for (let i = 0; i < 12; i++) {                       // listras do corte da grama
    g.fillStyle = i % 2 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.045)';
    g.fillRect(tx - tw, ty + th * i / 12, tw * 3, th / 12);
  }

  g.strokeStyle = 'rgba(255,255,255,.55)';
  g.lineWidth = Math.max(1.5, tw * 0.0035);
  const linha = pts => {
    g.beginPath();
    pts.forEach(([u, t], i) => i ? g.lineTo(X(u, t), Y(t)) : g.moveTo(X(u, t), Y(t)));
    g.stroke();
  };

  linha([[0,0],[1,0],[1,1],[0,1],[0,0]]);              // perímetro
  linha([[0,.46],[1,.46]]);                            // meio de campo

  g.beginPath();                                        // círculo central
  g.ellipse(X(.5,.46), Y(.46), tw * .115, th * .075, 0, 0, Math.PI * 2);
  g.stroke();

  linha([[.21,.80],[.79,.80],[.79,1],[.21,1]]);        // nossa grande área
  linha([[.37,.92],[.63,.92],[.63,1],[.37,1]]);        // pequena área
  linha([[.21,0],[.21,.155],[.79,.155],[.79,0]]);      // área adversária
  g.restore();
}

/** Gera o PNG da escalação e devolve o blob. */
async function gerarImagemEscalacao() {
  const layout = FORMATIONS[state.formation];
  const reservas = state.bench.filter(Boolean);
  const alturaBanco = reservas.length ? 152 : 0;

  const A = CABECALHO + PITCH_H + alturaBanco + RODAPE;

  const cv = document.createElement('canvas');
  cv.width = L * ESCALA;
  cv.height = A * ESCALA;
  const g = cv.getContext('2d');
  g.scale(ESCALA, ESCALA);

  // fundo
  g.fillStyle = cores.fundo;
  g.fillRect(0, 0, L, A);
  const brilho = g.createRadialGradient(L / 2, -60, 0, L / 2, -60, L * .9);
  brilho.addColorStop(0, 'rgba(0,230,118,.13)'); brilho.addColorStop(1, 'rgba(0,230,118,0)');
  g.fillStyle = brilho;
  g.fillRect(0, 0, L, CABECALHO + 120);

  // ---- cabeçalho
  g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillStyle = cores.texto;
  g.font = "700 40px 'Barlow Condensed', sans-serif";
  const nome = (club.name || 'HOJE TEM AQUELA F.C.').toUpperCase();
  g.fillText(nome, 34, 62);

  g.fillStyle = cores.fraquin;
  g.font = '600 12px Inter, sans-serif';
  g.fillText('PRO CLUBS · ESCALAÇÃO', 36, 84);

  const titulo = (state.squadName || '').trim();
  if (titulo) {
    g.fillStyle = cores.texto;
    g.font = "600 22px 'Barlow Condensed', sans-serif";
    g.fillText(titulo.toUpperCase(), 36, 118);
  }

  // formação e divisão à direita
  g.textAlign = 'right';
  g.fillStyle = cores.verde;
  g.font = "700 40px 'Barlow Condensed', sans-serif";
  g.fillText(state.formation, L - 34, 62);

  if (club.divisionLabel) {
    g.fillStyle = cores.fraco;
    g.font = '600 13px Inter, sans-serif';
    g.fillText(club.divisionLabel, L - 36, 86);
  }

  // ---- campo
  const px = 30, py = CABECALHO;
  retanguloArredondado(g, px, py, PITCH_W, PITCH_H, 16);
  g.fillStyle = '#08120c'; g.fill();
  g.strokeStyle = cores.linha; g.lineWidth = 1; g.stroke();
  desenharGramado(g, px, py, PITCH_W, PITCH_H);

  // ---- cartas em campo
  const cartaW = PITCH_W * 0.122;
  const cartaH = cartaW / 0.7236;

  const desenhaSlot = async (v, cx, cy, pos) => {
    const x = cx - cartaW / 2, y = cy - cartaH / 2;
    const img = await carregarImagem(v.card);

    g.save();
    g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 10; g.shadowOffsetY = 4;
    if (img) {
      retanguloArredondado(g, x, y, cartaW, cartaH, cartaW * 0.07);
      g.save(); g.clip();
      g.drawImage(img, x, y, cartaW, cartaH);
      g.restore();
    } else {
      cartaGenerica(g, x, y, cartaW, cartaH, v);
    }
    g.restore();

    const encaixe = fitClass(v, pos);
    const cor = encaixe === 'fit-natural' ? cores.verde
              : encaixe === 'fit-related' ? cores.gold
              : encaixe === 'fit-out'     ? cores.vermelho : cores.fraco;

    pilula(g, pos, cx, y + cartaH + 2, {
      fonte: "600 13px 'Barlow Condensed', sans-serif", cor, borda: cor + '66',
    });
    pilula(g, v.name, cx, y + cartaH + 26, { fonte: '600 12px Inter, sans-serif' });
  };

  for (let i = 0; i < layout.length; i++) {
    const vid = state.slots[i];
    if (!vid) continue;
    const v = getVariant(vid);
    if (!v) continue;
    const [pos, ux, uy] = layout[i];
    const cx = px + PITCH_W * (TURF_EXP.left + ux / 100 * TURF_EXP.w) / 100;
    const cy = py + PITCH_H * (TURF_EXP.top  + uy / 100 * TURF_EXP.h) / 100;
    await desenhaSlot(v, cx, cy, pos);
  }

  // ---- reservas
  if (reservas.length) {
    const by = CABECALHO + PITCH_H + 16;
    g.textAlign = 'left'; g.fillStyle = cores.fraquin;
    g.font = '600 11px Inter, sans-serif';
    g.fillText('RESERVAS', 36, by + 10);

    const bw = 58, bh = bw / 0.7236;
    for (let i = 0; i < reservas.length; i++) {
      const v = getVariant(reservas[i]);
      if (!v) continue;
      const x = 34 + i * (bw + 12), y = by + 26;
      const img = await carregarImagem(v.card);
      if (img) {
        retanguloArredondado(g, x, y, bw, bh, bw * 0.07);
        g.save(); g.clip(); g.drawImage(img, x, y, bw, bh); g.restore();
      } else {
        cartaGenerica(g, x, y, bw, bh, v);
      }
      pilula(g, v.name, x + bw / 2, y + bh + 12, { fonte: '600 10px Inter, sans-serif', padX: 6 });
    }
  }

  // ---- rodapé
  const ry = A - RODAPE;
  g.strokeStyle = cores.linha; g.lineWidth = 1;
  g.beginPath(); g.moveTo(30, ry); g.lineTo(L - 30, ry); g.stroke();

  g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillStyle = cores.fraquin;
  g.font = '500 12px Inter, sans-serif';
  g.fillText('fusslabs.com/realtismo', 36, ry + 34);

  g.textAlign = 'right';
  const escalados = state.slots.filter(Boolean).length;
  g.fillText(`${escalados} de 11 escalados · ${new Date().toLocaleDateString('pt-BR')}`, L - 36, ry + 34);

  return new Promise(resolve => cv.toBlob(resolve, 'image/png'));
}

/** Botão: gera e baixa o PNG. */
async function baixarImagemEscalacao(botao) {
  const rotulo = botao.textContent;
  botao.disabled = true;
  botao.textContent = 'Gerando…';

  try {
    const blob = await gerarImagemEscalacao();
    if (!blob) throw new Error('não consegui gerar');

    const nome = (state.squadName || state.formation || 'escalacao')
      .trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `hoje-tem-aquela-${nome || 'escalacao'}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);

    toast('Imagem baixada');
  } catch (e) {
    console.error(e);
    toast('Não consegui gerar a imagem');
  } finally {
    botao.disabled = false;
    botao.textContent = rotulo;
  }
}
