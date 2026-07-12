// ---- Supabase Auth client ----
const Auth = (() => {
  let clientPromise = null;

  function getClient() {
    if (!clientPromise) {
      clientPromise = fetch('/api/config')
        .then(r => r.json())
        .then(({ url, anonKey }) => window.supabase.createClient(url, anonKey));
    }
    return clientPromise;
  }

  async function getSession() {
    const client = await getClient();
    const { data: { session } } = await client.auth.getSession();
    return session;
  }

  async function getAccessToken() {
    const session = await getSession();
    return session ? session.access_token : null;
  }

  async function signUp(email, password) {
    const client = await getClient();
    return client.auth.signUp({ email, password });
  }

  async function signIn(email, password) {
    const client = await getClient();
    return client.auth.signInWithPassword({ email, password });
  }

  async function signInWithGoogle() {
    const client = await getClient();
    return client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  }

  async function signOut() {
    const client = await getClient();
    await client.auth.signOut();
    location.href = '/login';
  }

  // Redirect to /login if there's no session; otherwise return it.
  async function guard() {
    const session = await getSession();
    if (!session) { location.href = '/login'; return null; }
    return session;
  }

  return { getClient, getSession, getAccessToken, signUp, signIn, signInWithGoogle, signOut, guard };
})();
window.Auth = Auth;
