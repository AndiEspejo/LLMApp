import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { getHealth } from "@/lib/api";

export const metadata: Metadata = {
  title: "System status · ClinicFlow",
};

function Badge({ healthy, label }: { healthy: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
        healthy
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
          : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${healthy ? "bg-emerald-500" : "bg-rose-500"}`}
      />
      {label}
    </span>
  );
}

function Row({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-t border-zinc-200 py-3 first:border-t-0 dark:border-zinc-800">
      <dt className="text-zinc-600 dark:text-zinc-400">{name}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default async function StatusPage() {
  // Render on every request: this page reports live state.
  await connection();
  const health = await getHealth();

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-6 py-16">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← Home
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">System status</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Live result of <code className="font-mono">GET /health</code> on the API.
      </p>

      <section className="mt-8 rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
        {health.ok ? (
          <dl>
            <Row name="API">
              <Badge
                healthy={health.data.status === "ok"}
                label={`${health.data.status} (HTTP ${health.httpStatus})`}
              />
            </Row>
            <Row name="Database">
              <Badge
                healthy={health.data.database === "ok"}
                label={health.data.database}
              />
            </Row>
            <Row name="Version">
              <span className="font-mono text-sm">{health.data.version}</span>
            </Row>
            <Row name="Environment">
              <span className="font-mono text-sm">{health.data.environment}</span>
            </Row>
          </dl>
        ) : (
          <div className="space-y-3">
            <Badge healthy={false} label="API unreachable" />
            <p className="font-mono text-sm break-words text-zinc-600 dark:text-zinc-400">
              {health.error}
            </p>
            <p className="text-sm text-zinc-500">
              Is it running? Try <code className="font-mono">make dev</code>.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
