export default {
  // No outgoing requests, including events already queued before cron removal.
  async scheduled() {},
  async fetch() {
    return new Response('Instagram scheduling has been removed.', { status: 410 })
  },
}
