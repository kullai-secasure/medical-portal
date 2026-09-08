"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

async function getCurrentDoctorOrThrow() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");
  const doctor = await prisma.doctor.findUnique({ where: { userId: session.user.id } });
  if (!doctor) throw new Error("Doctor profile not found");
  return doctor;
}

export type ActionState = { success: boolean; error?: string };

const blockSlotSchema = z.object({
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  reason: z.string().optional(),
});

export async function blockTimeSlot(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const doctor = await getCurrentDoctorOrThrow();

  const parsed = blockSlotSchema.safeParse({
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    reason: formData.get("reason") || undefined,
  });

  if (!parsed.success) {
    return { success: false, error: "Invalid time range." };
  }

  const startTime = new Date(parsed.data.startTime);
  const endTime = new Date(parsed.data.endTime);

  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime()) || endTime <= startTime) {
    return { success: false, error: "End time must be after start time." };
  }

  await prisma.blockedSlot.create({
    data: { doctorId: doctor.id, startTime, endTime, reason: parsed.data.reason },
  });

  revalidatePath("/doctor-schedule");
  return { success: true };
}

export async function unblockTimeSlot(blockedSlotId: string) {
  const doctor = await getCurrentDoctorOrThrow();

  await prisma.blockedSlot.deleteMany({
    where: { id: blockedSlotId, doctorId: doctor.id },
  });

  revalidatePath("/doctor-schedule");
}
