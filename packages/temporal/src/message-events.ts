type MessageEventsInsertError = {
  code?: string;
  message?: string;
};

type MessageEventsInsertResult = {
  error: MessageEventsInsertError | null;
};

type MessageEventsSupabaseLike = {
  from(table: "message_events"): {
    insert(payload: Record<string, unknown>): Promise<MessageEventsInsertResult>;
  };
};

function isUniqueViolation(error: MessageEventsInsertError | null) {
  return error?.code === "23505";
}

export async function insertMessageEvent(
  supabase: MessageEventsSupabaseLike,
  payload: Record<string, unknown>,
) {
  const { error } = await supabase.from("message_events").insert(payload);

  if (error) {
    throw error;
  }
}

export async function claimInboundBeeperMessage(
  supabase: MessageEventsSupabaseLike,
  payload: Record<string, unknown>,
) {
  const { error } = await supabase.from("message_events").insert(payload);

  if (!error) {
    return true;
  }

  if (isUniqueViolation(error)) {
    return false;
  }

  throw error;
}
