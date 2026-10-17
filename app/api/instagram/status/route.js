export function GET() {
  return Response.json({ connected: false, removed: true }, { status: 410 })
}
