import Link from "next/link";

const featureCards = [
  {
    title: "Partner onboarding and tiers",
    description:
      "Internal users can onboard partner organizations, store agreement metadata, and monitor certifications from one surface.",
    href: "/partners",
  },
  {
    title: "Deal registration workflow",
    description:
      "Partner sellers create deals, sales approves first, channel managers finish approval, and every transition is audited.",
    href: "/deals",
  },
  {
    title: "MDF approvals and reimbursements",
    description:
      "Finance owns decision and reimbursement boundaries so requests cannot silently jump from submit to paid.",
    href: "/mdf",
  },
  {
    title: "Leaderboard and async jobs",
    description:
      "A reporting service can compute live metrics and persist snapshots via queued leaderboard refresh jobs.",
    href: "/reports",
  },
];

export default function HomePage() {
  return (
    <div className="grid gap-6">
      <section className="card px-6 py-8">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-signal">Architecture</p>
        <h2 className="mt-3 max-w-4xl text-3xl font-semibold tracking-tight text-ink">
          Next.js + TypeScript + Prisma + PostgreSQL with explicit services, repositories, validation,
          RBAC, audit logging, and background jobs.
        </h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
          This scaffold is intentionally opinionated toward backend-oriented product engineering. Routes
          stay thin, services own transactions and workflow rules, repositories own data access, and the
          docs trace real requests through actual files.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {featureCards.map((card) => (
          <Link key={card.href} href={card.href} className="card block px-6 py-6 transition hover:-translate-y-0.5">
            <h3 className="text-xl font-semibold text-ink">{card.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{card.description}</p>
            <p className="mt-4 text-sm font-semibold text-signal">Open module →</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
