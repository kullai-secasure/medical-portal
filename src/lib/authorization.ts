import { prisma } from "@/lib/prisma";

/**
 * Returns true only if this doctor has an actual care relationship with the
 * patient — an existing appointment, a medical record they authored, or an
 * accepted/completed referral granting them shared access. Every doctor-facing
 * mutation that accepts a client-supplied patientId must call this before
 * writing data tied to that patient (referrals, prescriptions, etc.) — see
 * VenusHawk findings #1 and #6.
 */
export async function doctorTreatsPatient(doctorId: string, patientId: string): Promise<boolean> {
  const [viaAppointment, viaRecord, viaReferral] = await Promise.all([
    prisma.appointment.findFirst({ where: { doctorId, patientId }, select: { id: true } }),
    prisma.medicalRecord.findFirst({ where: { doctorId, patientId }, select: { id: true } }),
    prisma.referral.findFirst({
      where: { specialistDoctorId: doctorId, patientId, status: { in: ["ACCEPTED", "COMPLETED"] } },
      select: { id: true },
    }),
  ]);

  return Boolean(viaAppointment || viaRecord || viaReferral);
}
