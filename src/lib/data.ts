import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function getCurrentPatient() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const patient = await prisma.patient.findUnique({
    where: { userId: session.user.id },
    include: { user: true },
  });
  if (!patient) {
    throw new Error("Patient profile not found");
  }
  return patient;
}

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      patient: true,
      doctor: true,
      nurse: true,
      labTech: true,
    },
  });
}

export async function getCurrentDoctor() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const doctor = await prisma.doctor.findUnique({
    where: { userId: session.user.id },
    include: { user: true },
  });
  if (!doctor) {
    throw new Error("Doctor profile not found");
  }
  return doctor;
}

export async function getDoctors() {
  return prisma.doctor.findMany({
    orderBy: { user: { lastName: "asc" } },
    include: { availability: true, user: true },
  });
}

export async function getUpcomingAppointments(patientId: string) {
  return prisma.appointment.findMany({
    where: { patientId, scheduledAt: { gte: new Date() } },
    orderBy: { scheduledAt: "asc" },
    include: { doctor: { include: { user: true } } },
  });
}

export async function getAllAppointments(patientId: string) {
  return prisma.appointment.findMany({
    where: { patientId },
    orderBy: { scheduledAt: "desc" },
    include: { doctor: { include: { user: true } } },
  });
}

export async function getMedicalRecords(patientId: string) {
  return prisma.medicalRecord.findMany({
    where: { patientId },
    orderBy: { visitDate: "desc" },
    include: { doctor: { include: { user: true } } },
  });
}

export async function getPrescriptions(patientId: string) {
  return prisma.prescription.findMany({
    where: { patientId },
    orderBy: { startDate: "desc" },
    include: {
      doctor: { include: { user: true } },
      refillRequests: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

export async function getLabResults(patientId: string) {
  return prisma.labResult.findMany({
    where: { patientId },
    orderBy: { orderedDate: "desc" },
    include: { doctor: { include: { user: true } } },
  });
}

export async function getReleasedLabResults(patientId: string) {
  return prisma.labResult.findMany({
    where: { patientId, isReleased: true },
    orderBy: { orderedDate: "desc" },
    include: { doctor: { include: { user: true } } },
  });
}

// Patients a doctor has an active relationship with — via appointments,
// medical records, or an accepted referral (shared record access).
export async function getDoctorPatients(doctorId: string) {
  const [viaAppointments, viaRecords, viaReferral] = await Promise.all([
    prisma.patient.findMany({
      where: { appointments: { some: { doctorId } } },
      include: { user: true },
    }),
    prisma.patient.findMany({
      where: { medicalRecords: { some: { doctorId } } },
      include: { user: true },
    }),
    prisma.patient.findMany({
      where: {
        referrals: {
          some: { specialistDoctorId: doctorId, status: { in: ["ACCEPTED", "COMPLETED"] } },
        },
      },
      include: { user: true },
    }),
  ]);

  const byId = new Map<string, (typeof viaAppointments)[number]>();
  for (const p of [...viaAppointments, ...viaRecords, ...viaReferral]) {
    byId.set(p.id, p);
  }
  return Array.from(byId.values()).sort((a, b) =>
    a.user.lastName.localeCompare(b.user.lastName)
  );
}
