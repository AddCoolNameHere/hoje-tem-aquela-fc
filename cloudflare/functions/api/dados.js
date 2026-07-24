/*
 * /api/dados — os dados compartilhados do clube (divisão + elenco).
 *
 * GET  devolve o que está publicado. Se ninguém publicou ainda, devolve { vazio: true }
 *      e o site cai de volta nos arquivos JSON do repositório.
 * POST publica. Exige o cabeçalho X-Senha igual à variável de ambiente ADMIN_SENHA.
 *
 * Precisa do KV com o nome REALTISMO ligado ao projeto do Pages.
 */

const CHAVE = 'realtismo:dados';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Senha',
  'Access-Control-Max-Age': '86400',
};

const json = (corpo, status = 200) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...CORS },
  });

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ env }) {
  if (!env.REALTISMO) return json({ vazio: true, aviso: 'KV nao ligado ao projeto' });

  const bruto = await env.REALTISMO.get(CHAVE);
  if (!bruto) return json({ vazio: true });

  try {
    return json(JSON.parse(bruto));
  } catch {
    return json({ vazio: true, aviso: 'dado guardado invalido' });
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.REALTISMO)    return json({ erro: 'KV nao ligado ao projeto' }, 503);
  if (!env.ADMIN_SENHA)  return json({ erro: 'ADMIN_SENHA nao configurada' }, 503);

  if (request.headers.get('X-Senha') !== env.ADMIN_SENHA) {
    return json({ erro: 'Senha incorreta' }, 401);
  }

  let corpo;
  try { corpo = await request.json(); }
  catch { return json({ erro: 'JSON invalido' }, 400); }

  if (!corpo || typeof corpo.club !== 'object' || !Array.isArray(corpo.players)) {
    return json({ erro: 'Esperado { club: {...}, players: [...] }' }, 400);
  }
  if (corpo.players.length > 200) {
    return json({ erro: 'Elenco grande demais' }, 400);
  }

  const dados = {
    club: corpo.club,
    players: corpo.players,
    atualizadoEm: new Date().toISOString(),
  };

  await env.REALTISMO.put(CHAVE, JSON.stringify(dados));
  return json({ ok: true, atualizadoEm: dados.atualizadoEm, jogadores: dados.players.length });
}
