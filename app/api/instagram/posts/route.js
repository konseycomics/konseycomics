function removed() {
  return Response.json({ error: 'Instagram scheduling has been removed.' }, { status: 410 })
}

export { removed as GET, removed as POST }
