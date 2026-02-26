import { AdminFacesContainer } from "@/_components/admin-faces/admin-faces-container";
import { requireAdminPageAuth } from "@/_lib/admin-page-auth";

export default async function AdminFacesPage() {
  await requireAdminPageAuth("/admin/faces");
  return <AdminFacesContainer />;
}
