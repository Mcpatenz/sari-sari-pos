import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Building2, ShieldCheck, Users, UserRound } from "lucide-react";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { AppBar } from "@/components/pos/AppBar";
import { SuperAdminPanel } from "@/components/super-admin/SuperAdminPanel";

export const instant = false;

export default async function SuperAdminPage() {
  await connection();
  const user = await getCurrentUser();
  if (!user) redirect("/logout");
  if (user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const [stores, users, owners, cashiers] = await Promise.all([
    prisma.store.count(),
    prisma.user.count({ where: { active: true } }),
    prisma.user.count({ where: { role: "OWNER", active: true } }),
    prisma.user.count({ where: { role: "CASHIER", active: true } }),
  ]);

  const metrics = [
    { label: "Registered stores", value: stores, detail: "All workspaces", icon: Building2 },
    { label: "Registered users", value: users, detail: "Active accounts", icon: Users },
    { label: "Store owners", value: owners, detail: "Owner accounts", icon: ShieldCheck },
    { label: "Cashiers", value: cashiers, detail: "Active staff accounts", icon: UserRound },
  ];

  return (
    <div className="min-h-screen bg-cream">
      <AppBar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ink/55">Platform control center</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Super admin dashboard</h1>
            <p className="mt-1 text-sm text-ink/55">Monitor every TindahanPOS store and configure the system workspace.</p>
          </div>
          <span className="rounded-full border border-berry/20 bg-berry/10 px-4 py-2 text-sm font-semibold text-berry">SUPER ADMIN</span>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return <div key={metric.label} className="card flex items-center gap-4 p-5"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-ink text-mango"><Icon className="h-5 w-5" /></span><div><p className="text-sm text-ink/55">{metric.label}</p><p className="text-2xl font-bold tabular">{metric.value.toLocaleString("en-PH")}</p><p className="text-xs text-ink/45">{metric.detail}</p></div></div>;
          })}
        </section>

        <SuperAdminPanel />
      </main>
    </div>
  );
}
