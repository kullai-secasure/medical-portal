"use server";

import { revalidatePath } from "next/cache";
import { writeFile } from "fs/promises";
import path from "path";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { logAccess } from "@/lib/audit";

async function getCurrentLabTechOrThrow() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  const labTech = await prisma.labTechnician.findUnique({ where: { userId: session.user.id } });
  if (!labTech) throw new Error("Lab technician profile not found");
  return { labTech, session };
}

export type ActionState = { success: boolean; error?: string };

const uploadResultSchema = z.object({
  labResultId: z.string().min(1),
  resultValue: z.string().min(1, "Result value is required"),
  normalRange: z.string().optional(),
  units: z.string().optional(),
  notes: z.string().optional(),
  isAbnormal: z.string().optional(),
});

// The on-disk extension is derived ONLY from this table, never from the
// client-supplied filename — decoupling the two let an attacker upload a
// part labeled Content-Type: image/png but named payload.svg, which was
// then written to public/uploads with a .svg extension and served (and
// rendered/executed) as SVG/HTML by the browser (VenusHawk finding #7).
const EXT_BY_TYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
};

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

// Server-side magic-byte check. The browser-supplied `file.type` is just a
// client claim and can be spoofed independently of the actual bytes, so we
// verify the file's real signature matches the claimed/allowed type before
// trusting it.
function sniffAllowedType(buffer: Buffer): string | null {
  if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return "application/pdf"; // %PDF
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png"; // \x89PNG
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg"; // \xFF\xD8\xFF
  }
  return null;
}

export async function uploadLabResult(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { session } = await getCurrentLabTechOrThrow();

  const parsed = uploadResultSchema.safeParse({
    labResultId: formData.get("labResultId"),
    resultValue: formData.get("resultValue"),
    normalRange: formData.get("normalRange") || undefined,
    units: formData.get("units") || undefined,
    notes: formData.get("notes") || undefined,
    isAbnormal: formData.get("isAbnormal") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid submission." };
  }

  const labResult = await prisma.labResult.findUnique({ where: { id: parsed.data.labResultId } });
  if (!labResult) {
    return { success: false, error: "Lab order not found." };
  }

  const file = formData.get("file") as File | null;
  let fileUrl: string | undefined;
  let fileName: string | undefined;
  let fileType: string | undefined;

  if (file && file.size > 0) {
    if (file.size > MAX_FILE_BYTES) {
      return { success: false, error: "File must be under 10MB." };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const detectedType = sniffAllowedType(buffer);
    if (!detectedType || !EXT_BY_TYPE[detectedType]) {
      return { success: false, error: "Only PDF, PNG, or JPEG files are allowed." };
    }

    const ext = EXT_BY_TYPE[detectedType];
    const safeName = `${labResult.id}-${Date.now()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "lab-results");
    await writeFile(path.join(uploadDir, safeName), buffer);

    fileUrl = `/uploads/lab-results/${safeName}`;
    // The original filename is kept only as a display label — it is never
    // used to choose the on-disk extension or content type.
    fileName = file.name;
    fileType = detectedType;
  }

  await prisma.labResult.update({
    where: { id: labResult.id },
    data: {
      resultValue: parsed.data.resultValue,
      normalRange: parsed.data.normalRange,
      units: parsed.data.units,
      notes: parsed.data.notes,
      status: parsed.data.isAbnormal === "true" ? "ABNORMAL" : "COMPLETED",
      resultDate: new Date(),
      fileUrl: fileUrl ?? labResult.fileUrl,
      fileName: fileName ?? labResult.fileName,
      fileType: fileType ?? labResult.fileType,
    },
  });

  await logAccess(session.user.id, "UPDATE", "LabResult", `Uploaded result for ${labResult.testName}`, {
    patientId: labResult.patientId,
    resourceId: labResult.id,
  });

  revalidatePath("/lab-orders");
  revalidatePath("/doctor-lab-review");
  return { success: true };
}
