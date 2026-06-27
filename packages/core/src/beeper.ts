type BeeperAccountLike = {
  accountID: string;
  network?: string;
  status?: string;
  bridge?: {
    id?: string;
    type?: string;
  };
};

function isConnected(account: BeeperAccountLike) {
  return account.status === undefined || account.status === "connected";
}

function isWhatsAppAccount(account: BeeperAccountLike) {
  const network = account.network?.toLowerCase();
  const bridgeId = account.bridge?.id?.toLowerCase();
  const bridgeType = account.bridge?.type?.toLowerCase();
  const accountID = account.accountID.toLowerCase();

  return (
    network === "whatsapp" ||
    bridgeId === "whatsapp" ||
    bridgeType === "whatsapp" ||
    accountID === "whatsapp"
  );
}

export function pickBeeperAccountID(
  accounts: BeeperAccountLike[],
  preferredAccountID?: string | null,
) {
  if (preferredAccountID) {
    const preferred = accounts.find(
      (account) => account.accountID === preferredAccountID && isConnected(account),
    );
    if (preferred) {
      return preferred.accountID;
    }
  }

  const whatsapp = accounts.find((account) => isConnected(account) && isWhatsAppAccount(account));
  return whatsapp?.accountID ?? null;
}

export function buildBeeperStartChatInput(phoneNumber: string, accountID: string) {
  return {
    accountID,
    user: {
      phoneNumber,
    },
  };
}

export function getBeeperPendingMessageId(payload: {
  pendingMessageID?: string;
  messageID?: string;
}) {
  return payload.pendingMessageID ?? payload.messageID ?? null;
}
