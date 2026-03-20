import { UserRoleCode } from "@prisma/client";

import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdminUser } from "@/lib/admin-console";
import { prisma } from "@/lib/prisma";

import { createUserAction, updateUserAssignmentAction } from "./actions";

function safeText(value?: string) {
  if (!value) return null;
  return value.length > 200 ? `${value.slice(0, 200)}...` : value;
}

const MANAGEABLE_ROLES: UserRoleCode[] = [
  "ADMIN",
  "DIRECTOR",
  "REVIEW_OFFICER",
  "EXTERNAL_OPERATOR",
  "COMPANY_ADMIN",
  "SUPER_ADMIN"
];

export default async function AdminUsersPage({
  searchParams
}: {
  searchParams: { q?: string; role?: string; company?: string; state?: string; success?: string; error?: string };
}) {
  const admin = await requireAdminUser();
  const query = searchParams.q?.trim() ?? "";
  const roleFilter = searchParams.role?.trim() ?? "ALL";
  const companyFilter = searchParams.company?.trim() ?? "ALL";
  const stateFilter = searchParams.state?.trim() ?? "ALL";

  const where = {
    AND: [
      query
        ? {
            OR: [
              { fullName: { contains: query } },
              { email: { contains: query } },
              { company: { name: { contains: query } } }
            ]
          }
        : {},
      roleFilter === "ALL" ? {} : { role: { code: roleFilter as UserRoleCode } },
      companyFilter === "ALL" ? {} : { companyId: companyFilter },
      stateFilter === "ALL" ? {} : { isActive: stateFilter === "ACTIVE" }
    ]
  };

  const [users, roles, companies] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { role: true, company: true },
      orderBy: [{ createdAt: "asc" }]
    }),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
    prisma.company.findMany({ orderBy: { name: "asc" } })
  ]);

  const roleOptions = roles.filter((role) => MANAGEABLE_ROLES.includes(role.code));

  return (
    <section className="space-y-6">
      <PageHeader title="Users" description="Search, review, activate/deactivate, and update user roles for demo administration." />

      {searchParams.success ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{safeText(searchParams.success)}</p>
      ) : null}
      {searchParams.error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{safeText(searchParams.error)}</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Create User</CardTitle>
          <CardDescription>Create a new account and assign role/company access in one step.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createUserAction} className="grid gap-3 md:grid-cols-3">
            <Input name="fullName" placeholder="Full name" required />
            <Input name="email" type="email" placeholder="Email" required />
            <Input name="password" type="password" placeholder="Temporary password" required />
            <select name="roleCode" defaultValue="EXTERNAL_OPERATOR" className="rounded-md border border-border bg-background px-3 py-2 text-sm">
              {roleOptions
                .filter((role) => admin.roleCode === "SUPER_ADMIN" || role.code !== "SUPER_ADMIN")
                .map((role) => (
                  <option key={role.id} value={role.code}>
                    {role.name}
                  </option>
                ))}
            </select>
            <select name="companyId" defaultValue="" className="rounded-md border border-border bg-background px-3 py-2 text-sm">
              <option value="">No company assignment</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-slate-700">
              <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4 rounded border-border" />
              Active account
            </label>
            <div className="md:col-span-3">
              <Button type="submit">Create User</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle>User Directory</CardTitle>
          <CardDescription>Filter by person, email, role, company, and account state.</CardDescription>
          <form className="grid gap-3 md:grid-cols-6">
            <Input name="q" defaultValue={query} placeholder="Search name, email, company" className="md:col-span-2" />
            <select name="role" defaultValue={roleFilter} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
              <option value="ALL">All roles</option>
              {roleOptions.map((role) => (
                <option key={role.id} value={role.code}>
                  {role.name}
                </option>
              ))}
            </select>
            <select name="company" defaultValue={companyFilter} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
              <option value="ALL">All companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            <select name="state" defaultValue={stateFilter} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
              <option value="ALL">Any status</option>
              <option value="ACTIVE">Active only</option>
              <option value="INACTIVE">Inactive only</option>
            </select>
            <Button type="submit" variant="outline">
              Apply Filters
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length ? (
                users.map((user) => {
                  const canManageSuperAdmin = admin.roleCode === "SUPER_ADMIN";
                  const isSuperAdminTarget = user.role.code === "SUPER_ADMIN";
                  const canManageRole = user.id !== admin.id && (!isSuperAdminTarget || canManageSuperAdmin);
                  const canToggleState = user.id !== admin.id && (!isSuperAdminTarget || canManageSuperAdmin);

                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.fullName}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.role.name}</TableCell>
                      <TableCell>{user.company?.name ?? "N/A"}</TableCell>
                      <TableCell>
                        <StatusBadge tone={user.isActive ? "success" : "danger"} label={user.isActive ? "Active" : "Inactive"} />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <form action={updateUserAssignmentAction} className="grid gap-2 rounded-md border border-border p-2">
                            <input type="hidden" name="userId" value={user.id} />
                            <select
                              name="roleCode"
                              defaultValue={user.role.code}
                              className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                              disabled={!canManageRole}
                            >
                              {roleOptions
                                .filter((role) => canManageSuperAdmin || role.code !== "SUPER_ADMIN")
                                .map((role) => (
                                  <option key={role.id} value={role.code}>
                                    {role.name}
                                  </option>
                                ))}
                            </select>
                            <select
                              name="companyId"
                              defaultValue={user.companyId ?? ""}
                              className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                              disabled={!canManageRole}
                            >
                              <option value="">No company assignment</option>
                              {companies.map((company) => (
                                <option key={company.id} value={company.id}>
                                  {company.name}
                                </option>
                              ))}
                            </select>
                            <label className="flex items-center gap-2 text-xs text-slate-700">
                              <input
                                type="checkbox"
                                name="isActive"
                                defaultChecked={user.isActive}
                                className="h-4 w-4 rounded border-border"
                                disabled={!canToggleState}
                              />
                              Active
                            </label>
                            <Button size="sm" disabled={!canManageRole && !canToggleState}>Save</Button>
                          </form>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    No users matched the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
