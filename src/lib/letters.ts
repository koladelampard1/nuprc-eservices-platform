import { DecisionType, Prisma } from "@prisma/client";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT_MARGIN = 56;
const TOP_MARGIN = 72;
const FONT_SIZE = 11;
const LINE_HEIGHT = 16;

type DecisionLetterPayload = {
  applicationReference: string;
  companyName: string;
  serviceType: string;
  summary: string;
  issuedBy: string;
  issuedAt: Date;
  letterRef: string;
  decisionType: DecisionType;
};

type AcknowledgementPayload = {
  applicationReference: string;
  companyName: string;
  serviceType: string;
  submissionDate: Date;
};

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(text: string, maxChars = 85) {
  if (!text.trim()) return [""];

  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
    } else {
      lines.push(word.slice(0, maxChars));
      current = word.slice(maxChars);
    }
  }

  if (current) lines.push(current);
  return lines;
}

function drawLine(lines: string[], text: string, fontSize = FONT_SIZE) {
  lines.push(`/${fontSize === 16 ? "F2" : "F1"} ${fontSize} Tf`);
  lines.push(`${LEFT_MARGIN} 0 Td`);
  lines.push(`(${escapePdfText(text)}) Tj`);
  lines.push(`${-LEFT_MARGIN} -${LINE_HEIGHT} Td`);
}

function createPdf(lines: string[], outputName: string) {
  const content = [
    "BT",
    `/F1 ${FONT_SIZE} Tf`,
    `${LEFT_MARGIN} ${PAGE_HEIGHT - TOP_MARGIN} Td`,
    ...lines,
    "ET"
  ].join("\n");

  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n",
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n`,
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n",
    `6 0 obj\n<< /Length ${Buffer.byteLength(content, "utf8")} >>\nstream\n${content}\nendstream\nendobj\n`
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += object;
  }

  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return {
    buffer: Buffer.from(pdf, "utf8"),
    fileName: outputName
  };
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "long" }).format(date);
}

export function buildAcknowledgementPdf(payload: AcknowledgementPayload) {
  const lines: string[] = [];

  drawLine(lines, "NIGERIAN UPSTREAM PETROLEUM REGULATORY COMMISSION", 16);
  drawLine(lines, "DIGITAL E-SERVICES PLATFORM", 11);
  drawLine(lines, " ");
  drawLine(lines, "APPLICATION ACKNOWLEDGEMENT LETTER", 11);
  drawLine(lines, " ");
  drawLine(lines, `Date: ${formatDate(new Date())}`);
  drawLine(lines, `Application Reference: ${payload.applicationReference}`);
  drawLine(lines, `Company Name: ${payload.companyName}`);
  drawLine(lines, `Service Type: ${payload.serviceType}`);
  drawLine(lines, `Submission Date: ${formatDate(payload.submissionDate)}`);
  drawLine(lines, " ");

  for (const line of wrapText("This is to acknowledge receipt of your application on the NUPRC Digital E-Services Platform. Your submission has been logged and will proceed through the applicable technical and regulatory review workflow.")) {
    drawLine(lines, line);
  }

  drawLine(lines, " ");
  for (const line of wrapText("Please quote the application reference in all related correspondence. You will be notified of any clarification requests or final decisions through the platform.")) {
    drawLine(lines, line);
  }

  drawLine(lines, " ");
  drawLine(lines, "For: Nigerian Upstream Petroleum Regulatory Commission");
  drawLine(lines, "__________________________________________");
  drawLine(lines, "E-Services Secretariat");

  return createPdf(lines, `${payload.applicationReference}-acknowledgement.pdf`);
}

export function buildDecisionPdf(payload: DecisionLetterPayload) {
  const heading = payload.decisionType === "APPROVAL" ? "APPROVAL DECISION LETTER" : "REJECTION DECISION LETTER";
  const lines: string[] = [];

  drawLine(lines, "NIGERIAN UPSTREAM PETROLEUM REGULATORY COMMISSION", 16);
  drawLine(lines, "DIGITAL E-SERVICES PLATFORM", 11);
  drawLine(lines, " ");
  drawLine(lines, heading, 11);
  drawLine(lines, " ");
  drawLine(lines, `Letter Reference: ${payload.letterRef}`);
  drawLine(lines, `Application Reference: ${payload.applicationReference}`);
  drawLine(lines, `Company Name: ${payload.companyName}`);
  drawLine(lines, `Service Type: ${payload.serviceType}`);
  drawLine(lines, `Decision Type: ${payload.decisionType}`);
  drawLine(lines, `Issued Date: ${formatDate(payload.issuedAt)}`);
  drawLine(lines, `Issued By: ${payload.issuedBy}`);
  drawLine(lines, " ");

  const summaryTitle = payload.decisionType === "APPROVAL" ? "Decision Summary / Conditions:" : "Decision Summary / Reason:";
  drawLine(lines, summaryTitle);

  for (const line of wrapText(payload.summary || "No additional summary provided.")) {
    drawLine(lines, line);
  }

  drawLine(lines, " ");
  drawLine(lines, "This letter is issued electronically via the NUPRC Digital E-Services Platform.");
  drawLine(lines, "__________________________________________");
  drawLine(lines, payload.issuedBy);
  drawLine(lines, "Director, NUPRC");

  const suffix = payload.decisionType === "APPROVAL" ? "approval" : "rejection";
  return createPdf(lines, `${payload.applicationReference}-${suffix}-letter.pdf`);
}

export async function generateDecisionLetterReference(tx: Prisma.TransactionClient, issuedAt: Date) {
  const year = issuedAt.getUTCFullYear();
  const prefix = `NUPRC-DL-${year}-`;
  const latest = await tx.decisionLetter.findFirst({
    where: {
      letterRef: {
        startsWith: prefix
      }
    },
    orderBy: {
      letterRef: "desc"
    },
    select: {
      letterRef: true
    }
  });

  const current = Number(latest?.letterRef.split("-").at(-1) ?? 0);
  return `${prefix}${String(current + 1).padStart(4, "0")}`;
}
