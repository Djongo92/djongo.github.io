// Lets module-level functions that aren't React hooks (recordRun,
// saveRoast/saveCompetitor/etc. in useBattlePlanCache, and every other
// localStorage hook's standalone write() function) know the current real
// user without becoming a hook themselves — updated by useAuth's own
// session listener, read by src/lib/serverStateSync.ts.
let currentUserId: string | null = null;
let currentAccessToken: string | null = null;

export function setCurrentUser(userId: string | null, accessToken: string | null) {
  currentUserId = userId;
  currentAccessToken = accessToken;
}

export function getCurrentUser() {
  return { userId: currentUserId, accessToken: currentAccessToken };
}
