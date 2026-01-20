import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const REMEMBER_KEY = "ledgerleaf_remember";

const storage = {
  getItem(key) {
    const remember = localStorage.getItem(REMEMBER_KEY);
    const store = remember === "0" ? sessionStorage : localStorage;
    return store.getItem(key);
  },
  setItem(key, value) {
    const remember = localStorage.getItem(REMEMBER_KEY);
    const store = remember === "0" ? sessionStorage : localStorage;
    store.setItem(key, value);
  },
  removeItem(key) {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  }
};

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn("Supabase env vars missing: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true, storage }
});
