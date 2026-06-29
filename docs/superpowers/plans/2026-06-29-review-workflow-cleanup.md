# Review Workflow Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean dirty review workflow rows in Supabase and add an explicit terminate path that also cleans database state.

**Architecture:** Add a terminal cleanup status and a small Temporal termination helper in app code, then add a cleanup script that finds stale active review requests, terminates matching workflows when present, updates Supabase to terminal state, and records audit events.

**Tech Stack:** Next.js, TypeScript, Supabase, Temporal, Vitest, tsx

---
