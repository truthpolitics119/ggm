import { requireAdmin } from "@/lib/auth";
import { UsersManager } from "@/components/users-manager";

export default async function AdminUsersPage() {
  await requireAdmin();
  return <UsersManager/>;
}
