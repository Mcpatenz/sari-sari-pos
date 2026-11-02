import { AppBar } from "@/components/pos/AppBar";
import { OwnerSidebar } from "@/components/pos/OwnerSidebar";

function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-full bg-ink/10 ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-cream">
      <AppBar navBelowLg />
      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8 sm:px-6">
        <OwnerSidebar />
        <main className="min-w-0 flex-1">
          <section className="overflow-hidden rounded-[2rem] bg-ink p-6 text-cream shadow-xl shadow-ink/10 sm:p-8">
            <div className="max-w-2xl space-y-4">
              <div className="h-6 w-40 rounded-full bg-white/10" />
              <Bar className="h-4 w-32 !bg-white/10" />
              <div className="h-9 w-80 max-w-full rounded-2xl bg-white/10" />
              <div className="h-4 w-full max-w-xl rounded-full bg-white/10" />
            </div>
            <div className="mt-8 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="space-y-2">
                  <div className="h-3 w-24 rounded-full bg-white/10" />
                  <div className="h-7 w-28 rounded-xl bg-white/10" />
                  <div className="h-3 w-20 rounded-full bg-white/10" />
                </div>
              ))}
            </div>
          </section>

          <div className="mt-8 flex items-end justify-between gap-4">
            <div className="space-y-2">
              <Bar className="h-4 w-24" />
              <Bar className="h-7 w-56" />
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div key={index} className="card flex gap-4 p-5">
                <div className="h-11 w-11 shrink-0 animate-pulse rounded-2xl bg-ink/10" />
                <div className="min-w-0 flex-1 space-y-2 pt-1">
                  <Bar className="h-4 w-32" />
                  <Bar className="h-3 w-full" />
                  <Bar className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
