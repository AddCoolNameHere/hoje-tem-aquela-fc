/* ==========================================================================
   HOJE TEM AQUELA F.C. — Montador de Formações
   ========================================================================== */

const LS_CLUB    = 'htafc:club';
const LS_PLAYERS = 'htafc:players';
const LS_BLOBS   = 'htafc:cardblobs';
const LS_SQUADS  = 'htafc:squads';
const LS_STATE   = 'htafc:state';

/* Os dados que o admin publica ficam no Cloudflare, junto do fusslabs.com.
   Tenta primeiro a API do próprio site; se não existir (GitHub Pages), usa a
   do fusslabs.com, que é onde mora a versão que vale para todo mundo. */
const API_ABS = 'https://fusslabs.com/api';
let API = '/api';

let publicadoEm = null;    // quando o admin publicou pela última vez
let rascunhoLocal = false; // true quando a tela mostra um teste local, não o publicado

const BENCH_SIZE = 7;

const state = {
  formation: '4-3-3',
  slots: new Array(11).fill(null),   // ids de CARTA na ordem de FORMATIONS[formation]
  bench: new Array(BENCH_SIZE).fill(null),
  active: {},                        // playerId -> id da carta escolhida
  squadName: '',
};

let players  = [];                   // elenco carregado de data/players.json
let variants = [];                   // todas as cartas, achatadas
let club = { name: 'HOJE TEM AQUELA F.C.', division: null, divisionLabel: '—', crest: null };
let selected = null;                 // {src:'roster', vid} | {src:'slot', zone, index}

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ------------------------------------------------------------------- helpers */

const getPlayer  = id  => players.find(p => p.id === id) || null;
const getVariant = vid => variants.find(v => v.vid === vid) || null;

/** Carta atualmente escolhida para um jogador. */
function activeVariant(player) {
  return getVariant(state.active[player.id]) || player.variants[0];
}

/** Etiqueta curta do arquétipo, para os botões de variante. */
function shortArchetype(a) {
  if (!a) return '—';
  const plus = a.endsWith('+') ? '+' : '';
  return a.replace('+', '').slice(0, 3).toUpperCase() + plus;
}

function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/);
  return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Quão bem a posição natural do jogador encaixa no slot. */
function fitClass(playerPos, slotPos) {
  if (!playerPos) return '';
  const natural = String(playerPos).split('/').map(s => s.trim().toUpperCase());
  if (natural.includes(slotPos)) return 'fit-natural';
  const related = POSITION_RELATED[slotPos] || [];
  if (natural.some(p => related.includes(p))) return 'fit-related';
  return 'fit-out';
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2200);
}

/* --------------------------------------------------------------- carregamento */

async function loadJSON(path, fallback) {
  try {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (e) {
    console.warn(`Não consegui carregar ${path}:`, e.message);
    return fallback;
  }
}

/** O que o admin publicou. Null se ninguém publicou ainda ou se a API não responde. */
async function loadShared() {
  for (const base of [API, API_ABS]) {
    try {
      const res = await fetch(`${base}/dados`, { cache: 'no-store' });
      if (!res.ok) continue;
      const d = await res.json();        // se vier HTML de 404, estoura e tenta a próxima
      API = base;
      return (d && !d.vazio) ? d : null;
    } catch (e) { /* tenta a próxima */ }
  }
  console.warn('Dados compartilhados indisponíveis — usando os arquivos do repositório.');
  return null;
}

async function loadData() {
  // base: o que está commitado no repositório
  const clubData = await loadJSON('data/club.json', null);
  if (clubData) club = { ...club, ...clubData };

  const roster = await loadJSON('data/players.json', { players: [] });
  let raw = roster.players || [];

  const compartilhado = await loadShared();

  // 2) o que o admin publicou vale para todo mundo e ganha do repositório
  if (compartilhado) {
    if (compartilhado.club) club = { ...club, ...compartilhado.club };
    if (Array.isArray(compartilhado.players) && compartilhado.players.length) {
      raw = compartilhado.players;
    }
    publicadoEm = compartilhado.atualizadoEm || null;
  }

  // 3) por último o rascunho deste navegador, se alguém apertou "testar aqui"
  try {
    const override = JSON.parse(localStorage.getItem(LS_CLUB) || 'null');
    if (override) { club = { ...club, ...override }; rascunhoLocal = true; }
  } catch (e) { /* ignora override corrompido */ }

  try {
    const edits = JSON.parse(localStorage.getItem(LS_PLAYERS) || 'null');
    if (Array.isArray(edits) && edits.length) { raw = edits; rascunhoLocal = true; }
  } catch (e) { /* ignora edição corrompida */ }

  buildRoster(raw);
}

/** Avisa que a tela não é a publicada, para ninguém achar que o time está vendo isso. */
function renderAvisoRascunho() {
  const el = $('#avisoRascunho');
  el.hidden = !rascunhoLocal;
}

/** Normaliza o elenco e monta a lista achatada de cartas. */
function buildRoster(raw) {
  variants = [];

  // cartas recortadas no admin que ainda não viraram arquivo no repositório
  let blobs = {};
  try { blobs = JSON.parse(localStorage.getItem(LS_BLOBS) || '{}'); } catch (e) { /* ignora */ }

  players = raw.map((p, i) => {
    const id = p.id || `p${i + 1}`;
    const player = {
      id,
      name: p.name || `Jogador ${i + 1}`,
      gamertag: p.gamertag || id,
    };

    // aceita tanto o formato novo (cards[]) quanto o antigo (uma carta solta no jogador)
    const list = (Array.isArray(p.cards) && p.cards.length)
      ? p.cards
      : [{ id: `${id}-1`, archetype: p.archetype, position: p.position, rating: p.rating, card: p.card }];

    player.variants = list.map((c, j) => {
      const v = {
        vid: c.id || `${id}-${j + 1}`,
        playerId: id,
        name: player.name,
        gamertag: player.gamertag,
        archetype: c.archetype || '',
        position: c.position || '',
        rating: c.rating ?? null,
        card: (c.card && blobs[c.card]) || c.card || null,
      };
      variants.push(v);
      return v;
    });

    return player;
  });

  // garante que cada jogador tem uma carta escolhida e válida
  players.forEach(p => {
    if (!p.variants.some(v => v.vid === state.active[p.id])) {
      state.active[p.id] = p.variants[0].vid;
    }
  });
}

/** Descarta ids de carta que não existem mais e migra ids antigos de jogador. */
function sanitizeSlots(arr) {
  return arr.map(id => {
    if (!id) return null;
    if (getVariant(id)) return id;
    const p = getPlayer(id);                    // escalação salva antes das variantes
    return p ? activeVariant(p).vid : null;
  });
}

/* --------------------------------------------------------------- render club */

function renderClub() {
  $('#divNum').textContent   = club.division ?? '—';
  $('#divLabel').textContent = club.divisionLabel || (club.division ? `Divisão ${club.division}` : 'Não definida');
  if (club.crest) $('#crest').innerHTML = `<img src="${club.crest}" alt="Escudo">`;
  document.title = `${club.name} — Montador de Formações`;

  $('#divisionBadge').title = publicadoEm
    ? `Publicado pelo admin em ${new Date(publicadoEm).toLocaleString('pt-BR')}`
    : 'Divisão atual do clube';
}

/* ---------------------------------------------------------------- render carta */

function cardHTML(player) {
  if (player.card) {
    return `<div class="card"><img src="${player.card}" alt="${player.name}" draggable="false"
              onerror="this.parentElement.innerHTML = window.__genCard(${JSON.stringify(JSON.stringify(player)).replace(/"/g, '&quot;')})"></div>`;
  }
  return `<div class="card">${genCard(player)}</div>`;
}

function genCard(p) {
  const player = typeof p === 'string' ? JSON.parse(p) : p;
  return `
    <div class="card-gen">
      <div class="cg-top">
        <span class="cg-rating">${player.rating ?? '—'}</span>
        <span class="cg-pos">${(player.position || '').split('/')[0]}</span>
      </div>
      <div class="cg-face">${initials(player.name)}</div>
      <div class="cg-name">${player.name}</div>
    </div>`;
}
window.__genCard = genCard;

/* ---------------------------------------------------------------- render campo */

/* O gramado ocupa só parte da área do campo (inset 11% 3% 9%), então as coordenadas
   das formações são remapeadas para dentro dessa faixa. */
const TURF = { left: 3, top: 11, w: 94, h: 80 };

function renderPitch() {
  const pitch = $('#pitch');
  $$('.slot', pitch).forEach(el => el.remove());

  const layout = FORMATIONS[state.formation];
  layout.forEach(([pos, x, y], i) => {
    const vid = state.slots[i];
    const player = vid ? getVariant(vid) : null;

    const el = document.createElement('div');
    el.className = 'slot' + (player ? ' ' + fitClass(player.position, pos) : '');
    el.style.left = (TURF.left + x / 100 * TURF.w) + '%';
    el.style.top  = (TURF.top  + y / 100 * TURF.h) + '%';
    el.dataset.zone  = 'pitch';
    el.dataset.index = i;
    el.dataset.pos   = pos;

    if (selected && selected.src === 'slot' && selected.zone === 'pitch' && selected.index === i) {
      el.classList.add('is-selected');
    }

    el.innerHTML = `
      <div class="slot-inner" ${player ? 'draggable="true"' : ''}>
        ${player ? cardHTML(player) : '<div class="slot-empty"></div>'}
      </div>
      <span class="slot-pos">${pos}</span>
      ${player ? `<span class="slot-name" title="${player.name}">${player.name}</span>` : ''}
      ${player ? '<button class="slot-remove" title="Tirar do time">×</button>' : ''}`;

    pitch.appendChild(el);
  });

  $('#formationTag').textContent = state.formation;
  const filled = state.slots.filter(Boolean).length;
  $('#squadSubtitle').textContent = `Time titular · ${filled} de 11 escalados`;
}

function renderBench() {
  const bench = $('#bench');
  bench.innerHTML = '';

  for (let i = 0; i < BENCH_SIZE; i++) {
    const vid = state.bench[i];
    const player = vid ? getVariant(vid) : null;

    const el = document.createElement('div');
    el.className = 'slot bench-slot';
    el.dataset.zone  = 'bench';
    el.dataset.index = i;
    el.dataset.pos   = 'RES';

    if (selected && selected.src === 'slot' && selected.zone === 'bench' && selected.index === i) {
      el.classList.add('is-selected');
    }

    el.innerHTML = `
      <div class="slot-inner" ${player ? 'draggable="true"' : ''}>
        ${player ? cardHTML(player) : '<div class="slot-empty"></div>'}
      </div>
      <span class="slot-pos">${player ? (player.position || '').split('/')[0] || 'RES' : 'RES'}</span>
      ${player ? `<span class="slot-name" title="${player.name}">${player.name}</span>` : ''}
      ${player ? '<button class="slot-remove" title="Tirar da reserva">×</button>' : ''}`;

    bench.appendChild(el);
  }

  $('#benchCount').textContent = `${state.bench.filter(Boolean).length} / ${BENCH_SIZE}`;
}

/* --------------------------------------------------------------- render elenco */

function renderRoster() {
  const list = $('#rosterList');
  const q = ($('#rosterSearch').value || '').trim().toLowerCase();
  const usedPlayers = new Set(
    [...state.slots, ...state.bench].filter(Boolean)
      .map(vid => getVariant(vid)?.playerId).filter(Boolean));

  const matches = p => !q
    || p.name.toLowerCase().includes(q)
    || p.gamertag.toLowerCase().includes(q)
    || p.variants.some(v => (v.position + ' ' + v.archetype).toLowerCase().includes(q));

  const visible = players.filter(matches);

  $('#rosterCount').textContent = `${usedPlayers.size} / ${players.length}`;

  if (!players.length) {
    list.innerHTML = `
      <div class="empty-state">
        <strong>Nenhuma carta ainda</strong>
        Recorte os prints em <code>admin.html</code> e cadastre o elenco em <code>data/players.json</code>.
      </div>`;
    return;
  }

  if (!visible.length) {
    list.innerHTML = `<div class="empty-state">Nenhum jogador encontrado.</div>`;
    return;
  }

  list.innerHTML = visible.map(p => {
    const v = activeVariant(p);
    const isSel = selected && selected.src === 'roster' && selected.vid === v.vid;

    const pills = p.variants.length > 1
      ? `<div class="variant-pills">${p.variants.map(x => `
           <button class="variant-pill${x.vid === v.vid ? ' is-active' : ''}"
                   data-vid="${x.vid}" data-player="${p.id}"
                   title="${x.archetype || 'Carta'} · ${x.position || '?'} · ${x.rating ?? '?'}">
             ${shortArchetype(x.archetype)}
           </button>`).join('')}</div>`
      : '';

    return `
      <div class="roster-item${usedPlayers.has(p.id) ? ' is-used' : ''}${isSel ? ' is-selected' : ''}"
           draggable="true" data-vid="${v.vid}">
        <div class="thumb">${v.card ? `<img src="${v.card}" alt="" draggable="false" onerror="this.remove()">` : initials(p.name)}</div>
        <div class="info">
          <div class="n">${p.name}</div>
          <div class="p">${v.position || 'sem posição'}${v.archetype ? ' · ' + v.archetype : ''}</div>
        </div>
        <div class="ovr">${v.rating ?? ''}</div>
        ${pills}
      </div>`;
  }).join('');
}

/* ----------------------------------------------------------- render formações */

function renderFormations() {
  const grid = $('#formationGrid');
  grid.innerHTML = FORMATION_ORDER.map(f =>
    `<button class="formation-btn${f === state.formation ? ' is-active' : ''}" data-formation="${f}">${f}</button>`
  ).join('');

  // deixa a formação escolhida sempre visível dentro da lista rolável
  const active = grid.querySelector('.is-active');
  if (active && grid.scrollHeight > grid.clientHeight) {
    grid.scrollTop = active.offsetTop - grid.clientHeight / 2 + active.offsetHeight / 2;
  }
}

function renderAll() {
  renderPitch();
  renderBench();
  renderRoster();
  renderFormations();
  saveState();
}

/* --------------------------------------------------------------- manipulações */

function zoneArray(zone) { return zone === 'bench' ? state.bench : state.slots; }

/** Coloca uma carta num slot. Se o jogador já estiver escalado, sai do lugar antigo (troca). */
function placeCard(vid, zone, index) {
  const v = getVariant(vid);
  if (!v) return;

  const arr = zoneArray(zone);
  const outgoing = arr[index];

  // um jogador só ocupa um lugar: se já estava escalado, troca com quem estava aqui
  const from = findPlayerSlot(v.playerId);
  if (from) zoneArray(from.zone)[from.index] = outgoing;

  arr[index] = vid;
  state.active[v.playerId] = vid;      // a carta usada vira a escolhida no elenco
  renderAll();
}

/** Onde esse jogador está escalado, seja qual for a carta. */
function findPlayerSlot(playerId) {
  const at = (arr, zone) => {
    const i = arr.findIndex(vid => vid && getVariant(vid)?.playerId === playerId);
    return i >= 0 ? { zone, index: i } : null;
  };
  return at(state.slots, 'pitch') || at(state.bench, 'bench');
}

/** Troca a carta escolhida de um jogador — e atualiza o campo se ele estiver escalado. */
function setActiveVariant(playerId, vid) {
  if (!getVariant(vid)) return;
  state.active[playerId] = vid;

  const at = findPlayerSlot(playerId);
  if (at) zoneArray(at.zone)[at.index] = vid;

  if (selected && selected.src === 'roster') selected = { src: 'roster', vid };
  renderAll();
}

function swapSlots(a, b) {
  if (a.zone === b.zone && a.index === b.index) return;
  const arrA = zoneArray(a.zone), arrB = zoneArray(b.zone);
  const tmp = arrA[a.index];
  arrA[a.index] = arrB[b.index];
  arrB[b.index] = tmp;
  renderAll();
}

function clearSlot(zone, index) {
  zoneArray(zone)[index] = null;
  renderAll();
}

function setFormation(f) {
  if (!FORMATIONS[f]) return;
  state.formation = f;              // os 11 jogadores continuam nos mesmos índices
  selected = null;
  renderAll();
}

/* ---------------------------------------------------------- drag & drop (mouse) */

function dragPayload(e) {
  try { return JSON.parse(e.dataTransfer.getData('text/plain')); } catch { return null; }
}

function setupDnD() {
  document.addEventListener('dragstart', e => {
    const rosterItem = e.target.closest('.roster-item');
    const slotInner  = e.target.closest('.slot-inner[draggable="true"]');

    if (rosterItem) {
      e.dataTransfer.setData('text/plain', JSON.stringify({ src: 'roster', vid: rosterItem.dataset.vid }));
      e.dataTransfer.effectAllowed = 'move';
      rosterItem.classList.add('is-dragging');
      return;
    }
    if (slotInner) {
      const slot = slotInner.closest('.slot');
      e.dataTransfer.setData('text/plain', JSON.stringify({
        src: 'slot', zone: slot.dataset.zone, index: +slot.dataset.index,
      }));
      e.dataTransfer.effectAllowed = 'move';
      slot.classList.add('is-dragging');
      return;
    }
    // qualquer outro arraste (ex.: imagem solta) é bloqueado
    e.preventDefault();
  });

  document.addEventListener('dragend', () => {
    $$('.is-dragging').forEach(el => el.classList.remove('is-dragging'));
    $$('.is-over').forEach(el => el.classList.remove('is-over'));
  });

  document.addEventListener('dragover', e => {
    const slot = e.target.closest('.slot');
    if (!slot) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!slot.classList.contains('is-over')) {
      $$('.is-over').forEach(el => el.classList.remove('is-over'));
      slot.classList.add('is-over');
    }
  });

  document.addEventListener('dragleave', e => {
    const slot = e.target.closest('.slot');
    if (slot && !slot.contains(e.relatedTarget)) slot.classList.remove('is-over');
  });

  document.addEventListener('drop', e => {
    const slot = e.target.closest('.slot');
    const rosterPanel = e.target.closest('#rosterList');
    const data = dragPayload(e);
    if (!data) return;
    e.preventDefault();

    // soltar de volta no elenco = tirar do time
    if (rosterPanel && data.src === 'slot') {
      clearSlot(data.zone, data.index);
      return;
    }
    if (!slot) return;

    const target = { zone: slot.dataset.zone, index: +slot.dataset.index };
    if (data.src === 'roster') placeCard(data.vid, target.zone, target.index);
    else swapSlots({ zone: data.zone, index: data.index }, target);
  });
}

/* ---------------------------------------------------- seletor de arquétipo */

let modalPlayerId = null;   // de quem é o modal aberto

/** Abre o seletor para um jogador. `origem` diz de onde veio o clique. */
function abrirModal(playerId, origem) {
  const p = getPlayer(playerId);
  if (!p) return;

  modalPlayerId = playerId;
  const atual = activeVariant(p);
  const onde  = findPlayerSlot(playerId);

  $('#modalCarta').innerHTML = cardHTML(atual);
  $('#modalNome').textContent = p.name;
  $('#modalTag').textContent  = p.gamertag;
  $('#modalAtual').textContent = atual.archetype
    ? `${atual.archetype} · ${atual.position || 'sem posição'}`
    : (atual.position || 'sem arquétipo');

  // as cartas do jogador, agrupadas pelo arquétipo OFICIAL (uma variante como
  // THIEF cai no RECYCLER, que é o arquétipo de verdade)
  const cartasPorArq = {};
  p.variants.forEach(v => {
    const oficial = arquetipoDaCarta(v.archetype);
    const chave = oficial ? oficial.nome : arquetipoBase(v.archetype);
    (cartasPorArq[chave] = cartasPorArq[chave] || []).push(v);
  });

  // arquétipo que a carta traz mas que não está no catálogo entra em "outros"
  const soltos = Object.keys(cartasPorArq).filter(k => k && !ARQUETIPO_POR_NOME[k]);
  const setores = [...SETORES, ...(soltos.length ? [{ id: 'outros', nome: 'Fora do catálogo' }] : [])];

  $('#modalArquetipos').innerHTML = setores.map(s => {
    const doSetor = ARQUETIPOS.filter(a => a.setor === s.id);
    const extras  = s.id === 'outros' ? soltos.map(n => ({ nome: n, posicao: '', icone: null })) : [];
    const lista   = [...doSetor, ...extras];

    if (!lista.length) {
      return `
        <div class="setor">
          <div class="setor-nome">${s.nome}</div>
          <div class="modal-vazio" style="padding:10px">Nenhum arquétipo deste setor cadastrado ainda.</div>
        </div>`;
    }

    return `
      <div class="setor">
        <div class="setor-nome">${s.nome}</div>
        <div class="arq-grid">
          ${lista.map(a => {
            const cartas = cartasPorArq[a.nome] || [];
            const tem    = cartas.length > 0;
            const carta  = cartas[0];
            const ativo  = tem && cartas.some(c => c.vid === atual.vid);
            const alvo   = tem ? (cartas.find(c => c.vid === atual.vid) || carta) : null;

            // se a carta traz um nome diferente do oficial (ex.: THIEF no RECYCLER), mostra os dois
            const escrito = tem ? arquetipoBase(carta.archetype) : '';
            const legenda = tem
              ? [escrito && escrito !== a.nome ? escrito : '', carta.position || a.posicao].filter(Boolean).join(' · ')
              : 'sem carta';

            const dica = a.desc
              ? `${a.desc}${a.playstyles?.length ? '\n\nPlaystyles: ' + a.playstyles.join(', ') : ''}`
              : '';

            return `
              <button class="arq${ativo ? ' is-active' : ''}" ${tem ? `data-vid="${alvo.vid}"` : 'disabled'}
                      title="${dica.replace(/"/g, '&quot;')}">
                <span class="icone">${
                  a.icone ? `<img class="simbolo" src="${a.icone}" alt="">`
                  : (tem && carta.card ? `<img src="${carta.card}" alt="">` : a.nome.slice(0, 3))
                }</span>
                <span class="txt">
                  <span class="n">${a.nome}</span>
                  <span class="d">${legenda}</span>
                </span>
                ${tem && carta.rating != null ? `<span class="ovr">${carta.rating}</span>` : ''}
              </button>`;
          }).join('')}
        </div>
      </div>`;
  }).join('') || '<div class="modal-vazio">Nenhum arquétipo cadastrado ainda.</div>';

  // ações mudam conforme o jogador já está escalado ou não
  $('#modalAcoes').innerHTML = onde
    ? `<button class="btn" data-acao="trocar">Trocar de lugar</button>
       <button class="btn btn-danger" data-acao="tirar">Tirar do time</button>`
    : `<button class="btn btn-primary" data-acao="escalar">Escalar no campo</button>`;

  $('#modalBg').hidden = false;
  document.body.style.overflow = 'hidden';
  void origem;
}

function fecharModal() {
  $('#modalBg').hidden = true;
  document.body.style.overflow = '';
  modalPlayerId = null;
  modalVaga = null;
}

/* -------------------------------------------------- sugestões para uma vaga */

let modalVaga = null;   // {zone, index, pos} quando o modal está sugerindo gente

const ROTULO_ENCAIXE = {
  'fit-natural': 'Posição natural',
  'fit-related': 'Dá pra jogar',
  'fit-out':     'Fora de posição',
};

/** Abre o modal com quem serve para essa vaga, do que encaixa melhor pro pior. */
function abrirSugestoes(zone, index, pos) {
  modalPlayerId = null;
  modalVaga = { zone, index, pos };

  const escalados = new Set(
    [...state.slots, ...state.bench].filter(Boolean)
      .map(vid => getVariant(vid)?.playerId).filter(Boolean));

  const livres = players.filter(p => !escalados.has(p.id));

  // no banco qualquer um serve; no campo vale o encaixe na posição do slot
  const candidatos = livres.map(p => {
    const v = activeVariant(p);
    return { p, v, encaixe: zone === 'bench' ? 'fit-natural' : fitClass(v.position, pos) };
  });

  const ordem = ['fit-natural', 'fit-related', 'fit-out', ''];
  const grupos = ordem.map(chave => ({
    chave,
    lista: candidatos
      .filter(c => c.encaixe === chave)
      .sort((a, b) => (b.v.rating ?? -1) - (a.v.rating ?? -1)),
  })).filter(g => g.lista.length);

  $('#modalCarta').innerHTML = `<div class="vaga-pos">${pos}</div>`;
  $('#modalNome').textContent = zone === 'bench' ? 'Reserva' : `Vaga de ${pos}`;
  $('#modalTag').textContent  = `${livres.length} disponíveis · ${escalados.size} já escalados`;
  $('#modalAtual').textContent = zone === 'bench'
    ? 'Escolha quem senta no banco'
    : 'Sugestões pela posição natural de cada um';

  $('#modalArquetipos').innerHTML = grupos.length
    ? grupos.map(g => `
        <div class="setor">
          <div class="setor-nome ${g.chave}">${ROTULO_ENCAIXE[g.chave] || 'Sem posição definida'}</div>
          <div class="sug-lista">
            ${g.lista.map(({ p, v }) => `
              <button class="sug" data-vid="${v.vid}" title="Escalar ${p.name} aqui">
                <span class="sug-carta">${cardHTML(v)}</span>
                <span class="txt">
                  <span class="n">${p.name}</span>
                  <span class="d">${v.position || 'sem posição'}${v.archetype ? ' · ' + v.archetype : ''}</span>
                </span>
                ${v.rating != null ? `<span class="ovr">${v.rating}</span>` : ''}
              </button>`).join('')}
          </div>
        </div>`).join('')
    : '<div class="modal-vazio">Todo mundo já está escalado.</div>';

  $('#modalAcoes').innerHTML = '<button class="btn" data-acao="fechar">Fechar</button>';

  $('#modalBg').hidden = false;
  document.body.style.overflow = 'hidden';
}

function setupModal() {
  $('#modalFechar').addEventListener('click', fecharModal);

  $('#modalBg').addEventListener('click', e => {
    if (e.target === $('#modalBg')) fecharModal();   // clicar fora fecha
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#modalBg').hidden) fecharModal();
  });

  $('#modalArquetipos').addEventListener('click', e => {
    // escolher alguém para a vaga
    const sug = e.target.closest('.sug[data-vid]');
    if (sug && modalVaga) {
      const { zone, index } = modalVaga;
      placeCard(sug.dataset.vid, zone, index);
      const v = getVariant(sug.dataset.vid);
      fecharModal();
      toast(`${v.name} escalado`);
      return;
    }

    // trocar o arquétipo
    const btn = e.target.closest('.arq[data-vid]');
    if (!btn || !modalPlayerId) return;
    setActiveVariant(modalPlayerId, btn.dataset.vid);
    abrirModal(modalPlayerId);                        // redesenha com o novo ativo
    toast('Arquétipo trocado');
  });

  $('#modalAcoes').addEventListener('click', e => {
    const btn = e.target.closest('[data-acao]');
    if (!btn) return;
    if (btn.dataset.acao === 'fechar') { fecharModal(); return; }
    if (!modalPlayerId) return;
    const p = getPlayer(modalPlayerId);
    const onde = findPlayerSlot(modalPlayerId);

    if (btn.dataset.acao === 'tirar' && onde) {
      clearSlot(onde.zone, onde.index);
      fecharModal();
      return;
    }
    if (btn.dataset.acao === 'escalar') {
      selected = { src: 'roster', vid: activeVariant(p).vid };
      fecharModal();
      renderAll();
      toast('Agora toque na posição do campo');
      return;
    }
    if (btn.dataset.acao === 'trocar' && onde) {
      selected = { src: 'slot', zone: onde.zone, index: onde.index };
      fecharModal();
      renderAll();
      toast('Agora toque em quem vai trocar de lugar');
    }
  });
}

/* ------------------------------------------------------- clique/toque (mobile) */

function setupClickPlacement() {
  document.addEventListener('click', e => {
    if (e.target.closest('.modal-bg')) return;   // o modal cuida dos cliques dele

    // remover jogador
    const rm = e.target.closest('.slot-remove');
    if (rm) {
      const slot = rm.closest('.slot');
      e.stopPropagation();
      clearSlot(slot.dataset.zone, +slot.dataset.index);
      return;
    }

    // atalho de carta no elenco — não abre o seletor
    const pill = e.target.closest('.variant-pill');
    if (pill) {
      e.stopPropagation();
      setActiveVariant(pill.dataset.player, pill.dataset.vid);
      return;
    }

    const slot = e.target.closest('.slot');

    // tem alguém esperando destino? então este clique conclui a jogada
    if (slot && selected) {
      const zone = slot.dataset.zone, index = +slot.dataset.index;
      if (selected.src === 'roster') placeCard(selected.vid, zone, index);
      else swapSlots({ zone: selected.zone, index: selected.index }, { zone, index });
      selected = null;
      return;
    }

    // clicar num jogador (sem arrastar) abre o seletor de arquétipo
    const item = e.target.closest('.roster-item');
    if (item) {
      const v = getVariant(item.dataset.vid);
      if (v) abrirModal(v.playerId, 'elenco');
      return;
    }
    if (slot) {
      const zone = slot.dataset.zone, index = +slot.dataset.index;
      const vid = zoneArray(zone)[index];
      const v = vid ? getVariant(vid) : null;

      if (v) abrirModal(v.playerId, 'campo');
      else abrirSugestoes(zone, index, slot.dataset.pos);   // clicou no + de uma vaga vazia
      return;
    }

    // clique fora limpa a seleção pendente
    if (selected) { selected = null; renderAll(); }
  });
}

/* ----------------------------------------------------------------- persistência */

function saveState() {
  try { localStorage.setItem(LS_STATE, JSON.stringify(state)); } catch (e) { /* quota */ }
}

function restoreState() {
  try {
    const s = JSON.parse(localStorage.getItem(LS_STATE) || 'null');
    if (s && FORMATIONS[s.formation]) {
      state.formation  = s.formation;
      state.slots      = (s.slots || []).slice(0, 11);
      state.bench      = (s.bench || []).slice(0, BENCH_SIZE);
      state.squadName  = s.squadName || '';
      if (s.active) Object.assign(state.active, s.active);
    }
  } catch (e) { /* estado corrompido, começa do zero */ }
  normalizeState();
  $('#squadName').value = state.squadName;
}

/** Completa os arrays e descarta cartas que não existem mais. */
function normalizeState() {
  while (state.slots.length < 11) state.slots.push(null);
  while (state.bench.length < BENCH_SIZE) state.bench.push(null);
  state.slots = sanitizeSlots(state.slots.slice(0, 11));
  state.bench = sanitizeSlots(state.bench.slice(0, BENCH_SIZE));

  // a carta escolhida de cada jogador pode ter sumido entre uma sessão e outra
  players.forEach(p => {
    if (!p.variants.some(v => v.vid === state.active[p.id])) state.active[p.id] = p.variants[0].vid;
  });
}

function getSquads() {
  try { return JSON.parse(localStorage.getItem(LS_SQUADS) || '[]'); } catch { return []; }
}

function renderSaved() {
  const squads = getSquads();
  $('#savedCount').textContent = squads.length;
  const list = $('#savedList');

  if (!squads.length) {
    list.innerHTML = `<div class="empty-state" style="padding:16px 8px">Nenhuma escalação salva ainda.</div>`;
    return;
  }

  list.innerHTML = squads.map((s, i) => `
    <div class="squad-row">
      <span class="sq-name" data-load="${i}" title="Carregar">${s.name}</span>
      <span class="sq-form">${s.formation}</span>
      <button class="sq-del" data-del="${i}" title="Apagar">×</button>
    </div>`).join('');
}

function saveSquad() {
  const name = ($('#squadName').value || '').trim() || `Escalação ${getSquads().length + 1}`;
  const squads = getSquads();
  const entry = {
    name,
    formation: state.formation,
    slots: [...state.slots],
    bench: [...state.bench],
    savedAt: new Date().toISOString(),
  };
  const existing = squads.findIndex(s => s.name === name);
  if (existing >= 0) squads[existing] = entry; else squads.push(entry);

  localStorage.setItem(LS_SQUADS, JSON.stringify(squads));
  state.squadName = name;
  renderSaved();
  toast(`"${name}" salva`);
}

function loadSquad(i) {
  const s = getSquads()[i];
  if (!s) return;
  state.formation = FORMATIONS[s.formation] ? s.formation : state.formation;
  state.slots = [...s.slots];
  state.bench = [...s.bench];
  state.squadName = s.name;
  $('#squadName').value = s.name;
  selected = null;
  normalizeState();
  renderAll();
  toast(`"${s.name}" carregada`);
}

/* ------------------------------------------------------------ compartilhamento */

function encodeState() {
  const payload = { f: state.formation, s: state.slots, b: state.bench, n: state.squadName };
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}

function decodeState(hash) {
  try {
    const p = JSON.parse(decodeURIComponent(escape(atob(hash))));
    if (!FORMATIONS[p.f]) return false;
    state.formation = p.f;
    state.slots = (p.s || []).slice(0, 11);
    state.bench = (p.b || []).slice(0, BENCH_SIZE);
    state.squadName = p.n || '';
    normalizeState();
    $('#squadName').value = state.squadName;
    return true;
  } catch { return false; }
}

async function shareLink() {
  const url = `${location.origin}${location.pathname}#e=${encodeState()}`;
  try {
    await navigator.clipboard.writeText(url);
    toast('Link copiado — manda no grupo');
  } catch {
    prompt('Copie o link:', url);
  }
}

/* ------------------------------------------------------------------- eventos */

function setupControls() {
  $('#formationGrid').addEventListener('click', e => {
    const btn = e.target.closest('.formation-btn');
    if (btn) setFormation(btn.dataset.formation);
  });

  $('#rosterSearch').addEventListener('input', renderRoster);

  $('#btnDescartarRascunho').addEventListener('click', () => {
    localStorage.removeItem(LS_CLUB);
    localStorage.removeItem(LS_PLAYERS);
    location.reload();
  });

  $('#squadName').addEventListener('input', e => { state.squadName = e.target.value; saveState(); });

  $('#btnSave').addEventListener('click', saveSquad);
  $('#btnShare').addEventListener('click', shareLink);
  $('#btnImagem').addEventListener('click', e => baixarImagemEscalacao(e.currentTarget));

  $('#btnClear').addEventListener('click', () => {
    if (!confirm('Limpar todos os jogadores do campo e das reservas?')) return;
    state.slots = new Array(11).fill(null);
    state.bench = new Array(BENCH_SIZE).fill(null);
    selected = null;
    renderAll();
    toast('Campo limpo');
  });

  $('#savedList').addEventListener('click', e => {
    const load = e.target.closest('[data-load]');
    if (load) return loadSquad(+load.dataset.load);

    const del = e.target.closest('[data-del]');
    if (del) {
      const squads = getSquads();
      const [removed] = squads.splice(+del.dataset.del, 1);
      localStorage.setItem(LS_SQUADS, JSON.stringify(squads));
      renderSaved();
      toast(`"${removed.name}" apagada`);
    }
  });
}

/* ---------------------------------------------------------------------- boot */

(async function init() {
  await loadData();
  renderClub();
  renderAvisoRascunho();
  restoreState();

  const hash = location.hash.match(/^#e=(.+)$/);
  if (hash && decodeState(hash[1])) toast('Escalação carregada do link');

  setupDnD();
  setupClickPlacement();
  setupModal();
  setupControls();
  renderAll();
  renderSaved();
})();
