"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { logAccess } from "@/lib/audit";

async function getCurrentDoctorOrThrow() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  const doctor = await prisma.doctor.findUnique({ where: { userId: session.user.id } });
  if (!doctor) throw new Error("Doctor profile not found");
  return { doctor, session };
}

export type ActionState = { success: boolean; error?: string };

const releaseSchema = z.object({
  labResultId: z.string().min(1),
  doctorNotes: z.string().optional(),
});

export async function releaseLabResult(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { doctor, session } = await getCurrentDoctorOrThrow();

  const parsed = releaseSchema.safeParse({
    labResultId: formData.get("labResultId"),
    doctorNotes: formData.get("doctorNotes") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: "Invalid submission." };
  }

  const labResult = await prisma.labResult.findUnique({
    where: { id: parsed.data.labResultId },
    include: { patient: true },
  });

  if (!labResult || labResult.doctorId !== doctor.id) {
    return { success: false, error: "Lab result not found or not assigned to you." };
  }

  await prisma.labResult.update({
    where: { id: labResult.id },
    data: {
      doctorNotes: parsed.data.doctorNotes,
      isReleased: true,
      reviewedAt: new Date(),
      reviewedByUserId: session.user.id,
    },
  });

  await createNotification(
    labResult.patient.userId,
    "LAB_RESULT_AVAILABLE",
    "Lab Results Available",
    `Your ${labResult.testName} results have been reviewed and are ready to view.`,
    labResult.id
  );

  await logAccess(session.user.id, "UPDATE", "LabResult", `Released ${labResult.testName} results to patient`, {
    patientId: labResult.patientId,
    resourceId: labResult.id,
  });

  revalidatePath("/doctor-lab-review");
  return { success: true };
}
