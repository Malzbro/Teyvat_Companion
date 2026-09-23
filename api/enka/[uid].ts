// Vercel serverless function: GET /api/enka/:uid → Enka.Network showcase data.
// Caches each UID for the `ttl` Enka returns and sets a descriptive User-Agent, as Enka asks.

const USER_AGENT = 'teyvat-companion/1.0 (personal gift app; one player)'
const cache = new Map<string, { body: string; status: number; expires: number }>()

const json = (body: string, status: number, maxAge = 0) =>
  new Response(body, {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': maxAge > 0 ? `public, s-maxage=${maxAge}, max-age=${maxAge}` : 'no-store',
    },
  })

export async function GET(request: Request): Promise<Response> {
  const uid = new URL(request.url).pathname.split('/').filter(Boolean).pop() ?? ''
  if (!/^\d{9,10}$/.test(uid)) return json(JSON.stringify({ message: 'Wrong UID format' }), 400)

  const hit = cache.get(uid)
  if (hit && hit.expires > Date.now())
    return json(hit.body, hit.status, Math.ceil((hit.expires - Date.now()) / 1000))

  let res: Response
  try {
    res = await fetch(`https://enka.network/api/uid/${uid}`, {
      headers: { 'user-agent': USER_AGENT, accept: 'application/json' },
    })
  } catch {
    return json(JSON.stringify({ message: "Couldn't reach Enka.Network" }), 502)
  }
  const body = await res.text()
  if (!res.ok)
    return json(body || JSON.stringify({ message: `Enka error ${res.status}` }), res.status)

  let ttl: number
  try {
    ttl = Math.max(1, Number(JSON.parse(body).ttl) || 60)
  } catch {
    return json(JSON.stringify({ message: 'Enka sent something unexpected' }), 502)
  }
  cache.set(uid, { body, status: 200, expires: Date.now() + ttl * 1000 })
  return json(body, 200, ttl)
}
