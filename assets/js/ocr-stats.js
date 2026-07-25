/* ==========================================================================
   Leitura dos números do print da tela Club Squad.

   Não é OCR genérico: a tela do jogo sempre desenha os oito valores na mesma
   fonte, no mesmo tamanho e alinhados à direita. Então basta recortar cada
   número, cortar em glifos e comparar cada glifo com um molde.

   Os moldes são a média dos dígitos tirados dos 13 prints do elenco, cujos
   valores eu já conhecia. Validação deixando-um-de-fora (moldes de 12 prints
   lendo o 13º, para cada um): 192 de 192 caracteres corretos.

   A geometria abaixo é do print 4K (3840x2160) e é reescalada para qualquer
   resolução 16:9.
   ========================================================================== */

const OCR = {"w":16,"h":24,"m":{"9":"AAAAM4j//////8NECAAAAAAOctX/////////8WgFAAAAg/f/99ZXRkay8P/rTgMAGsH/94sVAwAAD03o/95AAGD//5wOAAAAAAAAY/H/qgDH//9VAAAAAAAAABnW/+hG/f/oPgAAAAAAAAADYv//YP//qgAAAAAAAAAAAFX//2r//9swAAAAAAAAAAFa///Z1P/9UwAAAAAAAAAOnv///2D//5wOAAAAAAAAY/H///8awf/3ixUDAAADS+Xq9///AIP3//fWV0ZGV96/KbL//wAOnP/////////VKwCq//8AABdX1ujr9OrWQAA+6P/zAAAAAxUXK28kFQMAVf//ewAAAAAAAAAAAAAAAFX//2AAAxUIAAAAAAAAAAVt//dXGlfWTQAAAAAAAAAe2f+yCWD//5wOAAAAAAAAbPP6jwA53P/3iwgAAAAPTej/2zEABYf3//d8RkZGsvD/6EsDAAAOnP//////////8WMAAAAAABlg6///////w0QIAAAA","2":"AAAMSrv//////+VYHQAAAAAAePv//////////6wbAAAHbvD//tJeRkad6/79pgwAS/T//84sAwAADDDO//qNC6n//88xAAAAAAAASef/4T3///uQAAAAAAAAAA2r//9SubmhFAAAAAAAAAAAnv//UgAAAAAAAAAAAAAAAJ7//1IAAAAAAAAAAAAAAA+t//9SAAAAAAAAAAAAAABZ9///UgAAAAAAAAAAAAAUrP//xCkAAAAAAAAAAAAMov3/+HkAAAAAAAAAAAAUnfr//aILAAAAAAAAAAANmP///6wUAAAAAAAAAAALkfj/+6saAAAAAAAAAAAPkfj//68UAAAAAAAAAAAIiP///7sbAAAAAAAAAAQ7pPX//LsgAAAAAAAAAABQ5/v/5aQfAAAAAAAAAABF5P//5FAHAAAAAAAAAABL3///+V8AAgICAwMDAgMC7/////2xRlBTVVtYV1VYV///////////////////////////////////////////","1":"AAAAAAAAAAAAAGj3/////wAAAAAAAAAAJGy0+/////8XFxcXFxcxjM30////////6Ojo6Ojo6/j///////////////////////////////96ms7Mvq6fkqzt////////BwwTExEPDQtP2f///////wAAAAAAAAAASNf///////8AAAAAAAAAAEjX////////AAAAAAAAAABI1////////wAAAAAAAAAASNf///////8AAAAAAAAAAEjX////////AAAAAAAAAABI1////////wAAAAAAAAAASNf///////8AAAAAAAAAAEjX////////AAAAAAAAAABI1////////wAAAAAAAAAASNf///////8AAAAAAAAAAEjX////////AAAAAAAAAABI1////////wAAAAAAAAAASNf///////8AAAAAAAAAAEjX////////AAAAAAAAAABI1////////wAAAAAAAAAASNf///////8AAAAAAAAAAEjX////////","6":"AAAAB0G8/f/////rYBkAAAAAAGLs//////////+cDgAAA0vo//TCVUZGfOr894sJABnW/+hnFgIAAAgpv//3VwBj8f6lAAAAAAAAAFX//4IJsv/pQAAAAAAAAAAXYEstV/f/rxIAAAAAAAAAAAQBAGD//1UAAAAAAAAAAAAAAABt//9VAAMUFxcXFxUDAAAA6v/qQAA/0Ojo6OjWVxcAAP//rQMr1f////////+cDgD//7Anv/CyRkZQr/f/94sJ///o2+VNDwAAAhCL9//3V/////FjAAAAAAAADpz//7D///+WDQAAAAAAAAAXwf//1P//WQEAAAAAAAAAAKr//2D//1UAAAAAAAAAAACq//9g//9dAgAAAAAAAAAAqv//Ruj/thMAAAAAAAAAF8H//wCq//FjAAAAAAAABnT//7AAQN7/6E0PAAABCobh//dXAANL6P/wskZGSIn3//eLCQAAAGPx//////////+cDgAAAAAIRMP//////+tgGQAA","5":"AETn//////////////+QAABX7///////////////kAAAV+//8qq3t7e3t6uzkzMAAFfv/5gQEBAQEBAOEAsCAABX7/+OAgAAAAAAAAAAAAAAV+//jgIAAAAAAAAAAAAAAFfv/44CAAAAAAAAAAAAAABX7/+OAgAAAAAAAAAAAAACevj6hwYtobm5iyQKAAAAHbj+zW9e3vv///jqjDkBADHX/+fl+P/////////nSwAtyv3/8XhGRkZGVeD//7YdBEKsuXEIAAAAAAJH4f/5fgAAAAAAAAAAAAAAAJD///8AAAAAAAAAAAAAAAAs3f//AAAAAAAAAAAAAAAABc///wAAAAAAAAAAAAAAAAXP//8XTnUlAAAAAAAAAAAFz///1vDgNgAAAAAAAAAALN3//73/9H4KAAAAAAAAD6///6pV3f7vdxUCAAAAEFzy//VOFH3v//XTWEZGRrbx//F0BwACc+T///////////1/AgAAAAc8m/7//////8hLDgAA","0":"AAAAD1Pf/////+x4DwAAAAAAAH39/////////YoYAAAABFrv//rpvHLb7P72khEAACvj//yhHREGFTTT/+1OAAB7+P+2FwAAAAAAPub/twATxf/6bQAAAAAAAAS//+tJXfn/0Q8AAAAAAAAARv//jmX//8UEAAAAAAAAADn///yv//9dAQAAAAAAAAAQsP//+v//OQAAAAAAAAAAAJP//////zkAAAAAAAAAAACT//////85AAAAAAAAAAAAk///////OQAAAAAAAAAAAJP//////zkAAAAAAAAAAACT///6//85AAAAAAAAAAAAk///sv//XQEAAAAAAAAAD67//2X//8UEAAAAAAAAADf7//9d+f/RDwAAAAAAAABG//+PD8L/+m0AAAAAAAAEv//rSQCO+v+2FwAAAAAAPub/twAANeT//J0XDwMVNNP/7E4AAARa7//5565b1uz+/JgQAAAAAH39/////////ZQsAAAAAAAPU9//////9Y4PAAAA","8":"AAAAKGz8///////bTBIAAAAAH8L///////////+KBgAAC67///VyRkZGoPv/9HMAAEDm//NzBgAAAA+r//+2GACa//+DAgAAAAAAGr3//1kAmv//NAAAAAAAAAB7//9ZAJr//zQAAAAAAAAAe///WQCa//80AAAAAAAAAHv//1kAjfv/qw8AAAAAADTb/8goABax//ugRkZGRkjQ//R2AgAAH8L///////////+KBgAAARSP////////////TAUAADLO9P/gubm5ueD//9tMAC3N//+aRwAAAABHmv//zS1b//+fDgAAAAAAAA6U+f/Slf//ewAAAAAAAAAAC8j/////4T4AAAAAAAAAAADC/////8gLAAAAAAAAAAAAwv//5f/5cAAAAAAAAAAAE8z//33//70aAAAAAAAAAGHy//9R9v//qxcEAAAADTjb//Z+CHz0//vTZUZGRqDt//R8CAAGiv////////////+KBgAAABJM2////////9tMEgAA","%":"ADfU/50aAAAAAAaP0hMAABrK////jAMAAAAT0qMKAACC8G5Go+gvAAABTPBrAAAArKkJACnXWAAABKrLHwAAAOZXAAAAqKIAACLdjAAAAAD/VwAAAKioAABI6EQAAAAA/1cAAACoqAAMsbsNAAAAAP9XAAAAqKgALelzAAAAAADfYQEABK6eAnjvOQAAAAAApccVAEPmSBfHqQkAAAAAAGrzn4DG3SJK71cAAAAAAAAOrPn/8mwDfNwlCGC5khMAABOSuWAIJNaqDGzy//msDgAAAAAAAFfvSiLdxoCf82oAAAAAAAmp1x0+5UMAFcegAAAAAAA573oDW6oEAAFhugAAAAAAc+ktAKioAAAAV/8AAAAABK62DACoqAAAAFf/AAAAAEPnZwAAqKgAAABX/wAAAACM3SIAAKioAAAAV/8AAAAfy7cFAABb1SEABKS6AAAAa/BOAQAAL9xeCTLNggAACqPSEwAAAAa775DU7DMAABPSjwYAAAACQ9//+3IP","4":"AAAAAAAAAAAKm///bgAAAAAAAAAAAAAAKOD//24AAAAAAAAAAAAAB5f7//9uAAAAAAAAAAAABGj4////bgAAAAAAAAAAAETo/////24AAAAAAAAAAAaJ/9xf4P9uAAAAAAAAAABK5/+kHtX/bgAAAAAAAAAi1//aJRTV/24AAAAAAAAPq//rTwAU1f9uAAAAAAAAYPj0cAQAFNX/bgAAAAAAE6r/wREAABTV/24AAAAABYv4+WMEAAAU1f9uAAAAAV33/Z0HAAAAFNX/bgAAADHg/8QaAAAAABTV/24AAACH/edPFxcXFxcp2f97FxcX9P/86ujo6Ojo6vv/8ujo6P////////////////////9zrrKwo7mnrKrM+//Fsp+hBg8PDw0QDg8OJdn/dRANDQAAAAAAAAAAABTV/24AAAAAAAAAAAAAAAAU1f9uAAAAAAAAAAAAAAAAFNX/bgAAAAAAAAAAAAAAABTV/24AAAAAAAAAAAAAAAAU1f9uAAAA","7":"//////////////////////////////////////////941tLS2NbW1tbWspD+///wBxQUFBUUFBQUFBA3+v/oVAAAAAAAAAAAAAACg///ogcAAAAAAAAAAAAAaPP/2jIAAAAAAAAAAAAAE63//3cFAAAAAAAAAAAAAEb//8IfAAAAAAAAAAAAABy4//p4AAAAAAAAAAAAAACY/P/ODAAAAAAAAAAAAAAt0v/9eAAAAAAAAAAAAAADZ///6ScAAAAAAAAAAAAAHt7//30EAAAAAAAAAAAAAG31/9w5AAAAAAAAAAAAAAq///2rAAAAAAAAAAAAAABn+f/tLwAAAAAAAAAAAAAAcf//oxEAAAAAAAAAAAAAIdX//1oAAAAAAAAAAAAAAFb8/+ZBAAAAAAAAAAAAAADH//+lAAAAAAAAAAAAAAACzP/8mAAAAAAAAAAAAAAAMt//4SEAAAAAAAAAAAAAAIT//94UAAAAAAAAAAAAAACE///MEgAAAAAAAAAA","3":"AAAJQab+//////2nNggAAAAAYOz//////////9pzAgAFVt///tlxSEZMyP3/72IAN9j+/9g/BgEAASXF//+sFojy/9xHAQAAAAAAK8r//1TA6PSqDAAAAAAAAACV//9UExdtKgEAAAAAAAAAlf//VAAAAAAAAAAAAAAAAJX//1QAAAAAAAAAAAAAAD7i//VMAAAAAAAAAAAAADOD//N6BwAAAAAAFHeAgIDc//yBEAAAAAAAACjs///////5PAAAAAAAAAAexPL7/////swpAAAAAAAAAi1oeICAqv//xioAAAAAAAAAAAAAABeu/v+BAAAAAAAAAAAAAAAAVOz/9AAAAAAAAAAAAAAAAAfS//8XFxUEAAAAAAAAAAAH0v//3OjOJAAAAAAAAAAAB9L//9P/8XAHAAAAAAAAAE7p//9k6//sbBQCAAAAD03i//uAKa7z//TOUkZGRq3v//u5KAAYeez///////////yPNQAAAAlBpv7//////8RKDgAA"}};

/* medidas no print 4K */
const OCR_GEO = {
  larguraRef: 3840,
  y0: 1223,        // topo da primeira linha de valor
  passo: 70,       // distância entre linhas
  alt: 32,         // altura da linha
  x0: 1140, x1: 1330,
  limiar: 170,     // acima disso é texto branco
};

const OCR_CHAVES = ['appearances','goals','assists','cleanSheets',
                    'motm','redCards','passCompletion','shotsOnTarget'];

/* base64 -> matriz de 0..1 */
function ocrMolde(b64) {
  const bin = atob(b64);
  const v = new Float32Array(bin.length);
  for (let i = 0; i < bin.length; i++) v[i] = bin.charCodeAt(i) / 255;
  return v;
}
const OCR_MOLDES = Object.fromEntries(
  Object.entries(OCR.m).map(([ch, b64]) => [ch, ocrMolde(b64)]));

/** Normaliza um recorte de glifo para a célula do molde.
    Faz média da área de origem, não vizinho-mais-próximo: os moldes foram
    gerados com reamostragem filtrada, e pegar só um pixel deixava o glifo
    "duro" e derrubava a semelhança sem necessidade. */
function ocrNormalizar(bin, larg, alt) {
  const { w: W, h: H } = OCR;
  const out = new Float32Array(W * H);

  for (let y = 0; y < H; y++) {
    const ya = y * alt / H, yb = (y + 1) * alt / H;
    const y0 = Math.floor(ya), y1 = Math.max(y0 + 1, Math.ceil(yb));

    for (let x = 0; x < W; x++) {
      const xa = x * larg / W, xb = (x + 1) * larg / W;
      const x0 = Math.floor(xa), x1 = Math.max(x0 + 1, Math.ceil(xb));

      let soma = 0, n = 0;
      for (let sy = y0; sy < Math.min(y1, alt); sy++)
        for (let sx = x0; sx < Math.min(x1, larg); sx++) { soma += bin[sy * larg + sx]; n++; }

      out[y * W + x] = n ? soma / n : 0;
    }
  }
  return out;
}

/** Compara com cada molde e devolve o caractere mais parecido. */
function ocrCaractere(g) {
  let melhor = '?', score = -1;
  let ng = 0;
  for (let i = 0; i < g.length; i++) ng += g[i] * g[i];
  ng = Math.sqrt(ng) || 1e-9;

  for (const [ch, m] of Object.entries(OCR_MOLDES)) {
    let dot = 0, nm = 0;
    for (let i = 0; i < g.length; i++) { dot += g[i] * m[i]; nm += m[i] * m[i]; }
    const s = dot / (ng * Math.sqrt(nm) + 1e-9);
    if (s > score) { melhor = ch; score = s; }
  }
  return { ch: melhor, score };
}

/**
 * Lê os oito números de um print já desenhado num canvas.
 * Devolve { valores, confianca, linhasVazias }.
 */
function ocrLerEstatisticas(canvas) {
  const g = canvas.getContext('2d', { willReadFrequently: true });
  const k = canvas.width / OCR_GEO.larguraRef;        // escala do print
  const px = (v) => Math.round(v * k);

  const valores = {};
  let confianca = 1;
  const vazias = [];

  for (let i = 0; i < OCR_CHAVES.length; i++) {
    const y = px(OCR_GEO.y0 + OCR_GEO.passo * i);
    const h = Math.max(8, px(OCR_GEO.alt));
    const x = px(OCR_GEO.x0);
    const w = Math.max(8, px(OCR_GEO.x1 - OCR_GEO.x0));

    const dados = g.getImageData(x, y, w, h).data;
    const bin = new Float32Array(w * h);
    for (let j = 0, p = 0; j < dados.length; j += 4, p++) {
      const lum = 0.299 * dados[j] + 0.587 * dados[j + 1] + 0.114 * dados[j + 2];
      bin[p] = lum > OCR_GEO.limiar ? 1 : 0;
    }

    // corta em glifos pelas colunas vazias
    const colunas = new Array(w).fill(0);
    for (let yy = 0; yy < h; yy++)
      for (let xx = 0; xx < w; xx++) colunas[xx] += bin[yy * w + xx];

    const caixas = [];
    let ini = null;
    const minLarg = Math.max(2, px(3));
    for (let xx = 0; xx < w; xx++) {
      if (colunas[xx] > 0 && ini === null) ini = xx;
      else if (colunas[xx] === 0 && ini !== null) {
        if (xx - ini >= minLarg) caixas.push([ini, xx]);
        ini = null;
      }
    }
    if (ini !== null && w - ini >= minLarg) caixas.push([ini, w]);

    if (!caixas.length) { vazias.push(OCR_CHAVES[i]); continue; }

    let texto = '';
    for (const [xa, xb] of caixas) {
      // apara as sobras em cima e embaixo
      let ya = h, yb = -1;
      for (let yy = 0; yy < h; yy++)
        for (let xx = xa; xx < xb; xx++)
          if (bin[yy * w + xx]) { if (yy < ya) ya = yy; if (yy > yb) yb = yy; }
      if (yb < ya) continue;

      const lg = xb - xa, la = yb - ya + 1;
      const recorte = new Float32Array(lg * la);
      for (let yy = 0; yy < la; yy++)
        for (let xx = 0; xx < lg; xx++)
          recorte[yy * lg + xx] = bin[(ya + yy) * w + (xa + xx)];

      const { ch, score } = ocrCaractere(ocrNormalizar(recorte, lg, la));
      texto += ch;
      confianca = Math.min(confianca, score);
    }

    const n = parseInt(texto.replace('%', ''), 10);
    if (!Number.isNaN(n)) valores[OCR_CHAVES[i]] = n;
    else vazias.push(OCR_CHAVES[i]);
  }

  return { valores, confianca, linhasVazias: vazias };
}
