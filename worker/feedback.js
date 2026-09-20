/**
 * BGM Forge「意見を送る」中継（Cloudflare Worker）
 *
 * ページは静的で、GitHub Pages に置いてあり、単体版は20MBのHTMLとして配布している。
 * Discord の Webhook URL をページに書くと、公開リポジトリにも配布済みのHTMLにも平文で
 * 焼き付く。荒らされて Webhook を作り直すと、配った全部のファイルが黙って壊れる。
 * そこで Worker を1枚挟み、Webhook は Worker の環境変数（秘密）に置く。
 * ページが知っているのは、この Worker のURLだけ。これは公開されてよい。
 *
 * 置き方
 *   1. wrangler deploy
 *   2. npx wrangler secret put DISCORD_WEBHOOK   ← Discord の Webhook URL を貼る
 *   3. 出てきた Worker のURLを bgm_forge.html の
 *      <meta name="feedback-endpoint" content="..."> に書く（秘密ではない）
 *   4. ALLOWED_ORIGINS を公開先に合わせる（環境変数。カンマ区切り）
 */

const MAX_LENGTH = 2000;     // フォーム本文の上限
const COOLDOWN_SECONDS = 60; // 同じ相手からの連投をこの秒数だけ待たせる

const cors = origin => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
});

const reply = (body, status, origin) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...cors(origin) },
  });

/** @everyone や role メンションを文字として残す。通知は allowed_mentions でも止める（二重の備え）。 */
const defuse = text => text.replace(/@(everyone|here)/gi, '@​$1').replace(/<@[!&]?(\d+)>/g, '<@​$1>');

export default {
  async fetch(request, env) {
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const origin = request.headers.get('Origin') || '';
    const ok = allowed.includes(origin) ? origin : '';

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(ok) });
    if (request.method !== 'POST') return reply({ ok: false, error: 'method' }, 405, ok);
    if (!ok) return reply({ ok: false, error: 'origin' }, 403, '');
    if (!env.DISCORD_WEBHOOK) return reply({ ok: false, error: 'not-configured' }, 503, ok);

    const body = await request.json().catch(() => null);
    if (!body) return reply({ ok: false, error: 'body' }, 400, ok);
    // 罠の欄。人には見えないので、埋まっていたら機械。黙って成功を返して捨てる。
    if (body.hp) return reply({ ok: true }, 200, ok);

    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) return reply({ ok: false, error: 'empty' }, 400, ok);
    if (text.length > MAX_LENGTH) return reply({ ok: false, error: 'too-long' }, 413, ok);

    const types = {bug: ['🐛 不具合報告', 0xef6464], request: ['✨ 機能・改善の要望', 0x10b981], impression: ['💬 感想', 0x6387ed]};
    const type = body.type === undefined ? 'impression' : body.type;
    if (typeof type !== 'string' || !Object.hasOwn(types, type)) return reply({ok:false,error:'type'},400,ok);
    const contact = typeof body.contact === 'string' ? body.contact.trim() : '';
    if (body.reply === true && (!contact || contact.length > 200)) return reply({ok:false,error:'contact'},400,ok);
    const safe = (value, max) => defuse(typeof value === 'string' ? value : '').slice(0,max);
    const fields = [{name:'User Agent',value:safe(body.userAgent,1024) || '未取得'}];
    if (body.reply === true) fields.push({name:'個別回答を希望・連絡先',value:safe(contact,300)});
    const embed = {title:types[type][0],color:types[type][1],description:safe(text,4000),fields,
      footer:{text:'BGM Forge · '+(safe(body.version,80)||'バージョン不明')},timestamp:new Date().toISOString()};

    // 連投を抑える。Cache API を使うので追加の設定は要らない（拠点ごとの抑制で、荒らしの
    // 完全な遮断ではない。本気の対策は Cloudflare 側の Rate limiting ルールで足すこと）。
    const ip = request.headers.get('CF-Connecting-IP') || '0';
    const key = new Request('https://feedback.invalid/seen/' + encodeURIComponent(ip));
    if (await caches.default.match(key)) return reply({ ok: false, error: 'cooldown' }, 429, ok);

    const webhook = new URL(env.DISCORD_WEBHOOK);
    webhook.searchParams.set('wait','true');
    const sent = await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: 'BGM Forge',
        embeds: [embed],
        allowed_mentions: { parse: [] },   // 誰にも通知を飛ばさない
      }),
    });
    if (!sent.ok) return reply({ ok: false, error: 'upstream' }, 502, ok);

    await caches.default.put(key, new Response('1', {
      headers: { 'cache-control': 'max-age=' + COOLDOWN_SECONDS },
    }));
    return reply({ ok: true }, 200, ok);
  },
};
