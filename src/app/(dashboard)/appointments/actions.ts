"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentPatient } from "@/lib/data";
import { createNotification } from "@/lib/notifications";
import { logAccess } from "@/lib/audit";

const bookAppointmentSchema = z.object({
  doctorId: z.string().min(1, "Please select a doctor"),
  date: z.string().min(1, "Please select a date"),
  time: z.string().min(1, "Please select a time"),
  type: z.enum(["IN_PERSON", "TELEHEALTH"]),
  reason: z.string().min(3, "Please describe the reason for your visit"),
  recurrenceRule: z.enum(["NONE", "WEEKLY", "BIWEEKLY", "MONTHLY"]).default("NONE"),
  recurrenceCount: z.coerce.number().int().min(1).max(12).default(1),
});

export type BookAppointmentState = {
  success: boolean;
  error?: string;
};

function nextRecurrenceDate(date: Date, rule: string): Date {
  const next = new Date(date);
  if (rule === "WEEKLY") next.setDate(next.getDate() + 7);
  else if (rule === "BIWEEKLY") next.setDate(next.getDate() + 14);
  else if (rule === "MONTHLY") next.setMonth(next.getMonth() + 1);
  return next;
}

export async function bookAppointment(
  _prevState: BookAppointmentState,
  formData: FormData
): Promise<BookAppointmentState> {
  const parsed = bookAppointmentSchema.safeParse({
    doctorId: formData.get("doctorId"),
    date: formData.get("date"),
    time: formData.get("time"),
    type: formData.get("type"),
    reason: formData.get("reason"),
    recurrenceRule: formData.get("recurrenceRule") || "NONE",
    recurrenceCount: formData.get("recurrenceCount") || 1,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid appointment details.",
    };
  }

  const { doctorId, date, time, type, reason, recurrenceRule, recurrenceCount } = parsed.data;
  const scheduledAt = new Date(`${date}T${time}:00`);

  if (Number.isNaN(scheduledAt.getTime())) {
    return { success: false, error: "Invalid date or time." };
  }

  if (scheduledAt.getTime() < Date.now()) {
    return { success: false, error: "Please choose a future date and time." };
  }

  // Check doctor-blocked slots
  const blocked = await prisma.blockedSlot.findFirst({
    where: { doctorId, startTime: { lte: scheduledAt }, endTime: { gt: scheduledAt } },
  });
  if (blocked) {
    return { success: false, error: "This doctor is unavailable at that time." };
  }

  const patient = await getCurrentPatient();
  const occurrences = recurrenceRule === "NONE" ? 1 : recurrenceCount;
  const recurrenceEndDate =
    recurrenceRule === "NONE" ? null : computeOccurrence(scheduledAt, recurrenceRule, occurrences - 1);

  let parentId: string | undefined;
  for (let i = 0; i < occurrences; i++) {
    const created = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        doctorId,
        scheduledAt: computeOccurrence(scheduledAt, recurrenceRule, i),
        type,
        reason,
        status: "SCHEDULED",
        recurrenceRule: recurrenceRule === "NONE" ? null : recurrenceRule,
        recurrenceEndDate,
        parentAppointmentId: i === 0 ? undefined : parentId,
      },
    });
    if (i === 0) parentId = created.id;
  }

  revalidatePath("/appointments");
  revalidatePath("/dashboard");

  return { success: true };
}

function computeOccurrence(base: Date, rule: string, index: number): Date {
  let d = new Date(base);
  for (let i = 0; i < index; i++) d = nextRecurrenceDate(d, rule);
  return d;
}

export async function cancelAppointment(appointmentId: string) {
  const patient = await getCurrentPatient();

  const appointment = await prisma.appointment.update({
    where: { id: appointmentId, patientId: patient.id },
    data: { status: "CANCELLED" },
    include: { doctor: { include: { user: true } } },
  });

  revalidatePath("/appointments");
  revalidatePath("/dashboard");

  // Auto-book from waitlist if someone is waiting for this slot
  const waiting = await prisma.waitlist.findFirst({
    where: {
      doctorId: appointment.doctorId,
      status: "WAITING",
      preferredFrom: { lte: appointment.scheduledAt },
      preferredTo: { gte: appointment.scheduledAt },
    },
    orderBy: { createdAt: "asc" },
    include: { patient: true },
  });

  if (waiting) {
    await prisma.$transaction([
      prisma.appointment.create({
        data: {
          patientId: waiting.patientId,
          doctorId: appointment.doctorId,
          scheduledAt: appointment.scheduledAt,
          durationMin: appointment.durationMin,
          type: appointment.type,
          reason: waiting.reason,
          status: "CONFIRMED",
        },
      }),
      prisma.waitlist.update({
        where: { id: waiting.id },
        data: { status: "BOOKED" },
      }),
    ]);

    await createNotification(
      waiting.patient.userId,
      "WAITLIST_SLOT_OPEN",
      "Waitlist Slot Booked",
      `A slot opened up with Dr. ${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName} and we automatically booked you for your requested time.`,
      waiting.id
    );

    revalidatePath("/appointments");
  }
}

const rescheduleSchema = z.object({
  appointmentId: z.string().min(1),
  date: z.string().min(1),
  time: z.string().min(1),
});

export async function rescheduleAppointment(
  _prevState: BookAppointmentState,
  formData: FormData
): Promise<BookAppointmentState> {
  const patient = await getCurrentPatient();

  const parsed = rescheduleSchema.safeParse({
    appointmentId: formData.get("appointmentId"),
    date: formData.get("date"),
    time: formData.get("time"),
  });

  if (!parsed.success) {
    return { success: false, error: "Invalid reschedule request." };
  }

  const newScheduledAt = new Date(`${parsed.data.date}T${parsed.data.time}:00`);
  if (Number.isNaN(newScheduledAt.getTime()) || newScheduledAt.getTime() < Date.now()) {
    return { success: false, error: "Please choose a valid future date and time." };
  }

  const original = await prisma.appointment.findUnique({
    where: { id: parsed.data.appointmentId },
  });

  if (!original || original.patientId !== patient.id) {
    return { success: false, error: "Appointment not found." };
  }

  const blocked = await prisma.blockedSlot.findFirst({
    where: { doctorId: original.doctorId, startTime: { lte: newScheduledAt }, endTime: { gt: newScheduledAt } },
  });
  if (blocked) {
    return { success: false, error: "This doctor is unavailable at that time." };
  }

  await prisma.$transaction([
    prisma.appointment.update({
      where: { id: original.id },
      data: { status: "CANCELLED" },
    }),
    prisma.appointment.create({
      data: {
        patientId: original.patientId,
        doctorId: original.doctorId,
        scheduledAt: newScheduledAt,
        durationMin: original.durationMin,
        type: original.type,
        reason: original.reason,
        status: "SCHEDULED",
        rescheduledFromId: original.id,
        rescheduleCount: original.rescheduleCount + 1,
      },
    }),
  ]);

  revalidatePath("/appointments");
  revalidatePath("/dashboard");
  return { success: true };
}

const waitlistSchema = z.object({
  doctorId: z.string().min(1),
  preferredFrom: z.string().min(1),
  preferredTo: z.string().min(1),
  reason: z.string().min(3),
});

export async function joinWaitlist(
  _prevState: BookAppointmentState,
  formData: FormData
): Promise<BookAppointmentState> {
  const patient = await getCurrentPatient();

  const parsed = waitlistSchema.safeParse({
    doctorId: formData.get("doctorId"),
    preferredFrom: formData.get("preferredFrom"),
    preferredTo: formData.get("preferredTo"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return { success: false, error: "Invalid waitlist request." };
  }

  const preferredFrom = new Date(parsed.data.preferredFrom);
  const preferredTo = new Date(parsed.data.preferredTo);

  if (Number.isNaN(preferredFrom.getTime()) || Number.isNaN(preferredTo.getTime()) || preferredTo <= preferredFrom) {
    return { success: false, error: "Please choose a valid date range." };
  }

  await prisma.waitlist.create({
    data: {
      patientId: patient.id,
      doctorId: parsed.data.doctorId,
      preferredFrom,
      preferredTo,
      reason: parsed.data.reason,
    },
  });

  await logAccess(patient.userId, "CREATE", "Waitlist", "Joined appointment waitlist", { patientId: patient.id });

  revalidatePath("/appointments");
  return { success: true };
}
