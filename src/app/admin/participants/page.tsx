import { AdminParticipantsContainer } from "@/_components/admin-participants/admin-participants-container";
import { requireAdminPageAuth } from "@/_lib/admin-page-auth";

export default async function AdminParticipantsPage() {
  await requireAdminPageAuth("/admin/participants");
  return <AdminParticipantsContainer />;
}
