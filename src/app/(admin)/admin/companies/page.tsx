import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";

import { createCompanyAction, updateCompanyAction } from "./actions";

function safeText(value?: string) {
  if (!value) return null;
  return value.length > 200 ? `${value.slice(0, 200)}...` : value;
}

export default async function AdminCompaniesPage({
  searchParams
}: {
  searchParams: { company?: string; success?: string; error?: string };
}) {
  const companies = await prisma.company.findMany({
    include: {
      _count: {
        select: {
          users: true,
          applications: true
        }
      }
    },
    orderBy: { name: "asc" }
  });

  const activeCompanyId = companies.find((company) => company.id === searchParams.company)?.id ?? companies[0]?.id;
  const activeCompany = companies.find((company) => company.id === activeCompanyId) ?? null;

  return (
    <section className="space-y-6">
      <PageHeader title="Companies" description="Create and maintain organization records used for portal account assignment and applications." />

      {searchParams.success ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{safeText(searchParams.success)}</p>
      ) : null}
      {searchParams.error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{safeText(searchParams.error)}</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Company Directory</CardTitle>
          <CardDescription>Review company profile data and related usage at a glance.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>RC Number</TableHead>
                <TableHead>Contact Email</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Applications</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.length ? (
                companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">{company.name}</TableCell>
                    <TableCell>{company.rcNumber}</TableCell>
                    <TableCell>{company.contactEmail}</TableCell>
                    <TableCell>{company._count.users}</TableCell>
                    <TableCell>{company._count.applications}</TableCell>
                    <TableCell>
                      <a href={`/admin/companies?company=${company.id}`} className="text-sm font-medium text-primary hover:underline">
                        Edit
                      </a>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    No companies found. Create one to assign company-scoped users.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create Company</CardTitle>
            <CardDescription>Add a new organization profile.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createCompanyAction} className="space-y-3">
              <Input name="name" placeholder="Company name" required />
              <Input name="rcNumber" placeholder="RC Number" required />
              <Input name="contactEmail" type="email" placeholder="Contact email" required />
              <Button type="submit">Create Company</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Edit Company</CardTitle>
            <CardDescription>{activeCompany ? `Editing ${activeCompany.name}` : "Select a company to edit."}</CardDescription>
          </CardHeader>
          <CardContent>
            {activeCompany ? (
              <form action={updateCompanyAction} className="space-y-3">
                <input type="hidden" name="companyId" value={activeCompany.id} />
                <Input name="name" defaultValue={activeCompany.name} required />
                <Input name="rcNumber" defaultValue={activeCompany.rcNumber} required />
                <Input name="contactEmail" type="email" defaultValue={activeCompany.contactEmail} required />
                <Button type="submit">Save Company</Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">No company available to edit.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
