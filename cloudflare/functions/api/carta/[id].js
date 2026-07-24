/*
 * /api/carta/<id> — imagem da carta guardada no KV.
 *
 * GET devolve o JPEG. PUT envia um novo (exige X-Senha).
 *
 * Serve para a carta recém-recortada no admin aparecer para todo mundo na hora,
 * sem precisar commitar o arquivo. O id vem com um sufixo único a cada envio,
 * então dá para deixar o cache eterno.
 */

const LIMITE = 1024 * 1024;   // 1 MB por carta — o recorte fica em torno de 90 KB

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Senha',
  'Access-Control-Max-Age': '86400',
};

const chaveDe = id => 'realtismo:carta:' + id;

const erro = (msg, status) =>
  new Response(JSON.stringify({ erro: msg }), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ params, env }) {
  if (!env.REALTISMO) return erro('KV nao ligado ao projeto', 503);

  const bytes = await env.REALTISMO.get(chaveDe(params.id), 'arrayBuffer');
  if (!bytes) return erro('Carta nao encontrada', 404);

  return new Response(bytes, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
      ...CORS,
    },
  });
}

export async function onRequestPut({ params, request, env }) {
  if (!env.REALTISMO)   return erro('KV nao ligado ao projeto', 503);
  if (!env.ADMIN_SENHA) return erro('ADMIN_SENHA nao configurada', 503);

  if (request.headers.get('X-Senha') !== env.ADMIN_SENHA) {
    return erro('Senha incorreta', 401);
  }
  if (!/^[a-z0-9-]{3,80}$/.test(params.id)) {
    return erro('Id de carta invalido', 400);
  }

  const bytes = await request.arrayBuffer();
  if (bytes.byteLength === 0)      return erro('Corpo vazio', 400);
  if (bytes.byteLength > LIMITE)   return erro('Imagem maior que 1 MB', 413);

  await env.REALTISMO.put(chaveDe(params.id), bytes);

  return new Response(JSON.stringify({ ok: true, id: params.id, bytes: bytes.byteLength }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}
