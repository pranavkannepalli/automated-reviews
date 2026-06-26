#!/usr/bin/env node
// Sanity-check the Beeper Desktop API integration directly -- no app, DB,
// Temporal, or Docker involved. Mirrors exactly what lib/beeper.ts does.
//
// Usage:
//   BEEPER_ACCESS_TOKEN=xxx node scripts/test-beeper-send.mjs +15551234567 "test message"
//
// Optional env vars: BEEPER_API_URL (default http://127.0.0.1:23373),
// BEEPER_ACCOUNT_ID (which bridged network/account to send from).

const baseUrl = process.env.BEEPER_API_URL ?? "http://127.0.0.1:23373";
const token = process.env.BEEPER_ACCESS_TOKEN;
const accountId = process.env.BEEPER_ACCOUNT_ID;
const [to, ...rest] = process.argv.slice(2);
const body = rest.join(" ") || "Test message from automated-reviews.";

if (!token) {
  console.error("Set BEEPER_ACCESS_TOKEN first.");
  process.exit(1);
}

if (!to) {
  console.error("Usage: node scripts/test-beeper-send.mjs <phone-number-e164> [message]");
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
};

async function main() {
  console.log(`Resolving chat for ${to} via ${baseUrl} ...`);
  const chatRes = await fetch(`${baseUrl}/v1/chats`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      mode: "start",
      phoneNumber: to,
      ...(accountId ? { accountID: accountId } : {}),
    }),
  });
  const chatText = await chatRes.text();
  if (!chatRes.ok) {
    console.error(`Chat lookup failed (${chatRes.status}): ${chatText}`);
    process.exit(1);
  }
  const chat = JSON.parse(chatText);
  console.log("Chat:", chat);

  console.log(`Sending message to chat ${chat.chatID} ...`);
  const sendRes = await fetch(`${baseUrl}/v1/chats/${chat.chatID}/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({ text: body }),
  });
  const sendText = await sendRes.text();
  if (!sendRes.ok) {
    console.error(`Send failed (${sendRes.status}): ${sendText}`);
    process.exit(1);
  }
  console.log("Sent:", JSON.parse(sendText));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
