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

let publicadoEm = null;   // quando o admin publicou pela última vez

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

  if (compartilhado) {
    // o que o admin publicou vale para todo mundo e ganha do repositório
    if (compartilhado.club) club = { ...club, ...compartilhado.club };
    if (Array.isArray(compartilhado.players) && compartilhado.players.length) {
      raw = compartilhado.players;
    }
    publicadoEm = compartilhado.atualizadoEm || null;
  } else {
    // nada publicado ainda: usa o rascunho local do admin, se existir
    try {
      const override = JSON.parse(localStorage.getItem(LS_CLUB) || 'null');
      if (override) club = { ...club, ...override };
    } catch (e) { /* ignora override corrompido */ }

    try {
      const edits = JSON.parse(localStorage.getItem(LS_PLAYERS) || 'null');
      if (Array.isArray(edits) && edits.length) raw = edits;
    } catch (e) { /* ignora edição corrompida */ }
  }

  buildRoster(raw);
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

/* ------------------------------------------------------- clique/toque (mobile) */

function setupClickPlacement() {
  document.addEventListener('click', e => {
    // remover jogador
    const rm = e.target.closest('.slot-remove');
    if (rm) {
      const slot = rm.closest('.slot');
      e.stopPropagation();
      clearSlot(slot.dataset.zone, +slot.dataset.index);
      return;
    }

    // trocar a carta do jogador (não seleciona a linha)
    const pill = e.target.closest('.variant-pill');
    if (pill) {
      e.stopPropagation();
      setActiveVariant(pill.dataset.player, pill.dataset.vid);
      return;
    }

    // selecionar no elenco
    const item = e.target.closest('.roster-item');
    if (item) {
      const vid = item.dataset.vid;
      selected = (selected && selected.src === 'roster' && selected.vid === vid)
        ? null
        : { src: 'roster', vid };
      renderRoster();
      renderPitch();
      renderBench();
      return;
    }

    // clicar num slot
    const slot = e.target.closest('.slot');
    if (slot) {
      const zone = slot.dataset.zone, index = +slot.dataset.index;
      const occupied = zoneArray(zone)[index];

      if (selected && selected.src === 'roster') {
        placeCard(selected.vid, zone, index);
        selected = null;
        return;
      }
      if (selected && selected.src === 'slot') {
        swapSlots({ zone: selected.zone, index: selected.index }, { zone, index });
        selected = null;
        return;
      }
      if (occupied) {
        selected = { src: 'slot', zone, index };
        renderPitch(); renderBench(); renderRoster();
      }
      return;
    }

    // clique fora limpa a seleção
    if (selected) { selected = null; renderPitch(); renderBench(); renderRoster(); }
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

  $('#squadName').addEventListener('input', e => { state.squadName = e.target.value; saveState(); });

  $('#btnSave').addEventListener('click', saveSquad);
  $('#btnShare').addEventListener('click', shareLink);

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
  restoreState();

  const hash = location.hash.match(/^#e=(.+)$/);
  if (hash && decodeState(hash[1])) toast('Escalação carregada do link');

  setupDnD();
  setupClickPlacement();
  setupControls();
  renderAll();
  renderSaved();
})();
