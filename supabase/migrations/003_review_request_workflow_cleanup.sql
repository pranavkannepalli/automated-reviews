create or replace function public.mark_review_request_workflow_terminated(
  input_review_request_id uuid,
  input_cleanup_reason text default 'Temporal workflow terminated.'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.review_requests%rowtype;
begin
  select *
  into request_row
  from public.review_requests
  where id = input_review_request_id
  for update;

  if not found then
    return false;
  end if;

  if request_row.status not in ('queued', 'sent', 'delivered', 'awaiting_follow_up', 'review_prompt_sent', 'review_reminder_sent') then
    return false;
  end if;

  update public.review_requests
  set status = 'workflow_terminated'
  where id = request_row.id;

  insert into public.message_events (
    organization_id,
    review_request_id,
    customer_id,
    payment_event_id,
    provider,
    direction,
    message_type,
    status,
    message_body,
    occurred_at,
    is_test,
    environment
  ) values (
    request_row.organization_id,
    request_row.id,
    request_row.customer_id,
    request_row.payment_event_id,
    'system',
    'internal',
    'workflow_terminated',
    request_row.status,
    input_cleanup_reason,
    timezone('utc', now()),
    request_row.is_test,
    request_row.environment
  );

  return true;
end;
$$;

create or replace function public.bulk_terminate_active_review_requests(
  input_cleanup_reason text default 'Bulk review workflow cleanup.'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_count integer := 0;
begin
  with affected as (
    update public.review_requests
    set status = 'workflow_terminated'
    where status in ('queued', 'sent', 'delivered', 'awaiting_follow_up', 'review_prompt_sent', 'review_reminder_sent')
    returning *
  )
  insert into public.message_events (
    organization_id,
    review_request_id,
    customer_id,
    payment_event_id,
    provider,
    direction,
    message_type,
    status,
    message_body,
    occurred_at,
    is_test,
    environment
  )
  select
    organization_id,
    id,
    customer_id,
    payment_event_id,
    'system',
    'internal',
    'workflow_terminated',
    'bulk_cleanup',
    input_cleanup_reason,
    timezone('utc', now()),
    is_test,
    environment
  from affected;

  get diagnostics affected_count = row_count;
  return affected_count;
end;
$$;
