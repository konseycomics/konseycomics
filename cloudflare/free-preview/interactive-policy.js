const POSTS = new Set([
  '/api/community/topics', '/api/community/topics/manage', '/api/community/replies',
  '/api/community/reactions/toggle', '/api/community/polls/vote', '/api/community/reports',
  '/api/community/moderation', '/api/community/views', '/api/comments/delete',
  '/api/notifications/new-chapter', '/api/leaderboard/sync', '/api/onboarding/reward',
  '/api/series-views', '/api/chapter-views',
])

export function allowsInteractiveApi(path, method, env) {
  if (env.KONSEY_PREVIEW_ACCOUNTS !== '1' || env.KONSEY_PREVIEW_INTERACTIVE !== '1') return false
  return method === 'POST' && POSTS.has(path)
    || method === 'GET' && path === '/api/community/moderation'
}

export function isLiveForum(path, env) {
  return env.KONSEY_PREVIEW_INTERACTIVE === '1' && /^\/(forum|topluluk)(\/|$)/.test(path)
}

export function needsInteractiveSession(path) {
  return !['/api/community/views', '/api/series-views', '/api/chapter-views', '/api/onboarding/reward'].includes(path)
}
