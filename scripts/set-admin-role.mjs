#!/usr/bin/env node
/**
 * Usage: node scripts/set-admin-role.mjs <email>
 * Sets app_metadata.role = "admin" for the given Supabase user.
 */

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/set-admin-role.mjs <email>");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
  );
  process.exit(1);
}

// 1. Look up user by email
const listRes = await fetch(
  `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`,
  { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } }
);

if (!listRes.ok) {
  const body = await listRes.text();
  console.error("Failed to list users:", body);
  process.exit(1);
}

const { users } = await listRes.json();
const user = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

if (!user) {
  console.error(`No user found with email: ${email}`);
  console.error(`Existing users: ${users.map((u) => u.email).join(", ") || "(none)"}`);
  process.exit(1);
}

// 2. Set app_metadata.role = "admin"
const updateRes = await fetch(
  `${supabaseUrl}/auth/v1/admin/users/${user.id}`,
  {
    method: "PUT",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ app_metadata: { ...user.app_metadata, role: "admin" } }),
  }
);

if (!updateRes.ok) {
  const body = await updateRes.text();
  console.error("Failed to update user:", body);
  process.exit(1);
}

const updated = await updateRes.json();
console.log(`✅ Done! ${updated.email} is now an admin.`);
console.log(`   app_metadata:`, updated.app_metadata);
