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

const createReferralSchema = z.object({
  patientId: z.string().min(1),
  specialistDoctorId: z.string().min(1),
  reason: z.string().min(3, "Please describe the reason for referral"),
  notes: z.string().optional(),
});

export type ActionState = { success: boolean; error?: string };

export async function createReferral(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { doctor, session } = await getCurrentDoctorOrThrow();

  const parsed = createReferralSchema.safeParse({
    patientId: formData.get("patientId"),
    specialistDoctorId: formData.get("specialistDoctorId"),
    reason: formData.get("reason"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid referral details." };
  }

  if (parsed.data.specialistDoctorId === doctor.id) {
    return { success: false, error: "You cannot refer a patient to yourself." };
  }

  const referral = await prisma.referral.create({
    data: {
      patientId: parsed.data.patientId,
      referringDoctorId: doctor.id,
      specialistDoctorId: parsed.data.specialistDoctorId,
      reason: parsed.data.reason,
      notes: parsed.data.notes,
    },
    include: { specialistDoctor: { include: { user: true } }, patient: { include: { user: true } } },
  });

  await createNotification(
    referral.specialistDoctor.userId,
    "REFERRAL_RECEIVED",
    "New Patient Referral",
    `Dr. ${doctor.id === referral.referringDoctorId ? "" : ""}${session.user.name} referred ${referral.patient.user.firstName} ${referral.patient.user.lastName} to you: ${referral.reason}`,
    referral.id
  );

  await logAccess(session.user.id, "CREATE", "Referral", `Created referral for patient to specialist`, {
    patientId: parsed.data.patientId,
    resourceId: referral.id,
  });

  revalidatePath("/doctor-referrals");
  return { success: true };
}

export async function respondToReferral(
  referralId: string,
  status: "ACCEPTED" | "DECLINED" | "COMPLETED"
) {
  const { doctor, session } = await getCurrentDoctorOrThrow();

  const referral = await prisma.referral.findUnique({
    where: { id: referralId },
    include: { referringDoctor: { include: { user: true } }, patient: { include: { user: true } } },
  });

  if (!referral || referral.specialistDoctorId !== doctor.id) {
    throw new Error("Referral not found or not assigned to you");
  }

  await prisma.referral.update({
    where: { id: referralId },
    data: { status },
  });

  await createNotification(
    referral.referringDoctor.userId,
    "REFERRAL_STATUS_CHANGED",
    `Referral ${status.charAt(0) + status.slice(1).toLowerCase()}`,
    `Dr. ${session.user.name} ${status.toLowerCase()} your referral for ${referral.patient.user.firstName} ${referral.patient.user.lastName}.`,
    referral.id
  );

  await logAccess(session.user.id, "UPDATE", "Referral", `Referral status changed to ${status}`, {
    patientId: referral.patientId,
    resourceId: referral.id,
  });

  revalidatePath("/doctor-referrals");
}
