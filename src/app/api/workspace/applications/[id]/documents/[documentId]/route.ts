import path from "node:path";
import { readFile } from "node:fs/promises";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireWorkspaceUser } from "@/lib/workspace-review";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: { id: string; documentId: string } }
) {
  await requireWorkspaceUser();

  const document = await prisma.applicationDocument.findFirst({
    where: {
      id: context.params.documentId,
      applicationId: context.params.id
    }
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const absolutePath = path.join(process.cwd(), "uploads", document.storagePath);

  try {
    const fileBuffer = await readFile(absolutePath);

    const disposition = new URL(request.url).searchParams.get("download") === "1" ? "attachment" : "inline";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": document.mimeType || "application/octet-stream",
        "Content-Disposition": `${disposition}; filename="${encodeURIComponent(document.fileName)}"`
      }
    });
  } catch {
    return NextResponse.json({ error: "Stored file is unavailable." }, { status: 404 });
  }
}
