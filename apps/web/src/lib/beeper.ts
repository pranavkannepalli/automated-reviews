import {
  buildBeeperStartChatInput,
  getBeeperPendingMessageId,
  pickBeeperAccountID,
} from "@automated-reviews/core";

const DEFAULT_BEEPER_API_URL = "http://127.0.0.1:23373";

function getBeeperApiUrl() {
  return process.env.BEEPER_API_URL ?? DEFAULT_BEEPER_API_URL;
}

async function beeperRequest(path: string, body: Record<string, unknown>) {
  const token = process.env.BEEPER_ACCESS_TOKEN;
  if (!token) {
    throw new Error("BEEPER_ACCESS_TOKEN is required to send via Beeper.");
  }

  const response = await fetch(`${getBeeperApiUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Beeper API ${path} failed with ${response.status}: ${text}`);
  }

  return response.json();
}

async function beeperGet(path: string) {
  const token = process.env.BEEPER_ACCESS_TOKEN;
  if (!token) {
    throw new Error("BEEPER_ACCESS_TOKEN is required to send via Beeper.");
  }

  const response = await fetch(`${getBeeperApiUrl()}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Beeper API ${path} failed with ${response.status}: ${text}`);
  }

  return response.json();
}

async function resolveBeeperAccountID() {
  const configuredAccountID = process.env.BEEPER_ACCOUNT_ID;
  const accounts = (await beeperGet("/v1/accounts")) as Array<{
    accountID: string;
    network?: string;
    status?: string;
    bridge?: { id?: string; type?: string };
  }>;
  const accountID = pickBeeperAccountID(accounts, configuredAccountID);

  if (!accountID) {
    throw new Error(
      "No connected Beeper WhatsApp account found. Set BEEPER_ACCOUNT_ID to a connected account.",
    );
  }

  return accountID;
}

// Resolves (or starts) a direct WhatsApp chat with a phone number.
async function startDirectChat(phoneNumber: string) {
  const accountID = await resolveBeeperAccountID();
  const chat = await beeperRequest("/v1/chats/start", buildBeeperStartChatInput(phoneNumber, accountID));

  return chat.chatID as string;
}

export async function sendBeeperMessage({ to, body }: { to: string; body: string }) {
  const chatID = await startDirectChat(to);
  const message = await beeperRequest(`/v1/chats/${chatID}/messages`, { text: body });

  return {
    sid: getBeeperPendingMessageId(message as { pendingMessageID?: string; messageID?: string }),
    status: "sent",
  };
}
