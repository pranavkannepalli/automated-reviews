# Org Phone Active Review Dedupe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent multiple active review workflows for the same organization and customer phone number.

**Architecture:** Reuse existing review request creation flow, but check for an existing active request for the same `organization_id + phone` before creating a new one. Keep workflow-level dedupe in place as secondary defense.

**Tech Stack:** Next.js, TypeScript, Supabase, Temporal, Vitest

---
