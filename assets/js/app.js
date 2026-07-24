/* ==========================================================================
   HOJE TEM AQUELA F.C. — Montador de Formações
   ========================================================================== */

const LS_CLUB    = 'htafc:club';
const LS_PLAYERS = 'htafc:players';
const LS_SQUADS  = 'htafc:squads';
const LS_STATE   = 'htafc:state';

const BENCH_SIZE = 7;

const state = {
  formation: '4-3-3',
  slots: new Array(11).fill(null),   // ids na ordem de FORMATIONS[formation]
  bench: new Array(BENCH_SIZE).fill(null),
  squadName: '',
};

let players = [];                    // elenco carregado de data/players.json
let club = { name: 'HOJE TEM AQUELA F.C.', division: null, divisionLabel: '—', crest: null };
let selected = null;                 // {src:'roster', id} | {src:'slot', zone, index}

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

/* ------------------------------------------------------------------- helpers */

const getPlayer = id => players.find(p => p.id === id) || null;

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

async function loadData() {
  const clubData = await loadJSON('data/club.json', null);
  if (clubData) club = { ...club, ...clubData };

  // o admin sobrescreve a divisão localmente até virar commit no repositório
  try {
    const override = JSON.parse(localStorage.getItem(LS_CLUB) || 'null');
    if (override) club = { ...club, ...override };
  } catch (e) { /* ignora override corrompido */ }

  const roster = await loadJSON('data/players.json', { players: [] });
  players = (roster.players || []).map((p, i) => ({
    id: p.id || `p${i + 1}`,
    name: p.name || `Jogador ${i + 1}`,
    position: p.position || '',
    rating: p.rating ?? null,
    card: p.card || null,
    ...p,
  }));

  // nomes/posições/overalls editados no admin valem por cima até virarem commit
  try {
    const edits = JSON.parse(localStorage.getItem(LS_PLAYERS) || 'null');
    if (Array.isArray(edits)) {
      players = players.map(p => ({ ...p, ...(edits.find(e => e.id === p.id) || {}) }));
    }
  } catch (e) { /* ignora edição corrompida */ }
}

/* --------------------------------------------------------------- render club */

function renderClub() {
  $('#divNum').textContent   = club.division ?? '—';
  $('#divLabel').textContent = club.divisionLabel || (club.division ? `Divisão ${club.division}` : 'Não definida');
  if (club.crest) $('#crest').innerHTML = `<img src="${club.crest}" alt="Escudo">`;
  document.title = `${club.name} — Montador de Formações`;
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

/* O gramado ocupa só parte da área do campo (inset 15% 3% 3%), então as coordenadas
   das formações são remapeadas para dentro dessa faixa. */
const TURF = { left: 3, top: 15, w: 94, h: 83 };

function renderPitch() {
  const pitch = $('#pitch');
  $$('.slot', pitch).forEach(el => el.remove());

  const layout = FORMATIONS[state.formation];
  layout.forEach(([pos, x, y], i) => {
    const id = state.slots[i];
    const player = id ? getPlayer(id) : null;

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
    const id = state.bench[i];
    const player = id ? getPlayer(id) : null;

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
      ${player ? '<button class="slot-remove" title="Tirar da reserva">×</button>' : ''}`;

    bench.appendChild(el);
  }

  $('#benchCount').textContent = `${state.bench.filter(Boolean).length} / ${BENCH_SIZE}`;
}

/* --------------------------------------------------------------- render elenco */

function renderRoster() {
  const list = $('#rosterList');
  const q = ($('#rosterSearch').value || '').trim().toLowerCase();
  const used = new Set([...state.slots, ...state.bench].filter(Boolean));

  const visible = players.filter(p =>
    !q || p.name.toLowerCase().includes(q) || (p.position || '').toLowerCase().includes(q));

  $('#rosterCount').textContent = `${used.size} / ${players.length}`;

  if (!players.length) {
    list.innerHTML = `
      <div class="empty-state">
        <strong>Nenhuma carta ainda</strong>
        Coloque os PNGs recortados em <code>cards/</code> e cadastre o elenco em <code>data/players.json</code>.
      </div>`;
    return;
  }

  if (!visible.length) {
    list.innerHTML = `<div class="empty-state">Nenhum jogador encontrado.</div>`;
    return;
  }

  list.innerHTML = visible.map(p => `
    <div class="roster-item${used.has(p.id) ? ' is-used' : ''}${selected && selected.src === 'roster' && selected.id === p.id ? ' is-selected' : ''}"
         draggable="true" data-id="${p.id}">
      <div class="thumb">${p.card ? `<img src="${p.card}" alt="" draggable="false" onerror="this.remove()">` : initials(p.name)}</div>
      <div class="info">
        <div class="n">${p.name}</div>
        <div class="p">${p.position || 'sem posição'}</div>
      </div>
      <div class="ovr">${p.rating ?? ''}</div>
    </div>`).join('');
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

/** Coloca um jogador num slot. Se já estiver escalado, sai do lugar antigo (troca). */
function placePlayer(playerId, zone, index) {
  const arr = zoneArray(zone);
  const outgoing = arr[index];

  // se o jogador já estava em outro slot, faz a troca
  const from = findPlayerSlot(playerId);
  if (from) {
    zoneArray(from.zone)[from.index] = outgoing;
  }
  arr[index] = playerId;
  renderAll();
}

function findPlayerSlot(playerId) {
  let i = state.slots.indexOf(playerId);
  if (i >= 0) return { zone: 'pitch', index: i };
  i = state.bench.indexOf(playerId);
  if (i >= 0) return { zone: 'bench', index: i };
  return null;
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
      e.dataTransfer.setData('text/plain', JSON.stringify({ src: 'roster', id: rosterItem.dataset.id }));
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
    if (data.src === 'roster') placePlayer(data.id, target.zone, target.index);
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

    // selecionar no elenco
    const item = e.target.closest('.roster-item');
    if (item) {
      const id = item.dataset.id;
      selected = (selected && selected.src === 'roster' && selected.id === id)
        ? null
        : { src: 'roster', id };
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
        placePlayer(selected.id, zone, index);
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
    }
  } catch (e) { /* estado corrompido, começa do zero */ }
  while (state.slots.length < 11) state.slots.push(null);
  while (state.bench.length < BENCH_SIZE) state.bench.push(null);
  $('#squadName').value = state.squadName;
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
    while (state.slots.length < 11) state.slots.push(null);
    while (state.bench.length < BENCH_SIZE) state.bench.push(null);
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
