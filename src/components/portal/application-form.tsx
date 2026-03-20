"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ServiceField } from "@/lib/portal-application";

type ApplicationFormProps = {
  title: string;
  description: string;
  companyName: string;
  companyRcNumber: string;
  fields: ServiceField[];
  initialValues?: Record<string, string>;
  saveDraftAction: (formData: FormData) => void;
  submitAction: (formData: FormData) => void;
};

export function ApplicationForm({
  title,
  description,
  companyName,
  companyRcNumber,
  fields,
  initialValues,
  saveDraftAction,
  submitAction
}: ApplicationFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-medium text-slate-900">Company Context</p>
          <p>{companyName}</p>
          <p>RC Number: {companyRcNumber}</p>
        </div>

        {fields.length ? (
          <form className="space-y-5">
            {fields.map((field) => (
              <label key={field.key} className="block space-y-2">
                <span className="text-sm font-medium text-slate-900">
                  {field.label}
                  {field.required ? <span className="text-rose-600"> *</span> : null}
                </span>
                {field.type === "textarea" ? (
                  <textarea
                    name={field.key}
                    required={field.required}
                    placeholder={field.placeholder}
                    defaultValue={initialValues?.[field.key] ?? ""}
                    rows={4}
                    className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                ) : field.type === "select" ? (
                  <select
                    name={field.key}
                    required={field.required}
                    defaultValue={initialValues?.[field.key] ?? ""}
                    className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Select an option</option>
                    {(field.options ?? []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    name={field.key}
                    type={field.type}
                    required={field.required}
                    placeholder={field.placeholder}
                    defaultValue={initialValues?.[field.key] ?? ""}
                  />
                )}
                {field.helpText ? <p className="text-xs text-muted-foreground">{field.helpText}</p> : null}
              </label>
            ))}

            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="submit" formAction={saveDraftAction} variant="outline">
                Save Draft
              </Button>
              <Button type="submit" formAction={submitAction}>
                Submit Application
              </Button>
            </div>
          </form>
        ) : (
          <div className="rounded-md border border-dashed border-border bg-slate-50 p-4 text-sm text-slate-700">
            No application form fields are configured for this service yet. Please contact an administrator to configure
            fields in the Admin Console before creating this application.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
