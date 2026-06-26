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

// Resolves (or starts) a direct chat with a phone number on whichever bridged
// network (iMessage/SMS/etc.) Beeper Desktop picks for that contact.
async function startDirectChat(phoneNumber: string) {
  const accountID = process.env.BEEPER_ACCOUNT_ID;
  const chat = await beeperRequest("/v1/chats", {
    mode: "start",
    phoneNumber,
    ...(accountID ? { accountID } : {}),
  });

  return chat.chatID as string;
}

export async function sendBeeperMessage({ to, body }: { to: string; body: string }) {
  const chatID = await startDirectChat(to);
  const message = await beeperRequest(`/v1/chats/${chatID}/messages`, { text: body });

  return {
    sid: (message.messageID as string | undefined) ?? null,
    status: "sent",
  };
}
