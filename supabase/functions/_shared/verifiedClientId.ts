// client_id has always been trusted verbatim from the request body — fine
// when it was only ever a random per-browser id nobody else could guess.
// Now that a real account's client_id is auth.uid() (see
// visibility-audit-claim), that trust would let anyone read or write another
// user's audit just by sending their id. So whenever a real access token is
// supplied, it — not the client-asserted clientId — decides identity;
// anonymous callers (no token) keep the original trust model unchanged.
// deno-lint-ignore no-explicit-any
export async function resolveClientId(serviceClient: any, clientId: string, accessToken?: unknown): Promise<string> {
  if (!accessToken || typeof accessToken !== "string") return clientId;
  const { data, error } = await serviceClient.auth.getUser(accessToken);
  if (error || !data?.user) return clientId;
  return data.user.id;
}
