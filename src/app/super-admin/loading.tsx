import { AppBar } from "@/components/pos/AppBar";

export default function SuperAdminLoading() {
  return (
    <div className="min-h-screen bg-cream">
      <AppBar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-3">
            <div className="h-4 w-40 animate-pulse rounded-full bg-ink/10" />
            <div className="h-8 w-72 max-w-full animate-pulse rounded-2xl bg-ink/10" />
            <div className="h-4 w-96 max-w-full animate-pulse rounded-full bg-ink/10" />
          </div>
          <div className="h-9 w-32 animate-pulse rounded-full bg-ink/10" />
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="card flex items-center gap-4 p-5">
              <div className="h-11 w-11 shrink-0 animate-pulse rounded-2xl bg-ink/10" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 animate-pulse rounded-full bg-ink/10" />
                <div className="h-7 w-16 animate-pulse rounded-xl bg-ink/10" />
                <div className="h-3 w-20 animate-pulse rounded-full bg-ink/10" />
              </div>
            </div>
          ))}
        </section>

        <div className="mt-8 h-72 animate-pulse rounded-3xl bg-ink/5" />
      </main>
    </div>
  );
}
