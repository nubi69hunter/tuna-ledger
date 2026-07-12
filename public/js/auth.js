// ---- Supabase Auth client ----
const Auth = (() => {
  let clientPromise = null;

  function getClient() {
    if (!clientPromise) {
      clientPromise = fetch('/api/config')
        .then(r => r.json())
        .then(({ url, anonKey }) => {
          if (!url || !anonKey) throw new Error('Supabase config missing url/anonKey');
          return window.supabase.createClient(url, anonKey);
        })
        .catch(err => { clientPromise = null; throw err; }); // don't cache a failure forever
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

  // Redirect to /login if there's no session (or if session lookup fails —
  // safest default when we can't tell); otherwise return it.
  async function guard() {
    try {
      const session = await getSession();
      if (!session) { location.href = '/login'; return null; }
      return session;
    } catch (err) {
      console.error('Auth.guard failed:', err);
      location.href = '/login';
      return null;
    }
  }

  return { getClient, getSession, getAccessToken, signUp, signIn, signInWithGoogle, signOut, guard };
})();
window.Auth = Auth;
