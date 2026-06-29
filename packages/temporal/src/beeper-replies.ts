export type BeeperInboundMessage = {
  id: string;
  isSender: boolean;
  timestamp: string;
  text?: string;
};

const BEEPER_POLLING_TERMINAL_STATUSES = new Set([
  "awaiting_follow_up",
  "responded",
  "review_prompt_sent",
]);

export function isBeeperPollingTerminalStatus(status: string | null | undefined) {
  return Boolean(status && BEEPER_POLLING_TERMINAL_STATUSES.has(status));
}

export function getNextBeeperInboundReply(
  messages: BeeperInboundMessage[],
  seenIds: Set<string>,
) {
  const next = messages
    .filter((message) => !message.isSender && message.text && !seenIds.has(message.id))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0];

  return next ?? null;
}
