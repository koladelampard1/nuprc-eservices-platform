import { ApplicationState, ReviewActionType } from "@prisma/client";

import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { stateToneMap } from "@/lib/workspace-review";

const stageDescriptions: Record<ApplicationState, string> = {
  DRAFT: "Application is being prepared by applicant and can still be edited.",
  SUBMITTED: "Application has been submitted and awaits assignment/review.",
  IN_REVIEW: "Application is under internal technical/regulatory review.",
  CLARIFICATION_REQUIRED: "Applicant must address clarification request before review continues.",
  APPROVED: "Application has completed approvals and can trigger decision letter flows.",
  REJECTED: "Application did not meet requirements and is closed as rejected."
};

const reviewActionLabels: Record<ReviewActionType, string> = {
  ASSIGNED: "Application assigned to reviewer.",
  COMMENTED: "Reviewer comment captured on file.",
  RETURNED_FOR_CLARIFICATION: "Clarification requested from portal applicant.",
  RECOMMENDED_APPROVAL: "Reviewer recommended approval.",
  RECOMMENDED_REJECTION: "Reviewer recommended rejection.",
  FINAL_APPROVAL: "Director issued final approval.",
  FINAL_REJECTION: "Director issued final rejection."
};

export default async function AdminWorkflowSettingsPage() {
  return (
    <section className="space-y-6">
      <PageHeader
        title="Workflow Settings"
        description="Reference view of current workflow stages and review actions used by the platform."
      />

      <Card>
        <CardHeader>
          <CardTitle>Application Stages</CardTitle>
          <CardDescription>Current finite stages used across application, review, and notification workflows.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stage Code</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.values(ApplicationState).map((state) => (
                <TableRow key={state}>
                  <TableCell className="font-medium">{state}</TableCell>
                  <TableCell>
                    <StatusBadge tone={stateToneMap[state]} label={state.replaceAll("_", " ")} />
                  </TableCell>
                  <TableCell>{stageDescriptions[state]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Review Actions</CardTitle>
          <CardDescription>Action events captured as reviewers and directors progress each application.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action Type</TableHead>
                <TableHead>Operational Meaning</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.values(ReviewActionType).map((action) => (
                <TableRow key={action}>
                  <TableCell className="font-medium">{action}</TableCell>
                  <TableCell>{reviewActionLabels[action]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
