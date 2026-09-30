import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">ClinicFlow</h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">
        An AI back office for small clinics: referral intake, LLM extraction,
        benefits verification, and voice agents.
      </p>
      <Link
        href="/status"
        className="mt-8 inline-flex w-fit items-center rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90"
      >
        View system status →
      </Link>
    </main>
  );
}
