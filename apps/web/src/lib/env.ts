const requiredClientEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

export function hasSupabaseEnv() {
  return requiredClientEnv.every((key) => Boolean(process.env[key]));
}

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  return { url, anonKey };
}

export function getServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function hasTwilioEnv() {
  return Boolean(process.env.TWILIO_AUTH_TOKEN);
}

export function hasBeeperEnv() {
  return Boolean(process.env.BEEPER_ACCESS_TOKEN);
}
