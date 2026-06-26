create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  primary_color text not null default '#2dd4bf',
  business_type text,
  timezone text not null default 'America/Los_Angeles',
  is_test boolean not null default false,
  environment text not null default 'production',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'owner',
  is_test boolean not null default false,
  environment text not null default 'production',
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, user_id)
);

create table if not exists public.organization_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  google_review_url text,
  review_destination_url text,
  yelp_review_url text,
  twilio_phone_number text,
  twilio_account_sid text,
  square_location_id text,
  message_delay_minutes integer not null default 120,
  auto_send_enabled boolean not null default true,
  is_test boolean not null default false,
  environment text not null default 'production',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  phone text not null,
  first_name text,
  last_name text,
  last_payment_at timestamptz,
  last_message_at timestamptz,
  is_test boolean not null default false,
  environment text not null default 'production',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, phone)
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  source text not null,
  source_payment_id text not null,
  source_location_id text,
  amount bigint not null default 0,
  currency text not null default 'USD',
  status text not null default 'unknown',
  phone text,
  occurred_at timestamptz not null default timezone('utc', now()),
  raw_payload jsonb not null default '{}'::jsonb,
  is_test boolean not null default false,
  environment text not null default 'production',
  created_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, source, source_payment_id)
);

create table if not exists public.review_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  payment_event_id uuid not null references public.payment_events(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  tracking_token text not null default encode(gen_random_bytes(18), 'hex'),
  review_destination_url text,
  channel text not null default 'sms',
  status text not null default 'queued',
  scheduled_for timestamptz,
  reminder_scheduled_for timestamptz,
  reminder_sent_at timestamptz,
  review_prompt_clicked_at timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  replied_at timestamptz,
  is_test boolean not null default false,
  environment text not null default 'production',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.message_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  review_request_id uuid references public.review_requests(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  payment_event_id uuid references public.payment_events(id) on delete set null,
  provider text not null default 'system',
  provider_message_sid text,
  direction text not null,
  message_type text not null,
  status text not null,
  message_body text,
  error_code text,
  error_message text,
  occurred_at timestamptz not null default timezone('utc', now()),
  is_test boolean not null default false,
  environment text not null default 'production',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.feedback_responses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  review_request_id uuid not null references public.review_requests(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  payment_event_id uuid references public.payment_events(id) on delete set null,
  score integer,
  free_text text,
  sentiment_bucket text not null default 'unknown',
  owner_follow_up_required boolean not null default false,
  review_prompt_sent boolean not null default false,
  review_prompt_sent_at timestamptz,
  is_test boolean not null default false,
  environment text not null default 'production',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_org_members_user_id on public.organization_members(user_id);
create index if not exists idx_payment_events_org_occurred_at on public.payment_events(organization_id, occurred_at desc);
create index if not exists idx_review_requests_org_created_at on public.review_requests(organization_id, created_at desc);
create unique index if not exists idx_review_requests_tracking_token on public.review_requests(tracking_token);
create index if not exists idx_message_events_org_occurred_at on public.message_events(organization_id, occurred_at desc);
create index if not exists idx_feedback_org_created_at on public.feedback_responses(organization_id, created_at desc);

drop trigger if exists set_organization_settings_updated_at on public.organization_settings;
create trigger set_organization_settings_updated_at
before update on public.organization_settings
for each row execute function public.set_updated_at();

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists set_review_requests_updated_at on public.review_requests;
create trigger set_review_requests_updated_at
before update on public.review_requests
for each row execute function public.set_updated_at();

drop trigger if exists set_feedback_responses_updated_at on public.feedback_responses;
create trigger set_feedback_responses_updated_at
before update on public.feedback_responses
for each row execute function public.set_updated_at();

create or replace function public.is_org_member(target_organization_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_organization_id
      and user_id = auth.uid()
  );
$$;

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_settings enable row level security;
alter table public.customers enable row level security;
alter table public.payment_events enable row level security;
alter table public.review_requests enable row level security;
alter table public.message_events enable row level security;
alter table public.feedback_responses enable row level security;

create policy "org members can view organizations"
on public.organizations
for select
using (public.is_org_member(id));

create policy "org members can update organizations"
on public.organizations
for update
using (public.is_org_member(id))
with check (public.is_org_member(id));

create policy "users can view their memberships"
on public.organization_members
for select
using (user_id = auth.uid());

create policy "org members can view settings"
on public.organization_settings
for select
using (public.is_org_member(organization_id));

create policy "org members can write settings"
on public.organization_settings
for all
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

create policy "org members can read customers"
on public.customers
for select
using (public.is_org_member(organization_id));

create policy "org members can write customers"
on public.customers
for all
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

create policy "org members can access payment events"
on public.payment_events
for all
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

create policy "org members can access review requests"
on public.review_requests
for all
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

create policy "org members can access message events"
on public.message_events
for all
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

create policy "org members can access feedback responses"
on public.feedback_responses
for all
using (public.is_org_member(organization_id))
with check (public.is_org_member(organization_id));

create or replace function public.bootstrap_organization(
  input_name text,
  input_slug text,
  input_business_type text,
  input_primary_color text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_organization_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.organizations (
    name,
    slug,
    business_type,
    primary_color
  )
  values (
    input_name,
    input_slug,
    nullif(input_business_type, ''),
    coalesce(nullif(input_primary_color, ''), '#2dd4bf')
  )
  returning id into new_organization_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_organization_id, auth.uid(), 'owner');

  insert into public.organization_settings (organization_id)
  values (new_organization_id);

  return new_organization_id;
end;
$$;

grant execute on function public.bootstrap_organization(text, text, text, text) to authenticated;

create or replace function public.dashboard_activity(p_org_id uuid, p_days integer default 5)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with activity as (
    select
      me.id,
      me.occurred_at,
      me.message_type as event_type,
      trim(concat_ws(' ', c.first_name, c.last_name)) as customer_name,
      c.phone as customer_phone,
      me.message_body,
      me.status,
      fr.score,
      fr.sentiment_bucket
    from public.message_events me
    left join public.customers c on c.id = me.customer_id
    left join public.feedback_responses fr on fr.review_request_id = me.review_request_id
    where me.organization_id = p_org_id
      and me.occurred_at >= timezone('utc', now()) - make_interval(days => p_days)
    order by me.occurred_at desc
    limit 25
  )
  select coalesce(jsonb_agg(to_jsonb(activity)), '[]'::jsonb)
  from activity;
$$;

create or replace function public.dashboard_feedback(p_org_id uuid, p_days integer default 5)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with feedback as (
    select
      fr.id,
      fr.created_at as occurred_at,
      case
        when fr.sentiment_bucket = 'positive' then 'feedback_positive'
        when fr.sentiment_bucket = 'negative' then 'feedback_negative'
        else 'feedback_unknown'
      end as event_type,
      trim(concat_ws(' ', c.first_name, c.last_name)) as customer_name,
      c.phone as customer_phone,
      fr.free_text as message_body,
      null::text as status,
      fr.score,
      fr.sentiment_bucket
    from public.feedback_responses fr
    left join public.customers c on c.id = fr.customer_id
    where fr.organization_id = p_org_id
      and fr.created_at >= timezone('utc', now()) - make_interval(days => p_days)
    order by fr.created_at desc
    limit 25
  )
  select coalesce(jsonb_agg(to_jsonb(feedback)), '[]'::jsonb)
  from feedback;
$$;

create or replace function public.dashboard_summary(p_org_id uuid, p_days integer default 5)
returns jsonb
language sql
security definer
set search_path = public
as $$
with windowed_payment_events as (
  select *
  from public.payment_events
  where organization_id = p_org_id
    and occurred_at >= timezone('utc', now()) - make_interval(days => p_days)
),
windowed_review_requests as (
  select *
  from public.review_requests
  where organization_id = p_org_id
    and created_at >= timezone('utc', now()) - make_interval(days => p_days)
),
windowed_message_events as (
  select *
  from public.message_events
  where organization_id = p_org_id
    and occurred_at >= timezone('utc', now()) - make_interval(days => p_days)
),
windowed_feedback as (
  select *
  from public.feedback_responses
  where organization_id = p_org_id
    and created_at >= timezone('utc', now()) - make_interval(days => p_days)
),
daily_series as (
  select generate_series(
    current_date - greatest(p_days - 1, 0),
    current_date,
    interval '1 day'
  )::date as day
),
daily_metrics as (
  select
    ds.day,
    coalesce((select count(*) from windowed_payment_events pe where pe.occurred_at::date = ds.day), 0) as payments,
    coalesce((select count(*) from windowed_payment_events pe where pe.occurred_at::date = ds.day and pe.phone is not null and pe.phone <> ''), 0) as eligible_customers,
    coalesce((select count(*) from windowed_message_events me where me.occurred_at::date = ds.day and me.direction = 'outbound' and me.message_type <> 'sms_send_attempted'), 0) as sent,
    coalesce((select count(*) from windowed_message_events me where me.occurred_at::date = ds.day and me.message_type = 'sms_delivered'), 0) as delivered,
    coalesce((select count(*) from windowed_message_events me where me.occurred_at::date = ds.day and me.direction = 'inbound'), 0) as replies,
    coalesce((select count(*) from windowed_feedback fr where fr.created_at::date = ds.day and fr.sentiment_bucket = 'positive'), 0) as positive,
    coalesce((select count(*) from windowed_feedback fr where fr.created_at::date = ds.day and fr.review_prompt_sent), 0) as review_prompts,
    coalesce((select count(*) from windowed_message_events me where me.occurred_at::date = ds.day and me.message_type = 'sms_failed'), 0) as failures
  from daily_series ds
),
totals as (
  select jsonb_build_object(
    'paymentEvents', (select count(*) from windowed_payment_events),
    'eligibleCustomers', (select count(*) from windowed_payment_events where phone is not null and phone <> ''),
    'messagesQueued', (select count(*) from windowed_review_requests),
    'messagesSent', (select count(*) from windowed_message_events where direction = 'outbound' and message_type <> 'sms_send_attempted'),
    'messagesDelivered', (select count(*) from windowed_message_events where message_type = 'sms_delivered'),
    'messageFailures', (select count(*) from windowed_message_events where message_type = 'sms_failed'),
    'repliesReceived', (select count(*) from windowed_message_events where direction = 'inbound'),
    'replyRate', coalesce(
      (select count(*)::numeric from windowed_message_events where direction = 'inbound')
      / nullif((select count(*)::numeric from windowed_message_events where message_type = 'sms_delivered'), 0),
      0
    ),
    'positiveReplies', (select count(*) from windowed_feedback where sentiment_bucket = 'positive'),
    'positiveRate', coalesce(
      (select count(*)::numeric from windowed_feedback where sentiment_bucket = 'positive')
      / nullif((select count(*)::numeric from windowed_feedback), 0),
      0
    ),
    'negativeReplies', (select count(*) from windowed_feedback where sentiment_bucket = 'negative'),
    'recoveryNeeded', (select count(*) from windowed_feedback where owner_follow_up_required),
    'reviewPromptsSent', (select count(*) from windowed_feedback where review_prompt_sent),
    'reviewPromptRate', coalesce(
      (select count(*)::numeric from windowed_feedback where review_prompt_sent)
      / nullif((select count(*)::numeric from windowed_feedback), 0),
      0
    ),
    'avgResponseTimeMinutes', coalesce((
      select avg(extract(epoch from (replied_at - sent_at)) / 60.0)
      from windowed_review_requests
      where sent_at is not null and replied_at is not null
    ), 0)
  ) as value
),
negative_feedback as (
  select
    fr.id,
    fr.created_at as occurred_at,
    'feedback_negative'::text as event_type,
    trim(concat_ws(' ', c.first_name, c.last_name)) as customer_name,
    c.phone as customer_phone,
    fr.free_text as message_body,
    null::text as status,
    fr.score,
    fr.sentiment_bucket
  from windowed_feedback fr
  left join public.customers c on c.id = fr.customer_id
  where fr.sentiment_bucket = 'negative'
  order by fr.created_at desc
  limit 10
),
positive_feedback as (
  select
    fr.id,
    fr.created_at as occurred_at,
    'feedback_positive'::text as event_type,
    trim(concat_ws(' ', c.first_name, c.last_name)) as customer_name,
    c.phone as customer_phone,
    fr.free_text as message_body,
    null::text as status,
    fr.score,
    fr.sentiment_bucket
  from windowed_feedback fr
  left join public.customers c on c.id = fr.customer_id
  where fr.sentiment_bucket = 'positive'
  order by fr.created_at desc
  limit 10
),
failure_reasons as (
  select
    coalesce(nullif(error_message, ''), nullif(error_code, ''), 'Unknown delivery issue') as reason,
    count(*) as count
  from windowed_message_events
  where message_type = 'sms_failed'
  group by 1
  order by count desc
  limit 5
)
select jsonb_build_object(
  'totals', (select value from totals),
  'daily', coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'date', day,
        'payments', payments,
        'eligibleCustomers', eligible_customers,
        'sent', sent,
        'delivered', delivered,
        'replies', replies,
        'positive', positive,
        'reviewPrompts', review_prompts,
        'failures', failures
      )
      order by day
    )
    from daily_metrics
  ), '[]'::jsonb),
  'recentActivity', public.dashboard_activity(p_org_id, p_days),
  'negativeFeedback', coalesce((select jsonb_agg(to_jsonb(negative_feedback)) from negative_feedback), '[]'::jsonb),
  'positiveCustomers', coalesce((select jsonb_agg(to_jsonb(positive_feedback)) from positive_feedback), '[]'::jsonb),
  'topFailureReasons', coalesce((
    select jsonb_agg(jsonb_build_object('reason', reason, 'count', count))
    from failure_reasons
  ), '[]'::jsonb)
);
$$;

grant execute on function public.dashboard_activity(uuid, integer) to authenticated;
grant execute on function public.dashboard_feedback(uuid, integer) to authenticated;
grant execute on function public.dashboard_summary(uuid, integer) to authenticated;
