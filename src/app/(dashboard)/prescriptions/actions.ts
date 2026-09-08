"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentPatient } from "@/lib/data";
import { createNotification } from "@/lib/notifications";
import { logAccess } from "@/lib/audit";

const requestRefillSchema = z.object({
  prescriptionId: z.string().min(1),
  requestNote: z.string().optional(),
});

export type ActionState = { success: boolean; error?: string };

export async function requestRefill(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const patient = await getCurrentPatient();

  const parsed = requestRefillSchema.safeParse({
    prescriptionId: formData.get("prescriptionId"),
    requestNote: formData.get("requestNote") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: "Invalid request." };
  }

  const prescription = await prisma.prescription.findUnique({
    where: { id: parsed.data.prescriptionId },
    include: { doctor: true },
  });

  if (!prescription || prescription.patientId !== patient.id) {
    return { success: false, error: "Prescription not found." };
  }

  if (prescription.status !== "ACTIVE") {
    return { success: false, error: "This prescription is not active." };
  }

  if (prescription.refillsRemaining <= 0) {
    return { success: false, error: "No refills remaining on this prescription. Ask your doctor for a new one." };
  }

  const existingPending = await prisma.refillRequest.findFirst({
    where: { prescriptionId: prescription.id, status: "PENDING" },
  });
  if (existingPending) {
    return { success: false, error: "A refill request is already pending for this prescription." };
  }

  const refillRequest = await prisma.refillRequest.create({
    data: {
      prescriptionId: prescription.id,
      patientId: patient.id,
      requestNote: parsed.data.requestNote,
    },
  });

  await createNotification(
    prescription.doctor.userId,
    "MESSAGE_RECEIVED",
    "Refill Request",
    `A patient requested a refill for ${prescription.medicationName}.`,
    refillRequest.id
  );

  await logAccess(patient.userId, "CREATE", "RefillRequest", `Requested refill for ${prescription.medicationName}`, {
    patientId: patient.id,
    resourceId: refillRequest.id,
  });

  revalidatePath("/prescriptions");
  return { success: true };
}
