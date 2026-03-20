import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const ALLOWED_EXTENSIONS = new Set(["pdf", "doc", "docx"]);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

export const DOCUMENT_UPLOAD_POLICY = {
  allowedExtensions: ["pdf", "doc", "docx"],
  maxFileSizeMb: 10
} as const;

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function extensionOf(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return ext;
}

export function validateUploadFile(file: File) {
  if (!file || !file.name) {
    throw new Error("Please select a document to upload.");
  }

  const ext = extensionOf(file.name);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error("Only PDF, DOC and DOCX files are allowed.");
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("File size must not exceed 10MB.");
  }
}

function buildRelativeStoragePath(applicationId: string, requirementId: string, originalName: string) {
  const timestamp = Date.now();
  const safeName = sanitizeFileName(originalName);
  return path.join("applications", applicationId, requirementId, `${timestamp}-${safeName}`);
}

export function matchesRequirement(document: { storagePath: string; requirementId: string | null }, requirementId: string) {
  if (document.requirementId) {
    return document.requirementId === requirementId;
  }

  const normalized = document.storagePath.replace(/\\/g, "/");
  return normalized.includes(`/${requirementId}/`);
}

export function computeLatestUploadsByRequirement(
  requirements: Array<{ id: string }>,
  documents: Array<{ id: string; fileName: string; storagePath: string; requirementId: string | null; uploadedAt: Date }>
) {
  return Object.fromEntries(
    requirements.map((requirement) => {
      const latest = documents
        .filter((document) => matchesRequirement(document, requirement.id))
        .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0];
      return [requirement.id, latest ?? null];
    })
  );
}

export async function saveApplicationDocument(params: {
  applicationId: string;
  requirementId: string;
  uploadedByUserId: string;
  file: File;
}) {
  validateUploadFile(params.file);

  const buffer = Buffer.from(await params.file.arrayBuffer());
  const relativeStoragePath = buildRelativeStoragePath(params.applicationId, params.requirementId, params.file.name);
  const absoluteStoragePath = path.join(UPLOAD_ROOT, relativeStoragePath);

  await mkdir(path.dirname(absoluteStoragePath), { recursive: true });
  await writeFile(absoluteStoragePath, buffer);

  return prisma.applicationDocument.create({
    data: {
      applicationId: params.applicationId,
      requirementId: params.requirementId,
      uploadedByUserId: params.uploadedByUserId,
      fileName: params.file.name,
      mimeType: params.file.type || "application/octet-stream",
      storagePath: relativeStoragePath.replace(/\\/g, "/")
    }
  });
}

export async function getMissingRequiredDocuments(
  tx: Prisma.TransactionClient,
  applicationId: string,
  serviceTypeId: string
) {
  const [requirements, documents] = await Promise.all([
    tx.serviceDocumentRequirement.findMany({
      where: { serviceTypeId, isRequired: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true }
    }),
    tx.applicationDocument.findMany({
      where: { applicationId },
      select: { storagePath: true, requirementId: true }
    })
  ]);

  return requirements
    .filter((requirement) => !documents.some((document) => matchesRequirement(document, requirement.id)))
    .map((requirement) => requirement.name);
}
