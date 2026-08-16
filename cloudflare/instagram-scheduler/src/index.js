const worker = {
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(processQueue(env))
  },
  async fetch(request, env) {
    if (new URL(request.url).pathname !== '/run') return new Response('Not found', { status: 404 })
    return processQueue(env)
  },
}

export default worker

async function processQueue(env) {
  if (!env.PROCESS_URL || !env.CRON_SECRET) return new Response('Missing Worker configuration', { status: 500 })
  const response = await fetch(env.PROCESS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
  })
  return new Response(await response.text(), {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
  })
}
