import { DataTableShell } from "@/components/app/data-table-shell";
import { PageHeader } from "@/components/app/page-header";
import { prisma } from "@/lib/prisma";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({ include: { role: true, company: true }, orderBy: { createdAt: "asc" } });

  return (
    <section className="space-y-6">
      <PageHeader title="Users" description="Platform identities across external, internal, and administrative domains." />
      <DataTableShell
        title="User Directory"
        columns={["Name", "Email", "Role", "Company"]}
        rows={users.map((user) => [user.fullName, user.email, user.role.code, user.company?.name ?? "N/A"])}
      />
    </section>
  );
}
