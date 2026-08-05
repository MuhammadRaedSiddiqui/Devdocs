// app/page.tsx
// Public-facing marketing landing page.
// Faithful port of landing.html — same structure, same copy, same visual output.
// "use client" is needed only for the FAQ accordion toggle. Everything else
// could be server-rendered; feel free to extract the FAQ into its own client
// component and make the rest of this file a Server Component.
"use client";

import { useState } from "react";
import Link from "next/link";
import s from "@/app/landing.module.css";

const OUTPUT_FILES = [
  { name: "PLANNING", desc: "Project scope, MVP definition, success metrics, timeline" },
  { name: "ARCHITECTURE", desc: "Tech stack decisions, architecture decision records, component responsibilities" },
  { name: "DATABASE", desc: "Schema design, migration strategy, indexing plan, soft delete policy" },
  { name: "API-CONTRACTS", desc: "Endpoint definitions, request/response shapes, authentication per route" },
  { name: "ENV-STRATEGY", desc: "Environment list, secrets management, CI/CD gate definitions" },
  { name: "AUTH", desc: "Auth provider, session strategy, token storage, RBAC model" },
  { name: "TESTING", desc: "Testing pyramid, tool choices, coverage targets, CI integration" },
  { name: "MONITORING", desc: "Four golden signals, alert thresholds, error tracking, health checks" },
  { name: "FRONTEND", desc: "Design tokens, component architecture, state management pattern, a11y targets" },
  { name: "DEPLOYMENT", desc: "Hosting platform, deployment method, rollback strategy, scaling triggers" },
];

const FAQS = [
  {
    q: "Is my API key secure?",
    a: "Your key is sent once over HTTPS to our server, verified, and encrypted at rest with AES-256-GCM. It's never returned to your browser after saving and is never stored in client code. All AI calls are made server-side using the encrypted key held only in memory for the duration of a request — we never log your key or your prompts.",
  },
  {
    q: "How long does an interview take?",
    a: "15–30 minutes for a typical project. Complex projects with multiple integrations take longer. The interview is designed to feel like a conversation with a senior developer, not a form. You can skip domains that don't apply to your project type.",
  },
  {
    q: "Can I edit the generated documentation?",
    a: "Yes. Every file is fully editable in-app before you export. You can also regenerate any individual file without rerunning the full interview if you change your mind about a decision.",
  },
  {
    q: "Does this work with Claude Code, Cursor, and Windsurf?",
    a: "Yes. The documentation bundle is structured markdown optimised for AI coding agent consumption. Drop the docs/ folder into your project root and point your agent at the README.md. The agent reads full architectural context before writing a line of code.",
  },
  {
    q: "What if I already started my project?",
    a: "DevDocs AI is designed for pre-build planning, but running the interview on an existing project is still useful for documenting decisions already made and identifying gaps. Several users have used it mid-project to recover from undocumented architecture.",
  },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  function toggleFaq(i: number) {
    setOpenFaq((cur) => (cur === i ? null : i));
  }

  return (
    <div className={s.root}>
      {/* Mobile notice */}
      <div className="sm:hidden px-4 py-2.5 text-center text-[12px] text-white" style={{ background: "var(--terracotta)" }}>
        DevDocs AI is best experienced on a larger screen.
      </div>
      {/* NAV */}
      <nav className={s.nav}>
        <span className={s.navLogo}>DevDocs AI</span>
        <ul className={s.navLinks}>
          <li><a href="#how">How It Works</a></li>
          <li><a href="#output">Output</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="#faq">FAQ</a></li>
        </ul>
        <div className={s.navActions}>
          <Link href="/sign-in" className={s.btnGhost}>Sign In</Link>
          <Link href="/sign-in" className={s.btnPrimary}>Get Started</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className={s.hero}>
        <div className={s.container}>
          <div className={s.heroInner}>
            <div>
              <p className={s.sectionLabel}>Pre-build planning</p>
              <h1 className={s.displayType}>
                Your project,<br />fully planned before<br />you write line one.
              </h1>
              <p className={s.heroSub}>
                Interview with AI. Get a complete 10-file documentation bundle. Feed it to Claude Code,
                Cursor, or Windsurf. Build without guessing.
              </p>
              <div className={s.heroCtas}>
                <Link href="/sign-in" className={s.btnPrimaryLg}>Get Started Free</Link>
                <a href="#how" className={s.btnGhostLg}>See How It Works</a>
              </div>
              <p className={s.heroNote}>Free with your own Anthropic API key. No subscription required.</p>
            </div>

            <div className={s.fileTree}>
              <p className={s.fileTreeHeader}>Output bundle</p>
              <div className={s.fileDir}>docs/</div>
              <div style={{ paddingLeft: 16 }}>
                {OUTPUT_FILES.map((f) => (
                  <div key={f.name} className={s.fileItem}>
                    {f.name}<span className={s.fileExt}>.md</span>
                  </div>
                ))}
                <div className={s.fileItem} style={{ color: "#73726c", marginTop: 8 }}>
                  README<span className={s.fileExt}>.md</span>{" "}
                  <span style={{ color: "#5f5e5d", fontSize: 11 }}>← start here</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className={s.divider} />

      {/* PROBLEM */}
      <section className={s.sectionProblem} id="problem">
        <div className={s.container}>
          <div className={s.problemIntro}>
            <p className={s.sectionLabel}>The problem</p>
            <h2 className={s.heading}>
              AI coding agents fail when planning is missing.
            </h2>
            <p>
              Every undocumented decision — database schema, auth strategy, deployment target — becomes
              a broken build discovered mid-sprint. DevDocs AI surfaces every decision before development begins.
            </p>
          </div>
          <div className={s.beforeAfter}>
            <div className={`${s.baCard} ${s.baCardBad}`}>
              <p className={s.baCardLabel}>✕ &nbsp;Without DevDocs AI</p>
              <div className={s.codeSnippet}>
                Build me a SaaS app with user auth,<br />a dashboard, and Stripe payments.
              </div>
              <ul className={s.consequenceList}>
                {[
                  "No schema — the agent guesses and gets it wrong",
                  "Auth strategy undecided — JWT vs sessions resolved at random",
                  "Stripe webhooks break because the strategy was never defined",
                  "Three days of rework. Significant token waste.",
                ].map((item) => (
                  <li key={item} className={s.consequenceItem}>
                    <span className={s.consequenceIcon}>✕</span> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className={`${s.baCard} ${s.baCardGood}`}>
              <p className={s.baCardLabel}>✓ &nbsp;With DevDocs AI</p>
              <div className={s.codeSnippet}>
                docs/README.md → 10 files loaded<br />Full architectural context present.
              </div>
              <ul className={s.consequenceList}>
                {[
                  "Schema designed and indexed before a table is created",
                  "Auth documented with provider, session, and RBAC decisions",
                  "Stripe webhook strategy defined in ENV-STRATEGY.md",
                  "Coding agent begins with full context. No guessing.",
                ].map((item) => (
                  <li key={item} className={s.consequenceItem}>
                    <span className={s.consequenceIcon}>✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className={s.sectionHow} id="how">
        <div className={s.container}>
          <div className={s.sectionHowIntro}>
            <p className={s.sectionLabel}>How it works</p>
            <h2 className={s.heading}>Four steps between your idea<br />and a production-ready plan.</h2>
          </div>
          <div className={s.stepsGrid}>
            {[
              {
                n: "01 — Interview",
                title: "The AI asks every question you'd skip.",
                body: "Targeted questions across 10 planning domains. Architecture, database, auth, testing, deployment, and more. Every question is the one a senior developer would ask before writing a line of code.",
              },
              {
                n: "02 — Recommend",
                title: "Opinionated, not neutral.",
                body: "Based on your constraints — team size, timeline, budget, scale — the AI recommends architecture with justification. It argues for a monolith over microservices when that's the right call.",
              },
              {
                n: "03 — Generate",
                title: "Ten files. Every decision documented.",
                body: "All 10 documentation files generated simultaneously. Each follows a strict markdown format optimised for AI coding agent consumption. Edit any file in-app before exporting.",
              },
              {
                n: "04 — Export & Build",
                title: "Drop in. Point. Build.",
                body: "Download the complete documentation bundle as a ZIP. Drop the docs/ folder into your project root. Point your coding agent at README.md and start building with full context loaded.",
              },
            ].map((step) => (
              <div key={step.n} className={s.stepCell}>
                <p className={s.stepNumber}>{step.n}</p>
                <h4 className={s.stepCellH4}>{step.title}</h4>
                <p>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className={s.divider} />

      {/* OUTPUT */}
      <section className={s.sectionOutput} id="output">
        <div className={s.container}>
          <div className={s.outputIntro}>
            <p className={s.sectionLabel}>The output</p>
            <h2 className={s.heading}>Ten files. Nothing left<br />for the agent to guess.</h2>
          </div>
          <div className={s.outputTable}>
            {OUTPUT_FILES.map((f) => (
              <div key={f.name} className={s.outputRow}>
                <div className={s.outputFilename}>
                  {f.name}<span className={s.fileExt}>.md</span>
                </div>
                <div className={s.outputDesc}>{f.desc}</div>
              </div>
            ))}
          </div>
          <p className={s.outputNote}>
            Every file is editable in-app before export. Regenerate any section without rerunning the full interview.
          </p>
        </div>
      </section>

      {/* BYOK */}
      <section className={s.sectionByok} id="byok">
        <div className={s.container}>
          <div className={s.byokIntro}>
            <p className={s.sectionLabel}>How billing works</p>
            <h2 className={s.heading}>Bring your own key.<br />Pay nothing to us. Build everything.</h2>
          </div>
          <div className={s.byokCols}>
            {[
              {
                price: "$0 / free",
                title: "Free with BYOK",
                body: "You supply your Anthropic API key. All AI calls go directly from your browser to the Anthropic API. Your key never touches our servers. Typical session costs $0.50–$1.00 in API usage.",
              },
              {
                price: "$12 / month",
                title: "Pro — hosted key",
                body: "We manage the API key. No Anthropic account required. Unlimited projects, PDF export, project versioning, and email support. Upgrade when your BYOK spend exceeds $12/month.",
              },
              {
                price: "$35 / seat / month",
                title: "Team — shared workspaces",
                body: "Everything in Pro. Shared team workspaces, role-based permissions, admin dashboard, SSO, and audit logs. For small teams building together.",
              },
            ].map((col) => (
              <div key={col.title} className={s.byokCol}>
                <p className={s.byokPrice}>{col.price}</p>
                <h4 className={s.byokColH4}>{col.title}</h4>
                <p>{col.body}</p>
              </div>
            ))}
          </div>
          <p className={s.byokNote}>
            The free tier is complete. All 10 documentation domains. All templates. ZIP export. No feature gates.
          </p>
        </div>
      </section>

      <hr className={s.divider} />

      {/* PRICING */}
      <section className={s.sectionPricing} id="pricing">
        <div className={s.container}>
          <div className={s.pricingIntro}>
            <p className={s.sectionLabel}>Pricing</p>
            <h2 className={s.heading}>Simple pricing.</h2>
          </div>
          <div className={s.pricingGrid}>
            <div className={s.pricingCard}>
              <p className={s.pricingTier}>Free</p>
              <p className={s.pricingPrice}>$0</p>
              <p className={s.pricingPriceNote}>forever</p>
              <p className={s.pricingDesc}>For developers validating the approach. Full product, your own API key.</p>
              <ul className={s.pricingFeatures}>
                {["3 projects", "All 10 documentation domains", "All project templates", "ZIP export", "Share links", "BYOK only"].map((f) => <li key={f}>{f}</li>)}
              </ul>
              <Link href="/sign-in" className={s.btnGhostLg}>Get Started Free</Link>
            </div>

            <div className={`${s.pricingCard} ${s.pricingCardFeatured}`}>
              <span className={s.featuredBadge}>Most popular</span>
              <p className={s.pricingTier}>Pro</p>
              <p className={s.pricingPrice}>$12</p>
              <p className={s.pricingPriceNote}>per month</p>
              <p className={s.pricingDesc}>For developers who build regularly and want zero API key friction.</p>
              <ul className={s.pricingFeatures}>
                {["Unlimited projects", "Hosted API key — no BYOK", "Project versioning", "PDF export", "Priority processing", "Email support"].map((f) => <li key={f}>{f}</li>)}
              </ul>
              <Link href="/sign-in" className={s.btnPrimaryLg}>Start Pro</Link>
            </div>

            <div className={s.pricingCard}>
              <p className={s.pricingTier}>Team</p>
              <p className={s.pricingPrice}>$35</p>
              <p className={s.pricingPriceNote}>per seat / month</p>
              <p className={s.pricingDesc}>For small teams building and documenting together.</p>
              <ul className={s.pricingFeatures}>
                {["Everything in Pro", "Team workspaces", "Shared projects", "Admin dashboard", "SSO + audit logs", "Dedicated support"].map((f) => <li key={f}>{f}</li>)}
              </ul>
              <a href="#" className={s.btnGhostLg}>Contact Us</a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className={s.sectionFaq} id="faq">
        <div className={s.container}>
          <div className={s.faqIntro}>
            <p className={s.sectionLabel}>Common questions</p>
            <h2 className={s.heading}>Common questions.</h2>
          </div>
          <div className={s.faqList}>
            {FAQS.map((faq, i) => (
              <div key={i} className={s.faqItem}>
                <button type="button" className={s.faqQuestion} onClick={() => toggleFaq(i)}>
                  {faq.q}
                  <span className={`${s.faqArrow} ${openFaq === i ? s.faqArrowOpen : ""}`}>↓</span>
                </button>
                {openFaq === i && (
                  <div className={s.faqAnswer}>{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className={s.sectionCta}>
        <div className={s.container}>
          <div className={s.ctaInner}>
            <h2 className={`${s.displayType} ${s.ctaDisplay}`} style={{ color: "#ffffff", fontSize: 48 }}>
              Stop discovering architecture decisions mid-build.
            </h2>
            <p className={s.ctaSub}>Plan completely. Build confidently. Ship without rework.</p>
            <div className={s.ctaButtons}>
              <Link href="/sign-in" className={s.ctaBtnPrimary}>Get Started Free</Link>
              <a href="#output" className={s.ctaBtnGhost}>See the Output</a>
            </div>
            <p className={s.ctaNote}>Free with your Anthropic API key. No credit card required.</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={s.footer}>
        <div className={s.container}>
          <div className={s.footerInner}>
            <div className={s.footerLeft}>
              <span className={s.footerWordmark}>DevDocs AI</span>
              <span className={s.footerCopy}>© 2026 DevDocs AI. All rights reserved.</span>
            </div>
            <ul className={s.footerLinks}>
              <li><a href="#how">How It Works</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="#">Documentation</a></li>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms of Service</a></li>
            </ul>
            <ul className={s.footerLinks}>
              <li><a href="#">GitHub</a></li>
              <li><a href="#">Twitter / X</a></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
