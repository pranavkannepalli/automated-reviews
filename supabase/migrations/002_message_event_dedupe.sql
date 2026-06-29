delete from public.message_events me
using public.message_events newer
where me.review_request_id = newer.review_request_id
  and me.provider = newer.provider
  and me.direction = newer.direction
  and me.provider_message_sid = newer.provider_message_sid
  and me.provider_message_sid is not null
  and (
    me.created_at < newer.created_at
    or (me.created_at = newer.created_at and me.id < newer.id)
  );

create unique index if not exists idx_message_events_request_provider_direction_sid
on public.message_events(review_request_id, provider, direction, provider_message_sid)
where provider_message_sid is not null;
