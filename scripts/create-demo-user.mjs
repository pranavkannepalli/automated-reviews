import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const envPath = path.join(process.cwd(), "apps/web/.env.local");
const envText = fs.readFileSync(envPath, "utf8");
const env = Object.fromEntries(
  envText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);

const mergedEnv = {
  ...env,
  ...process.env,
};

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error("Usage: node scripts/create-demo-user.mjs <email> <password>");
  process.exit(1);
}

const supabase = createClient(mergedEnv.NEXT_PUBLIC_SUPABASE_URL, mergedEnv.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (error && !error.message.toLowerCase().includes("already been registered")) {
  throw error;
}

if (data?.user) {
  console.log(`Created user ${data.user.email}`);
} else {
  console.log(`User ${email} already exists`);
}
