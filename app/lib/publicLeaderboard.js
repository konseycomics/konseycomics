import { unstable_cache } from 'next/cache'
import { getLeaderboards } from './leaderboardData'

// Only public leaderboard fields are cached; award synchronization stays uncached.
export const getPublicLeaderboards = unstable_cache(
  () => getLeaderboards(),
  ['public-leaderboards-v1'],
  { revalidate: 300 }
)
