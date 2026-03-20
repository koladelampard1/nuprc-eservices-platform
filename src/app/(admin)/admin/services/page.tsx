import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNaira } from "@/lib/payment";
import { prisma } from "@/lib/prisma";

import {
  createServiceFormFieldAction,
  createRequirementAction,
  createServiceTypeAction,
  deleteServiceTypeAction,
  deleteServiceFormFieldAction,
  deleteRequirementAction,
  moveServiceFormFieldAction,
  toggleServiceTypeActiveAction,
  updateServiceFormFieldAction,
  updateRequirementAction,
  updateServiceTypeAction
} from "./actions";

function toSafeMessage(message?: string) {
  if (!message) return null;
  return message.length > 200 ? `${message.slice(0, 200)}...` : message;
}

export default async function AdminServicesPage({
  searchParams
}: {
  searchParams: { service?: string; success?: string; error?: string };
}) {
  const services = await prisma.serviceType.findMany({
    include: {
      formFields: {
        orderBy: [{ sortOrder: "asc" }, { fieldLabel: "asc" }]
      },
      documentRequirements: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          documents: {
            select: { id: true }
          }
        }
      },
      _count: {
        select: {
          applications: true
        }
      }
    },
    orderBy: { name: "asc" }
  });

  const activeServiceId =
    services.find((service) => service.id === searchParams.service)?.id ??
    services[0]?.id;

  const activeService = services.find((service) => service.id === activeServiceId) ?? null;

  return (
    <section className="space-y-6">
      <PageHeader title="Services" description="Manage service catalogue configuration, activation, and required documents." />

      {searchParams.success ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{toSafeMessage(searchParams.success)}</p>
      ) : null}
      {searchParams.error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{toSafeMessage(searchParams.error)}</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Application Form Fields</CardTitle>
          <CardDescription>
            {activeService
              ? `Define dynamic application form fields for ${activeService.name}.`
              : "Select a service type to configure application form fields."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeService ? (
            <>
              <form action={createServiceFormFieldAction} className="grid gap-3 rounded-lg border border-dashed border-border p-4 md:grid-cols-6">
                <input type="hidden" name="serviceTypeId" value={activeService.id} />
                <Input name="fieldKey" placeholder="Field key (e.g. contactPerson)" required />
                <Input name="fieldLabel" placeholder="Field label" required />
                <select name="fieldType" defaultValue="TEXT" className="rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <option value="TEXT">Text</option>
                  <option value="TEXTAREA">Textarea</option>
                  <option value="DATE">Date</option>
                  <option value="NUMBER">Number</option>
                  <option value="SELECT">Select</option>
                </select>
                <Input name="sortOrder" type="number" placeholder="Sort order" defaultValue="0" />
                <Input name="placeholder" placeholder="Placeholder (optional)" />
                <label className="flex items-center gap-2 rounded-md border border-border px-3 text-sm text-slate-700">
                  <input type="checkbox" name="isRequired" className="h-4 w-4 rounded border-border" />
                  Required
                </label>
                <Input name="helpText" placeholder="Help text (optional)" className="md:col-span-3" />
                <Input
                  name="selectOptions"
                  placeholder="Select options (newline separated, for select type)"
                  className="md:col-span-2"
                />
                <div>
                  <Button type="submit" size="sm">Add Field</Button>
                </div>
              </form>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Label</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeService.formFields.length ? (
                    activeService.formFields.map((field) => (
                      <TableRow key={field.id}>
                        <TableCell className="font-medium">{field.fieldLabel}</TableCell>
                        <TableCell>{field.fieldKey}</TableCell>
                        <TableCell>{field.fieldType}</TableCell>
                        <TableCell>
                          <StatusBadge tone={field.isRequired ? "warning" : "default"} label={field.isRequired ? "Yes" : "No"} />
                        </TableCell>
                        <TableCell>{field.sortOrder}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <form action={moveServiceFormFieldAction}>
                              <input type="hidden" name="serviceTypeId" value={activeService.id} />
                              <input type="hidden" name="fieldId" value={field.id} />
                              <input type="hidden" name="direction" value="up" />
                              <Button size="sm" type="submit" variant="outline">Up</Button>
                            </form>
                            <form action={moveServiceFormFieldAction}>
                              <input type="hidden" name="serviceTypeId" value={activeService.id} />
                              <input type="hidden" name="fieldId" value={field.id} />
                              <input type="hidden" name="direction" value="down" />
                              <Button size="sm" type="submit" variant="outline">Down</Button>
                            </form>
                          </div>
                          <details className="mt-2">
                            <summary className="cursor-pointer text-sm font-medium text-primary">Edit</summary>
                            <div className="mt-2 space-y-2 rounded-md border border-border p-3">
                              <form action={updateServiceFormFieldAction} className="space-y-2">
                                <input type="hidden" name="serviceTypeId" value={activeService.id} />
                                <input type="hidden" name="fieldId" value={field.id} />
                                <Input name="fieldKey" defaultValue={field.fieldKey} required />
                                <Input name="fieldLabel" defaultValue={field.fieldLabel} required />
                                <select
                                  name="fieldType"
                                  defaultValue={field.fieldType}
                                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                                >
                                  <option value="TEXT">Text</option>
                                  <option value="TEXTAREA">Textarea</option>
                                  <option value="DATE">Date</option>
                                  <option value="NUMBER">Number</option>
                                  <option value="SELECT">Select</option>
                                </select>
                                <Input name="sortOrder" type="number" defaultValue={field.sortOrder} />
                                <Input name="placeholder" defaultValue={field.placeholder ?? ""} placeholder="Placeholder" />
                                <Input name="helpText" defaultValue={field.helpText ?? ""} placeholder="Help text" />
                                <textarea
                                  name="selectOptions"
                                  defaultValue={field.selectOptions ?? ""}
                                  rows={3}
                                  className="w-full rounded-md border border-border px-3 py-2 text-sm"
                                  placeholder="Select options (one per line)"
                                />
                                <label className="flex items-center gap-2 text-sm text-slate-700">
                                  <input
                                    type="checkbox"
                                    name="isRequired"
                                    className="h-4 w-4 rounded border-border"
                                    defaultChecked={field.isRequired}
                                  />
                                  Required
                                </label>
                                <Button type="submit" size="sm">Save Field</Button>
                              </form>

                              <form action={deleteServiceFormFieldAction}>
                                <input type="hidden" name="serviceTypeId" value={activeService.id} />
                                <input type="hidden" name="fieldId" value={field.id} />
                                <Button type="submit" size="sm" variant="outline">Delete Field</Button>
                              </form>
                            </div>
                          </details>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground">
                        No application form fields configured. Add one to enable this service form in the operator portal.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No services found. Create one first.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Service Type Directory</CardTitle>
          <CardDescription>Configure visible services, fees, and their operational status.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Payment Required</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applications</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => {
                const paymentRequired = service.baseFeeNgn.toNumber() > 0;
                return (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.code}</TableCell>
                    <TableCell>{service.name}</TableCell>
                    <TableCell>{formatNaira(service.baseFeeNgn)}</TableCell>
                    <TableCell>
                      <StatusBadge tone={paymentRequired ? "info" : "default"} label={paymentRequired ? "Yes" : "No"} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={service.isActive ? "success" : "danger"} label={service.isActive ? "Active" : "Inactive"} />
                    </TableCell>
                    <TableCell>{service._count.applications}</TableCell>
                    <TableCell>
                <div className="flex items-center gap-2">
                        <a href={`/admin/services?service=${service.id}`} className="text-sm font-medium text-primary hover:underline">
                          Manage
                        </a>
                        <form action={toggleServiceTypeActiveAction}>
                          <input type="hidden" name="serviceTypeId" value={service.id} />
                          <Button type="submit" size="sm" variant="outline">
                            {service.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        </form>
                        <form action={deleteServiceTypeAction}>
                          <input type="hidden" name="serviceTypeId" value={service.id} />
                          <Button type="submit" size="sm" variant="outline">
                            Delete
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create Service Type</CardTitle>
            <CardDescription>Add a new service type to the application portal catalogue.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createServiceTypeAction} className="space-y-3">
              <Input name="code" placeholder="Code (e.g. LTO)" required />
              <Input name="name" placeholder="Service Name" required />
              <Input name="description" placeholder="Description" required />
              <Input name="baseFeeNgn" type="number" step="0.01" min="0" placeholder="Base Fee (NGN)" defaultValue="0" />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="paymentRequired" className="h-4 w-4 rounded border-border" />
                Payment required for this service
              </label>
              <div className="space-y-2 rounded-md border border-dashed border-border p-3">
                <p className="text-sm font-medium text-slate-900">Initial application fields (optional)</p>
                <p className="text-xs text-muted-foreground">
                  Configure up to three fields as part of service creation. You can add/edit more fields later from the Application Form Fields section.
                </p>
                {[0, 1, 2].map((index) => (
                  <div key={index} className="grid gap-2 rounded-md border border-border/50 p-2 md:grid-cols-7">
                    <Input name="fieldKey[]" placeholder="fieldKey" />
                    <Input name="fieldLabel[]" placeholder="Field label" />
                    <select name="fieldType[]" defaultValue="TEXT" className="rounded-md border border-border bg-background px-2 py-2 text-sm">
                      <option value="TEXT">Text</option>
                      <option value="TEXTAREA">Textarea</option>
                      <option value="DATE">Date</option>
                      <option value="NUMBER">Number</option>
                      <option value="SELECT">Select</option>
                    </select>
                    <select name="required[]" defaultValue="false" className="rounded-md border border-border bg-background px-2 py-2 text-sm">
                      <option value="false">Optional</option>
                      <option value="true">Required</option>
                    </select>
                    <Input name="sortOrder[]" type="number" placeholder="Sort" defaultValue={String(index)} />
                    <Input name="placeholder[]" placeholder="Placeholder" />
                    <Input name="helpText[]" placeholder="Help text" />
                    <div className="md:col-span-7">
                      <Input name="selectOptions[]" placeholder="Select options (newline separated; select fields only)" />
                    </div>
                  </div>
                ))}
              </div>
              <Button type="submit">Create Service Type</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Edit Service Type</CardTitle>
            <CardDescription>
              {activeService ? `Editing ${activeService.name} (${activeService.code})` : "Select a service to edit."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeService ? (
              <form action={updateServiceTypeAction} className="space-y-3">
                <input type="hidden" name="serviceTypeId" value={activeService.id} />
                <Input name="code" defaultValue={activeService.code} required />
                <Input name="name" defaultValue={activeService.name} required />
                <Input name="description" defaultValue={activeService.description} required />
                <Input
                  name="baseFeeNgn"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={activeService.baseFeeNgn.toFixed(2)}
                />
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="paymentRequired"
                    className="h-4 w-4 rounded border-border"
                    defaultChecked={activeService.baseFeeNgn.toNumber() > 0}
                  />
                  Payment required for this service
                </label>
                <Button type="submit">Save Service Type</Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">No service type available to edit.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Required Document Management</CardTitle>
          <CardDescription>
            {activeService
              ? `Define document requirements for ${activeService.name}.`
              : "Select a service type to view and manage its required documents."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeService ? (
            <>
              <form action={createRequirementAction} className="grid gap-3 rounded-lg border border-dashed border-border p-4 md:grid-cols-5">
                <input type="hidden" name="serviceTypeId" value={activeService.id} />
                <Input name="name" placeholder="Document name" required className="md:col-span-2" />
                <Input name="description" placeholder="Description" className="md:col-span-2" />
                <div className="grid grid-cols-2 gap-2 md:col-span-1">
                  <Input name="sortOrder" type="number" placeholder="Sort" defaultValue="0" />
                  <label className="flex items-center gap-2 rounded-md border border-border px-3 text-sm text-slate-700">
                    <input type="checkbox" name="isRequired" defaultChecked className="h-4 w-4 rounded border-border" />
                    Required
                  </label>
                </div>
                <div className="md:col-span-5">
                  <Button type="submit" size="sm">Add Requirement</Button>
                </div>
              </form>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Uploads</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeService.documentRequirements.length ? (
                    activeService.documentRequirements.map((requirement) => (
                      <TableRow key={requirement.id}>
                        <TableCell className="font-medium">{requirement.name}</TableCell>
                        <TableCell>{requirement.description || "—"}</TableCell>
                        <TableCell>{requirement.sortOrder}</TableCell>
                        <TableCell>
                          <StatusBadge tone={requirement.isRequired ? "warning" : "default"} label={requirement.isRequired ? "Yes" : "No"} />
                        </TableCell>
                        <TableCell>{requirement.documents.length}</TableCell>
                        <TableCell>
                          <details>
                            <summary className="cursor-pointer text-sm font-medium text-primary">Edit</summary>
                            <div className="mt-2 space-y-2 rounded-md border border-border p-3">
                              <form action={updateRequirementAction} className="space-y-2">
                                <input type="hidden" name="serviceTypeId" value={activeService.id} />
                                <input type="hidden" name="requirementId" value={requirement.id} />
                                <Input name="name" defaultValue={requirement.name} required />
                                <Input name="description" defaultValue={requirement.description ?? ""} />
                                <Input name="sortOrder" type="number" defaultValue={requirement.sortOrder} />
                                <label className="flex items-center gap-2 text-sm text-slate-700">
                                  <input
                                    type="checkbox"
                                    name="isRequired"
                                    className="h-4 w-4 rounded border-border"
                                    defaultChecked={requirement.isRequired}
                                  />
                                  Required
                                </label>
                                <div className="flex items-center gap-2">
                                  <Button type="submit" size="sm">Save</Button>
                                </div>
                              </form>

                              <form action={deleteRequirementAction}>
                                <input type="hidden" name="serviceTypeId" value={activeService.id} />
                                <input type="hidden" name="requirementId" value={requirement.id} />
                                <Button type="submit" size="sm" variant="outline" disabled={requirement.documents.length > 0}>
                                  Delete
                                </Button>
                              </form>
                            </div>
                          </details>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-muted-foreground">
                        No requirements configured for this service yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No services found. Create one first.</p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
