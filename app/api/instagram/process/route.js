// Keep a cheap tombstone for old scheduler invocations until all triggers stop.
export function POST() {
  return Response.json({ error: 'Instagram scheduling has been removed.' }, { status: 410 })
}
