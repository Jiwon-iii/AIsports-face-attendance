import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/_lib/admin-auth";

export async function requireAdminPageAuth(nextPath: string): Promise<void> {
  if (await isAdminAuthenticated()) {
    return;
  }

  const query = new URLSearchParams({ next: nextPath }).toString();
  redirect(`/admin/login?${query}`);
}
