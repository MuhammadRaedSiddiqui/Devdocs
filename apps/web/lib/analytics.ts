// apps/web/lib/analytics.ts
import posthog from 'posthog-js';

/**
 * Initialize PostHog analytics
 * Call this once on app startup
 */
export function initAnalytics() {
  if (typeof window === 'undefined') return;

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

  if (!apiKey) {
    console.warn('PostHog API key not configured, analytics disabled');
    return;
  }

  posthog.init(apiKey, {
    api_host: apiHost,
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') {
        posthog.opt_out_capturing();
      }
    },
    capture_pageview: false, // We'll manually capture page views
    capture_pageleave: true,
  });
}

/**
 * Track a custom event
 */
export function trackEvent(event: string, properties?: Record<string, any>) {
  if (typeof window === 'undefined') return;

  posthog.capture(event, properties);
}

/**
 * Identify a user
 */
export function identifyUser(userId: string, traits?: Record<string, any>) {
  if (typeof window === 'undefined') return;

  posthog.identify(userId, traits);
}

/**
 * Track page views
 */
export function trackPageView(url?: string) {
  if (typeof window === 'undefined') return;

  posthog.capture('$pageview', {
    $current_url: url || window.location.href,
  });
}

/**
 * Reset user identity (on logout)
 */
export function resetUser() {
  if (typeof window === 'undefined') return;

  posthog.reset();
}

// Event tracking helpers for common actions
export const analytics = {
  // Project events
  projectCreated: (projectType: string, userId: string) => {
    trackEvent('project_created', { projectType, userId });
  },

  projectDeleted: (projectId: string, userId: string) => {
    trackEvent('project_deleted', { projectId, userId });
  },

  // Interview events
  interviewStarted: (projectId: string, userId: string) => {
    trackEvent('interview_started', { projectId, userId });
  },

  interviewCompleted: (projectId: string, domainsCompleted: number, timeSpent: number, userId: string) => {
    trackEvent('interview_completed', { projectId, domainsCompleted, timeSpent, userId });
  },

  domainCompleted: (projectId: string, domainId: string, userId: string) => {
    trackEvent('domain_completed', { projectId, domainId, userId });
  },

  domainCompletedWithTiming: (projectId: string, domainId: string, durationMs: number, provider: string | null, userId: string) => {
    trackEvent('domain_completed', { projectId, domainId, durationMs, provider, userId });
    trackEvent('time_per_domain', { projectId, domainId, durationMs, userId });
  },

  interviewAbandoned: (projectId: string, currentDomain: string, completedCount: number, totalDomains: number, timeSpentMs: number, userId: string) => {
    trackEvent('interview_abandoned_at_domain', { projectId, currentDomain, completedCount, totalDomains, timeSpentMs, userId });
  },

  // Documentation events
  documentationDownloaded: (projectId: string, format: string, userId: string) => {
    trackEvent('documentation_downloaded', { projectId, format, userId });
  },

  documentationExported: (projectId: string, format: string, userId: string) => {
    trackEvent('documentation_exported', { projectId, format, userId });
  },

  // API key events
  apiKeyAdded: (provider: string, userId: string) => {
    trackEvent('api_key_added', { provider, userId });
  },

  apiKeyRemoved: (provider: string, userId: string) => {
    trackEvent('api_key_removed', { provider, userId });
  },

  // AI streaming events
  aiStreamStarted: (projectId: string, domainId: string, provider: string, userId: string) => {
    trackEvent('ai_stream_started', { projectId, domainId, provider, userId });
  },

  aiStreamCompleted: (projectId: string, domainId: string, provider: string, cacheHit: boolean, userId: string) => {
    trackEvent('ai_stream_completed', { projectId, domainId, provider, cacheHit, userId });
  },

  aiStreamError: (projectId: string, domainId: string, provider: string, errorType: string, userId: string) => {
    trackEvent('ai_stream_error', { projectId, domainId, provider, errorType, userId });
  },
};
