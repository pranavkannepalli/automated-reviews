"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

import type { WidgetData, WidgetTheme } from "@/lib/widget";
import { cn } from "@/lib/utils";

function StarRow({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1 text-[var(--widget-accent)]">
      {Array.from({ length: count }).map((_, index) => (
        <span key={index}>★</span>
      ))}
    </div>
  );
}

function ReviewCard({
  review,
  theme,
}: {
  review: WidgetData["reviews"][number];
  theme: WidgetTheme;
}) {
  return (
    <article
      className="flex h-full flex-col justify-between border p-5"
      style={{
        borderColor: "var(--widget-border)",
        background: "var(--widget-surface)",
        borderRadius: `${theme.radius}px`,
        boxShadow: "var(--widget-shadow)",
      }}
    >
      <div>
        {theme.showStars ? <StarRow count={review.score ?? 5} /> : null}
        <p className="mt-4 text-sm leading-7" style={{ color: "var(--widget-text)" }}>
          “{review.free_text ?? "Great experience."}”
        </p>
      </div>
      <div className="mt-6">
        <p className="text-sm font-semibold" style={{ color: "var(--widget-text)" }}>
          {review.customer_name}
        </p>
        <p className="mt-1 text-xs uppercase tracking-[0.22em]" style={{ color: "var(--widget-muted)" }}>
          Verified customer feedback
        </p>
      </div>
    </article>
  );
}

export function ReviewWidget({
  data,
  theme,
}: {
  data: WidgetData;
  theme: WidgetTheme;
}) {
  const [index, setIndex] = useState(0);
  const reviews = data.reviews;

  useEffect(() => {
    if (!theme.autoplay || theme.layout === "grid" || reviews.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % reviews.length);
    }, theme.intervalMs);

    return () => window.clearInterval(timer);
  }, [reviews.length, theme.autoplay, theme.intervalMs, theme.layout]);

  useEffect(() => {
    const reportHeight = () => {
      const height = document.documentElement.scrollHeight;
      window.parent.postMessage({ type: "automated-reviews:height", height }, "*");
    };

    reportHeight();
    window.addEventListener("resize", reportHeight);
    return () => window.removeEventListener("resize", reportHeight);
  }, [index, reviews.length, theme.layout, theme.showHeader]);

  const currentReview = reviews[index];

  return (
    <div
      className="min-h-screen px-4 py-4 sm:px-6"
      style={
        {
          background: "var(--widget-bg)",
          color: "var(--widget-text)",
          ["--widget-bg" as string]: theme.background,
          ["--widget-surface" as string]: theme.surface,
          ["--widget-text" as string]: theme.text,
          ["--widget-muted" as string]: theme.muted,
          ["--widget-accent" as string]: theme.accent,
          ["--widget-border" as string]: theme.border,
          ["--widget-shadow" as string]: theme.shadow,
        } as CSSProperties
      }
    >
      <div className="mx-auto max-w-5xl">
        {theme.showHeader ? (
          <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.32em]" style={{ color: "var(--widget-muted)" }}>
                Customer highlights
              </p>
              <h1 className="mt-2 text-2xl font-semibold">{data.organization.name}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: "var(--widget-muted)" }}>
                Recent positive customer feedback collected through automated post-visit SMS follow-up.
              </p>
            </div>
            <div
              className="rounded-full border px-4 py-2 text-xs uppercase tracking-[0.22em]"
              style={{ borderColor: "var(--widget-border)", color: "var(--widget-muted)" }}
            >
              {reviews.length} published review{reviews.length === 1 ? "" : "s"}
            </div>
          </header>
        ) : null}

        {!reviews.length ? (
          <div
            className="border p-6 text-sm"
            style={{
              borderColor: "var(--widget-border)",
              background: "var(--widget-surface)",
              borderRadius: `${theme.radius}px`,
              boxShadow: "var(--widget-shadow)",
              color: "var(--widget-muted)",
            }}
          >
            No positive customer testimonials have been published yet.
          </div>
        ) : theme.layout === "grid" ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {reviews.map((review) => (
              <ReviewCard key={review.id} review={review} theme={theme} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <ReviewCard review={currentReview} theme={theme} />
            {reviews.length > 1 ? (
              <div className="flex items-center justify-center gap-2">
                {reviews.map((review, reviewIndex) => (
                  <button
                    key={review.id}
                    type="button"
                    aria-label={`Show review ${reviewIndex + 1}`}
                    className={cn("h-2.5 rounded-full transition-all", reviewIndex === index ? "w-8" : "w-2.5")}
                    style={{
                      background: reviewIndex === index ? "var(--widget-accent)" : "var(--widget-border)",
                    }}
                    onClick={() => setIndex(reviewIndex)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
