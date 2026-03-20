import { DecisionType } from "@prisma/client";
import { NextResponse } from "next/server";

import { buildAcknowledgementPdf, buildDecisionPdf } from "@/lib/letters";
import { requirePortalUser } from "@/lib/portal-application";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const acknowledgementEligibleStates = new Set(["SUBMITTED", "IN_REVIEW", "CLARIFICATION_REQUIRED", "APPROVED", "REJECTED"]);

export async function GET(
  _request: Request,
  context: { params: { id: string; letterType: string } }
) {
  const user = await requirePortalUser();

  const application = await prisma.application.findFirst({
    where: {
      id: context.params.id,
      companyId: user.companyId ?? ""
    },
    include: {
      company: true,
      serviceType: true,
      decisionLetters: {
        include: {
          issuedBy: {
            select: {
              fullName: true
            }
          }
        },
        orderBy: {
          issuedAt: "desc"
        }
      }
    }
  });

  if (!application) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  if (context.params.letterType === "acknowledgement") {
    if (!acknowledgementEligibleStates.has(application.state)) {
      return NextResponse.json({ error: "Acknowledgement letter is not available for this application state." }, { status: 400 });
    }

    const { buffer, fileName } = buildAcknowledgementPdf({
      applicationReference: application.referenceNo,
      companyName: application.company.name,
      serviceType: application.serviceType.name,
      submissionDate: application.submittedAt ?? application.createdAt
    });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`
      }
    });
  }

  const decisionType: DecisionType | null =
    context.params.letterType === "approval"
      ? "APPROVAL"
      : context.params.letterType === "rejection"
        ? "REJECTION"
        : null;

  if (!decisionType) {
    return NextResponse.json({ error: "Unsupported letter type." }, { status: 404 });
  }

  const decisionLetter = application.decisionLetters.find((entry) => entry.decisionType === decisionType);

  if (!decisionLetter) {
    return NextResponse.json({ error: "Decision letter has not been generated yet." }, { status: 404 });
  }

  const { buffer, fileName } = buildDecisionPdf({
    applicationReference: application.referenceNo,
    companyName: application.company.name,
    serviceType: application.serviceType.name,
    summary: decisionLetter.summary,
    issuedBy: decisionLetter.issuedBy.fullName,
    issuedAt: decisionLetter.issuedAt,
    letterRef: decisionLetter.letterRef,
    decisionType: decisionLetter.decisionType
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`
    }
  });
}
