import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { getDashboardStats } from "@/lib/stats";
import { AppBar } from "@/components/pos/AppBar";
import { OwnerSidebar } from "@/components/pos/OwnerSidebar";
import { DashboardOverview } from "@/components/pos/DashboardOverview";

export const instant = false;

export default async function OwnerDashboard() {
  // Session verification reads the clock (token expiry) and cookies, so this
  // page must render at request time rather than being prerendered.
  await connection();

  const user = await getCurrentUser();
  if (!user) redirect("/logout");
  if (user.role === "SUPER_ADMIN") redirect("/super-admin");
  if (user.role !== "OWNER") redirect("/cashier");

  const stats = await getDashboardStats(user.storeId);

  return (
    <div className="min-h-screen bg-cream">
      <AppBar navBelowLg />
      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8 sm:px-6">
        <OwnerSidebar />
        <main className="min-w-0 flex-1">
          <DashboardOverview
            stats={stats}
            name={user.name}
            storeName={user.store?.name ?? "Your sari-sari store"}
          />
        </main>
      </div>
    </div>
  );
}
