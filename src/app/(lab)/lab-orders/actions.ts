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

const ALLOWED_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/jpg"]);
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

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
    if (!ALLOWED_TYPES.has(file.type)) {
      return { success: false, error: "Only PDF, PNG, or JPEG files are allowed." };
    }
    if (file.size > MAX_FILE_BYTES) {
      return { success: false, error: "File must be under 10MB." };
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const ext = file.name.split(".").pop() || "bin";
    const safeName = `${labResult.id}-${Date.now()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "lab-results");
    await writeFile(path.join(uploadDir, safeName), buffer);

    fileUrl = `/uploads/lab-results/${safeName}`;
    fileName = file.name;
    fileType = file.type;
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
