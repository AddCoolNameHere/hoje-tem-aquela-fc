/* ==========================================================================
   Página de estatísticas: aba JOGADOR (carta -> stats) e aba LISTA (tabela
   ordenável por qualquer coluna).
   ========================================================================== */

const API_ABS = 'https://fusslabs.com/api';
let API = '/api';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let club     = { name: 'HOJE TEM AQUELA F.C.', division: null, divisionLabel: '—' };
let jogadores = [];   // do elenco (com as cartas)
let stats     = [];   // de data/stats.json
let selecionado = null;

/* colunas da tabela — 'num' ordena numericamente, 'maiorMelhor' pinta o líder */
const COLUNAS = [
  { chave: 'nome',           titulo: 'Jogador',   num: false },
  { chave: 'position',       titulo: 'Pos',       num: false },
  { chave: 'archetype',      titulo: 'Arquétipo', num: false },
  { chave: 'appearances',    titulo: 'Jogos',     num: true, maiorMelhor: true },
  { chave: 'goals',          titulo: 'Gols',      num: true, maiorMelhor: true },
  { chave: 'assists',        titulo: 'Assist.',   num: true, maiorMelhor: true },
  { chave: 'golsPorJogo',    titulo: 'Gols/jogo', num: true, maiorMelhor: true, casas: 2 },
  { chave: 'motm',           titulo: 'Craque',    num: true, maiorMelhor: true },
  { chave: 'cleanSheets',    titulo: 'Sem sofrer',num: true, maiorMelhor: true },
  { chave: 'passCompletion', titulo: 'Passe %',   num: true, maiorMelhor: true, sufixo: '%' },
  { chave: 'shotsOnTarget',  titulo: 'Chute %',   num: true, maiorMelhor: true, sufixo: '%' },
  { chave: 'redCards',       titulo: 'Vermelhos', num: true, maiorMelhor: false },
];

let ordem = { chave: 'appearances', desc: true };

/* ------------------------------------------------------------------ dados */

async function carregarJSON(caminho, padrao) {
  try {
    const res = await fetch(caminho, { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (e) { return padrao; }
}

async function carregarCompartilhado() {
  for (const base of [API, API_ABS]) {
    try {
      const res = await fetch(`${base}/dados`, { cache: 'no-store' });
      if (!res.ok) continue;
      const d = await res.json();
      API = base;
      return (d && !d.vazio) ? d : null;
    } catch (e) { /* tenta a próxima */ }
  }
  return null;
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2200);
}

/** Junta elenco + estatísticas numa lista só, já com o que é calculado. */
function montar(rawPlayers) {
  const porId = Object.fromEntries(stats.map(s => [s.id, s]));

  jogadores = rawPlayers.map(p => {
    const cards = (Array.isArray(p.cards) && p.cards.length) ? p.cards
      : [{ id: p.id + '-1', archetype: p.archetype, position: p.position, rating: p.rating, card: p.card }];

    // o que o admin publicou junto do jogador ganha do data/stats.json
    const doRepo = porId[p.id] || null;
    const s = (p.stats && Object.keys(p.stats).length)
      ? { ...(doRepo || {}), ...p.stats }
      : doRepo;

    return {
      id: p.id,
      nome: p.name || p.id,
      gamertag: p.gamertag || p.id,
      cards,
      stat: s,
      // o que a tabela ordena vem achatado aqui
      position:       s?.position       ?? cards[0]?.position ?? '—',
      archetype:      s?.archetype      ?? (cards[0]?.archetype || '—'),
      appearances:    s?.appearances    ?? null,
      goals:          s?.goals          ?? null,
      assists:        s?.assists        ?? null,
      motm:           s?.motm           ?? null,
      cleanSheets:    s?.cleanSheets    ?? null,
      redCards:       s?.redCards       ?? null,
      passCompletion: s?.passCompletion ?? null,
      shotsOnTarget:  s?.shotsOnTarget  ?? null,
      golsPorJogo: (s && s.appearances) ? s.goals / s.appearances : null,
    };
  });
}

/* ---------------------------------------------------------------- jogador */

function renderCartas() {
  // uma entrada por CARTA, para quem tem mais de um arquétipo aparecer duas vezes
  const itens = jogadores.flatMap(j => j.cards.map(c => ({ j, c })));

  $('#cartasGrade').innerHTML = itens.map(({ j, c }) => `
    <button class="carta-btn${selecionado === c.id ? ' is-active' : ''}" data-carta="${c.id}" data-jogador="${j.id}">
      ${c.rating != null ? `<span class="cb-lvl">${c.rating}</span>` : ''}
      ${c.card ? `<img src="${c.card}" alt="${j.nome}" loading="lazy">`
               : `<img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 72 100'%3E%3C/svg%3E" alt="">`}
      <span class="cb-nome">
        <span class="n">${j.nome}</span>
        <span class="a">${c.archetype || 'sem arquétipo'}</span>
      </span>
    </button>`).join('');
}

function renderDetalhe() {
  const box = $('#detalhe');
  if (!selecionado) { box.hidden = true; return; }

  const item = jogadores.flatMap(j => j.cards.map(c => ({ j, c }))).find(x => x.c.id === selecionado);
  if (!item) { box.hidden = true; return; }

  const { j, c } = item;
  const s = j.stat;
  const arq = arquetipoDaCarta(c.archetype);

  const item2 = (k, v, extra = '', destaque = false) => `
    <div class="det-item${destaque ? ' destaque' : ''}">
      <div class="k">${k}</div>
      <div class="v">${v}</div>
      ${extra ? `<div class="por-jogo">${extra}</div>` : ''}
    </div>`;

  const porJogo = (n) => s && s.appearances ? (n / s.appearances).toFixed(2) + ' por jogo' : '';

  box.innerHTML = `
    <div class="det-head">
      ${c.card ? `<img src="${c.card}" alt="">` : ''}
      <div class="det-quem">
        <h2>${j.nome}</h2>
        <div class="gt">${j.gamertag}</div>
        <div class="meta">${c.archetype || '—'} · ${c.position || arq?.posicao || '—'}${s ? ` · ${s.height}` : ''}</div>
      </div>
      <button class="det-fechar" id="detFechar" title="Fechar">×</button>
    </div>
    ${s ? `
      <div class="det-grade">
        ${item2('Jogos', s.appearances, '', true)}
        ${item2('Gols', s.goals, porJogo(s.goals))}
        ${item2('Assistências', s.assists, porJogo(s.assists))}
        ${item2('Craque da partida', s.motm)}
        ${item2('Sem sofrer gol', s.cleanSheets)}
        ${item2('Acerto de passe', s.passCompletion + '%')}
        ${item2('Chutes no gol', s.shotsOnTarget + '%')}
        ${item2('Vermelhos', s.redCards)}
      </div>
      ${arq ? `<div class="sem-stats" style="text-align:left;border-top:1px solid var(--line-soft)">
                 <strong style="color:var(--txt-dim)">${arq.nome}</strong>${arq.inspirado ? ` <span style="color:var(--txt-faint)">· inspirado em ${arq.inspirado}</span>` : ''} — ${arq.desc}
                 ${arq.posicoes?.length ? `<br><span style="color:var(--green)">Joga bem em: ${arq.posicoes.join(', ')}</span>` : ''}
                 ${arq.playstyles?.length ? `<br><span style="color:var(--txt-faint)">Playstyles: ${arq.playstyles.join(', ')}</span>` : ''}
               </div>` : ''}
    ` : `<div class="sem-stats">Ainda não tenho as estatísticas desse jogador.<br>
          Basta um print da tela <strong>Club Squad</strong> com ele selecionado.</div>`}`;

  box.hidden = false;
  $('#detFechar').addEventListener('click', () => { selecionado = null; renderCartas(); renderDetalhe(); });
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/* ------------------------------------------------------------------ lista */

function valorFormatado(col, j) {
  const v = j[col.chave];
  if (v == null || v === '') return '—';
  if (col.chave === 'golsPorJogo') return v.toFixed(col.casas || 2);
  return v + (col.sufixo || '');
}

function renderTabela() {
  $('#tabelaHead').innerHTML = `<tr>${COLUNAS.map(c => `
    <th data-col="${c.chave}" class="${ordem.chave === c.chave ? 'ordenada' : ''}">
      ${c.titulo}${ordem.chave === c.chave ? `<span class="seta">${ordem.desc ? '▼' : '▲'}</span>` : ''}
    </th>`).join('')}</tr>`;

  const col = COLUNAS.find(c => c.chave === ordem.chave) || COLUNAS[3];
  const lista = [...jogadores].sort((a, b) => {
    const va = a[ordem.chave], vb = b[ordem.chave];
    if (va == null && vb == null) return 0;
    if (va == null) return 1;          // quem não tem stat vai pro fim
    if (vb == null) return -1;
    const cmp = col.num ? va - vb : String(va).localeCompare(String(vb), 'pt-BR');
    return ordem.desc ? -cmp : cmp;
  });

  // melhor valor de cada coluna numérica, para destacar o líder
  const melhores = {};
  COLUNAS.filter(c => c.num).forEach(c => {
    const vals = jogadores.map(j => j[c.chave]).filter(v => v != null);
    if (vals.length) melhores[c.chave] = c.maiorMelhor ? Math.max(...vals) : Math.min(...vals);
  });

  $('#tabelaBody').innerHTML = lista.map(j => `
    <tr>
      ${COLUNAS.map(c => {
        if (c.chave === 'nome') {
          const capa = j.cards[0]?.card;
          return `<td><span class="cel-jogador">
                    ${capa ? `<img src="${capa}" alt="" loading="lazy">` : '<span style="width:26px"></span>'}
                    <span><span class="n">${j.nome}</span><br><span class="g">${j.gamertag}</span></span>
                  </span></td>`;
        }
        const v = j[c.chave];
        const lider = c.num && v != null && melhores[c.chave] === v && jogadores.length > 1;
        return `<td class="${lider ? 'melhor' : ''}">${valorFormatado(c, j)}</td>`;
      }).join('')}
    </tr>`).join('');
}

/* ----------------------------------------------------------------- eventos */

function ligarEventos() {
  $$('.aba').forEach(b => b.addEventListener('click', () => {
    $$('.aba').forEach(x => x.classList.toggle('is-active', x === b));
    const alvo = b.dataset.aba;
    $('#abaJogador').hidden = alvo !== 'jogador';
    $('#abaLista').hidden   = alvo !== 'lista';
  }));

  $('#cartasGrade').addEventListener('click', e => {
    const btn = e.target.closest('.carta-btn');
    if (!btn) return;
    selecionado = selecionado === btn.dataset.carta ? null : btn.dataset.carta;
    renderCartas();
    renderDetalhe();
  });

  $('#tabelaHead').addEventListener('click', e => {
    const th = e.target.closest('th[data-col]');
    if (!th) return;
    const chave = th.dataset.col;
    const col = COLUNAS.find(c => c.chave === chave);
    if (ordem.chave === chave) ordem.desc = !ordem.desc;
    else ordem = { chave, desc: !!col.num };      // número começa do maior, texto de A a Z
    renderTabela();
  });
}

/* -------------------------------------------------------------------- boot */

(async function init() {
  const clubData = await carregarJSON('data/club.json', null);
  if (clubData) club = { ...club, ...clubData };

  const roster = await carregarJSON('data/players.json', { players: [] });
  let raw = roster.players || [];

  const compartilhado = await carregarCompartilhado();
  if (compartilhado) {
    if (compartilhado.club) club = { ...club, ...compartilhado.club };
    if (Array.isArray(compartilhado.players) && compartilhado.players.length) raw = compartilhado.players;
  }

  const st = await carregarJSON('data/stats.json', { stats: [] });
  stats = st.stats || [];

  montar(raw);

  $('#divNum').textContent   = club.division ?? '—';
  $('#divLabel').textContent = club.divisionLabel || '—';
  document.title = `Estatísticas — ${club.name}`;

  const comStats = jogadores.filter(j => j.stat).length;
  const cartas = jogadores.reduce((n, j) => n + j.cards.length, 0);
  $('#statsSub').textContent =
    `${jogadores.length} jogadores · ${cartas} cartas · ${comStats} com estatísticas` +
    (st.atualizadoEm ? ` · dados de ${new Date(st.atualizadoEm + 'T12:00').toLocaleDateString('pt-BR')}` : '');

  renderCartas();
  renderTabela();
  ligarEventos();
})();
