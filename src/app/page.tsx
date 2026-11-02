import { redirect } from "next/navigation";
import { connection } from "next/server";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { homeForRole } from "@/lib/auth-core";
import { getSession } from "@/lib/session";

export const instant = false;

export default async function RootPage() {
  // Reading the session touches the clock and cookies — render at request time.
  await connection();

  const session = await getSession();
  if (session) redirect(homeForRole(session.role));

  return <LoginScreen />;
}
