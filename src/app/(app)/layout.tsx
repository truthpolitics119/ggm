import { AppShell } from "@/components/app-shell";
import { getActiveUser } from "@/lib/auth";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getActiveUser();
  return <AppShell profile={profile}>{children}</AppShell>;
}
