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

const createPrescriptionSchema = z.object({
  patientId: z.string().min(1),
  medicationName: z.string().min(1),
  dosage: z.string().min(1),
  frequency: z.string().min(1),
  instructions: z.string().optional(),
  maxRefills: z.coerce.number().int().min(0).max(12),
});

export async function createPrescription(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { doctor, session } = await getCurrentDoctorOrThrow();

  const parsed = createPrescriptionSchema.safeParse({
    patientId: formData.get("patientId"),
    medicationName: formData.get("medicationName"),
    dosage: formData.get("dosage"),
    frequency: formData.get("frequency"),
    instructions: formData.get("instructions") || undefined,
    maxRefills: formData.get("maxRefills"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid prescription details." };
  }

  const prescription = await prisma.prescription.create({
    data: {
      patientId: parsed.data.patientId,
      doctorId: doctor.id,
      medicationName: parsed.data.medicationName,
      dosage: parsed.data.dosage,
      frequency: parsed.data.frequency,
      instructions: parsed.data.instructions,
      startDate: new Date(),
      refillsRemaining: parsed.data.maxRefills,
      maxRefills: parsed.data.maxRefills,
      status: "ACTIVE",
    },
    include: { patient: true },
  });

  await createNotification(
    prescription.patient.userId,
    "PRESCRIPTION_READY",
    "New Prescription",
    `Dr. ${session.user.name} prescribed you ${prescription.medicationName} (${prescription.dosage}).`,
    prescription.id
  );

  await logAccess(session.user.id, "CREATE", "Prescription", `Prescribed ${prescription.medicationName}`, {
    patientId: parsed.data.patientId,
    resourceId: prescription.id,
  });

  revalidatePath("/doctor-prescriptions");
  return { success: true };
}

export async function respondToRefillRequest(
  refillRequestId: string,
  approve: boolean,
  denialReason?: string
) {
  const { doctor, session } = await getCurrentDoctorOrThrow();

  const refillRequest = await prisma.refillRequest.findUnique({
    where: { id: refillRequestId },
    include: { prescription: true, patient: true },
  });

  if (!refillRequest || refillRequest.prescription.doctorId !== doctor.id) {
    throw new Error("Refill request not found");
  }

  if (approve) {
    await prisma.$transaction([
      prisma.refillRequest.update({
        where: { id: refillRequestId },
        data: { status: "APPROVED", respondedAt: new Date() },
      }),
      prisma.prescription.update({
        where: { id: refillRequest.prescriptionId },
        data: { refillsRemaining: { decrement: 1 } },
      }),
    ]);

    await createNotification(
      refillRequest.patient.userId,
      "REFILL_APPROVED",
      "Refill Approved",
      `Your refill request for ${refillRequest.prescription.medicationName} was approved.`,
      refillRequest.id
    );
  } else {
    await prisma.refillRequest.update({
      where: { id: refillRequestId },
      data: { status: "DENIED", respondedAt: new Date(), denialReason },
    });

    await createNotification(
      refillRequest.patient.userId,
      "REFILL_DENIED",
      "Refill Denied",
      `Your refill request for ${refillRequest.prescription.medicationName} was denied.${denialReason ? ` Reason: ${denialReason}` : ""}`,
      refillRequest.id
    );
  }

  await logAccess(
    session.user.id,
    "UPDATE",
    "RefillRequest",
    `Refill request ${approve ? "approved" : "denied"}`,
    { patientId: refillRequest.patientId, resourceId: refillRequest.id }
  );

  revalidatePath("/doctor-prescriptions");
}
