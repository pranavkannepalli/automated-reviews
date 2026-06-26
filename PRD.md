# Automated Reviews MVP PRD

## Goal

Build a multi-organization review generation MVP in about 1 hour that:

- ingests payment-triggered customer outreach events
- sends SMS review requests
- routes happy customers to public review links
- stores all events in Supabase
- shows a polished, professional analytics dashboard with auth

This is not a throwaway prototype. It is the smallest shippable SaaS-shaped MVP.

## Product Summary

Businesses connect a payment source and messaging channel, then the platform automatically messages customers after a transaction, captures feedback, and turns positive experiences into review asks.

Everything is logged to Supabase. Each organization has its own workspace, settings, review links, and analytics. The website shows rich funnel metrics, recent customer activity, and trend summaries for the last 5 days.

## MVP Positioning

This MVP must feel like a real product even if the backend logic is thin.

That means:

- multi-organization support
- login/auth
- clean organization-level data isolation
- professional dashboard UI
- dense analytics
- one reliable end-to-end payment-to-review flow

That does not mean:

- every payment terminal
- every messaging channel
- perfect attribution
- enterprise permissions

## Core Product Promise

For each organization:

1. A payment event enters the system.
2. A customer gets an SMS asking for feedback.
3. The customer replies with a rating or text.
4. Positive replies get a review link.
5. Negative or neutral replies stay private.
6. Every step is logged.
7. The owner sees clear metrics and recent customer signals on the dashboard.

## Target User

- Multi-location or single-location local business operators
- Agencies managing review generation for clients
- Owners who care about review growth and customer recovery

## Customer Problem

- Review asks are inconsistent
- Negative feedback often appears in public before the owner sees it
- Owners do not know how many customers were asked, replied, or converted
- Existing tools either feel too basic or too bloated

## One-Hour MVP Scope

Build only this:

- multi-tenant auth using Supabase Auth
- organization-scoped data model
- one payment source implemented first: Square
- one messaging channel implemented first: Twilio SMS
- one feedback path: `1-5` score plus optional free text
- one owner dashboard with strong visual polish
- one analytics range hardcoded to last 5 days
- one organization settings page
- one recent activity/feed page or section

Do not build:

- role hierarchies beyond basic org membership
- WhatsApp for the first build
- billing
- invite flows beyond simple org bootstrap
- granular permissions
- custom date ranges
- AI-generated summaries if time is tight

## Recommendation

To satisfy the "one hour" constraint, implement breadth in the UI and schema, not depth in integrations.

Meaning:

- support multiple organizations in the data model and auth from day one
- show rich analytics from logged event data
- keep actual integrations limited to `Square + Twilio SMS`

## Functional Requirements

### Auth

- Users can sign in
- Users belong to one or more organizations
- Every page and query is scoped to an active organization
- Unauthenticated users are redirected to sign-in

### Organization Management

- Each organization has:
  - name
  - slug
  - primary brand color
  - logo URL
  - business type
  - review links
  - messaging settings
  - payment source settings
- User can switch active organization if they belong to more than one

### Payment Event Ingestion

- Receive Square payment webhooks
- Persist raw payload and normalized event row
- Associate event with organization
- Deduplicate repeated webhook deliveries
- Ignore events with no valid phone number

### Messaging

- Send outbound SMS using Twilio
- Receive inbound SMS reply via Twilio webhook
- Match reply to payment/customer/request
- Log all message attempts, deliveries, replies, failures, and follow-ups

### Feedback Routing

- Positive replies: `4-5`
- Neutral/negative replies: `1-3`
- Unknown replies trigger a retry prompt asking for `1-5`
- Positive replies receive review link CTA
- Neutral/negative replies are stored privately and flagged for follow-up

### Dashboard Analytics

The website must show as much useful analytics as possible from MVP data for the last 5 days.

Required metrics:

- total payment events
- total eligible customers
- total messages queued
- total messages sent
- total messages delivered
- total message failures
- total replies received
- reply rate
- total positive replies
- positive rate
- total neutral/negative replies
- recovery-needed count
- total review prompts sent
- review-prompt rate
- response time average
- messages by day
- replies by day
- positive replies by day
- review prompts by day

Required lists/sections:

- recent activity feed
- recent negative feedback feed
- recent positive customers
- top failure reasons
- organization settings summary

### Visual / UX Requirements

The dashboard should look polished and agency-grade, not like an internal admin panel.

Requirements:

- clean branded layout
- professional typography
- strong spacing rhythm
- metric cards with hierarchy
- charts or chart-like visual blocks
- clear empty states
- mobile-usable responsive layout
- visually distinct positive/negative status treatments

## Data Model

All tables must include:

- `id`
- `created_at`
- `updated_at` where useful
- `organization_id` where organization-scoped
- `is_test`
- `environment`

### `organizations`

- `id`
- `name`
- `slug`
- `logo_url`
- `primary_color`
- `business_type`
- `timezone`
- `created_at`

### `organization_members`

- `id`
- `organization_id`
- `user_id`
- `role`
- `created_at`

### `organization_settings`

- `id`
- `organization_id`
- `google_review_url`
- `yelp_review_url`
- `twilio_phone_number`
- `twilio_account_sid`
- `square_location_id`
- `message_delay_minutes`
- `auto_send_enabled`
- `created_at`
- `updated_at`

### `customers`

- `id`
- `organization_id`
- `phone`
- `first_name`
- `last_name`
- `last_payment_at`
- `last_message_at`
- `created_at`
- `updated_at`

### `payment_events`

- `id`
- `organization_id`
- `customer_id`
- `source`
- `source_payment_id`
- `source_location_id`
- `amount`
- `currency`
- `status`
- `phone`
- `occurred_at`
- `raw_payload`
- `created_at`

### `review_requests`

- `id`
- `organization_id`
- `payment_event_id`
- `customer_id`
- `channel`
- `status`
- `scheduled_for`
- `sent_at`
- `delivered_at`
- `replied_at`
- `created_at`
- `updated_at`

### `message_events`

- `id`
- `organization_id`
- `review_request_id`
- `customer_id`
- `payment_event_id`
- `provider`
- `provider_message_sid`
- `direction`
- `message_type`
- `status`
- `message_body`
- `error_code`
- `error_message`
- `occurred_at`
- `created_at`

### `feedback_responses`

- `id`
- `organization_id`
- `review_request_id`
- `customer_id`
- `payment_event_id`
- `score`
- `free_text`
- `sentiment_bucket`
- `owner_follow_up_required`
- `review_prompt_sent`
- `review_prompt_sent_at`
- `created_at`
- `updated_at`

### `analytics_daily`

Optional if time allows. If not, compute live from raw tables.

- `id`
- `organization_id`
- `date`
- `payment_count`
- `eligible_customer_count`
- `message_sent_count`
- `message_delivered_count`
- `reply_count`
- `positive_reply_count`
- `negative_reply_count`
- `review_prompt_count`
- `failure_count`
- `created_at`
- `updated_at`

## Organization Isolation

Every table query must be organization-scoped.

Rules:

- users only see organizations they belong to
- dashboard queries filter by `organization_id`
- webhooks map incoming events to a configured organization
- production testing still writes to prod DB, but records stay filterable via `is_test` and `environment`

## API Endpoints

### Auth / Org

#### `GET /app`

- Dashboard for active organization

#### `GET /app/settings`

- Organization settings page

#### `POST /app/organization/switch`

- Switch active organization

### Webhooks

#### `POST /api/webhooks/square`

- verify signature if possible
- map webhook to organization
- store raw payload
- normalize payment event
- create or update customer
- create review request if eligible

#### `POST /api/webhooks/twilio`

- store inbound message event
- match to open review request
- parse score/text
- create feedback response
- send follow-up SMS if needed
- log all follow-up message events

### Analytics

#### `GET /api/dashboard/summary?days=5`

Return:

- all KPI counts
- rates
- daily buckets
- recent activity
- recent negative feedback
- recent positive feedback
- top delivery failures

#### `GET /api/dashboard/activity?days=5`

- chronological event stream

#### `GET /api/dashboard/feedback?days=5`

- recent feedback rows

## Event Types

Define these event types for `message_events` or activity logging:

- `payment_received`
- `review_request_created`
- `sms_send_attempted`
- `sms_sent`
- `sms_delivered`
- `sms_failed`
- `sms_inbound_received`
- `feedback_positive`
- `feedback_negative`
- `feedback_unknown`
- `review_prompt_sent`
- `owner_follow_up_flagged`

## Derived Analytics Definitions

Define these params clearly so the dashboard is deterministic:

- `eligible_customer`: payment event with a usable phone number
- `reply_rate`: replies received / messages delivered
- `positive_rate`: positive replies / total replies
- `review_prompt_rate`: review prompts sent / total replies
- `delivery_failure_rate`: failed sends / total send attempts
- `avg_response_time_minutes`: average time from `sent_at` to inbound reply timestamp
- `recovery_needed_count`: count of feedback responses with `owner_follow_up_required = true`

## Default Messaging Copy

### Initial Ask

`Thanks for visiting {{organization_name}}. How was your experience today? Reply 1-5.`

### Positive Follow-Up

`Glad to hear it. Would you mind leaving a quick review? {{google_review_url}}`

### Negative / Neutral Follow-Up

`Thanks for the feedback. We appreciate it and will review it internally.`

### Unknown Reply

`Thanks. Could you reply with a number from 1 to 5?`

## Dashboard Layout

### Top Row

- organization switcher
- 5-day range label
- total payment events
- reply rate
- positive rate
- review prompts sent

### Main Analytics Grid

- messages over time
- replies over time
- positive vs negative split
- delivery outcomes
- funnel block:
  - payments
  - eligible customers
  - messages sent
  - replies
  - positive
  - review prompts

### Lower Sections

- recent activity feed
- negative feedback queue
- positive customer list
- delivery failure table

### Settings Area

- review links
- Twilio config
- Square config
- message delay
- auto-send toggle

## Suggested Stack

- Next.js
- TypeScript
- Tailwind
- Supabase Auth + Postgres
- Twilio
- Square
- simple chart library if already easy, otherwise custom metric blocks

## Build Strategy For One Hour

Prioritize in this order:

1. auth with Supabase
2. organization tables and organization scoping
3. dashboard shell with polished visuals
4. Supabase-backed KPI queries for last 5 days
5. Square webhook storage
6. Twilio outbound/inbound flow
7. feedback routing
8. settings page

If time runs short:

- keep charts simple
- compute analytics directly from raw tables
- support only one user role
- support org creation via seed/manual SQL instead of full onboarding UI

## Success Criteria

The MVP is successful if:

- a user can sign in
- a user can view an organization-scoped dashboard
- the dashboard looks polished and professional
- the dashboard shows dense analytics from the last 5 days
- Square events can be logged
- Twilio messages can be logged
- customer replies can be logged
- positive replies trigger review prompts
- negative replies are private and visible in the dashboard
- all core data is isolated by organization

## Risks

### Scope Risk

Multi-org auth plus polished analytics is the biggest risk to the one-hour constraint.

Mitigation:

- hardcode date range to 5 days
- use one role only
- use manual org bootstrap
- support only Square and SMS initially

### Data Quality Risk

Square events may not always include a usable phone number.

Mitigation:

- test with known phone-bearing payloads
- keep manual seed/test payloads

### Reporting Risk

Using the production DB for testing can pollute analytics.

Mitigation:

- always set `is_test = true` for test rows
- set `environment = 'prod_test'`
- exclude test data by default from dashboard queries unless toggled on

## Explicit Non-Goals

Still out of scope even for this MVP:

- WhatsApp implementation
- billing/subscriptions
- advanced RBAC
- invite emails
- custom report builder
- arbitrary date filters
- sentiment AI
- multiple payment processors at launch

## Final Recommendation

Treat the MVP as a polished vertical slice SaaS product:

- real auth
- real org isolation
- real analytics
- one real payment integration
- one real messaging integration

That is the highest-value version you can plausibly build fast without diffusing effort across too many integrations.
