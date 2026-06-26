import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { getServiceRoleKey, getSupabaseEnv } from "./env";

export type Database = unknown;

let browserClient: ReturnType<typeof createBrowserClient> | null = null;
let adminClient: ReturnType<typeof createClient> | null = null;

export function createSupabaseBrowserClient() {
  if (!browserClient) {
    const { url, anonKey } = getSupabaseEnv();
    browserClient = createBrowserClient(url, anonKey);
  }

  return browserClient;
}

export async function createSupabaseServerClient() {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(entries) {
        try {
          entries.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components may not be allowed to mutate cookies.
        }
      },
    },
  });
}

export function createSupabaseAdminClient() {
  if (!adminClient) {
    const { url } = getSupabaseEnv();
    const serviceRoleKey = getServiceRoleKey();

    if (!serviceRoleKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for server webhooks.");
    }

    adminClient = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}
