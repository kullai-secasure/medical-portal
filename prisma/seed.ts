import {
  PrismaClient,
  Department,
  DayOfWeek,
  AppointmentType,
  AppointmentStatus,
  PrescriptionStatus,
  LabResultStatus,
  Gender,
  Role,
} from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

function daysFromNow(days: number, hour = 9, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function hashPassword(password: string) {
  return hash(password, 10);
}

async function main() {
  console.log("Clearing existing data...");
  await prisma.message.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.vitals.deleteMany();
  await prisma.labTechnician.deleteMany();
  await prisma.nurse.deleteMany();
  await prisma.labResult.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctorAvailability.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await hashPassword("password123");

  console.log("Seeding users...");
  // Patient user
  const patientUser = await prisma.user.create({
    data: {
      email: "patient@example.com",
      passwordHash,
      firstName: "Emma",
      lastName: "Johnson",
      role: Role.PATIENT,
    },
  });

  // Doctor users
  const doctorUser1 = await prisma.user.create({
    data: {
      email: "doctor@example.com",
      passwordHash,
      firstName: "Sarah",
      lastName: "Chen",
      role: Role.DOCTOR,
    },
  });

  const doctorUser2 = await prisma.user.create({
    data: {
      email: "doctor2@example.com",
      passwordHash,
      firstName: "Marcus",
      lastName: "Reyes",
      role: Role.DOCTOR,
    },
  });

  // Nurse user
  const nurseUser = await prisma.user.create({
    data: {
      email: "nurse@example.com",
      passwordHash,
      firstName: "Lisa",
      lastName: "Rodriguez",
      role: Role.NURSE,
    },
  });

  // Lab Technician user
  const labTechUser = await prisma.user.create({
    data: {
      email: "labtech@example.com",
      passwordHash,
      firstName: "James",
      lastName: "Wilson",
      role: Role.LAB_TECHNICIAN,
    },
  });

  // Admin user
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@example.com",
      passwordHash,
      firstName: "Admin",
      lastName: "User",
      role: Role.ADMIN,
    },
  });

  console.log("Seeding patient profile...");
  const patient = await prisma.patient.create({
    data: {
      userId: patientUser.id,
      phone: "(628) 555-0110",
      dateOfBirth: new Date("1991-04-12"),
      gender: Gender.FEMALE,
      addressLine1: "482 Maple Terrace",
      city: "San Francisco",
      state: "CA",
      zipCode: "94110",
      bloodType: "O+",
      allergies: ["Penicillin", "Shellfish"],
      chronicConditions: ["Asthma", "Seasonal allergies"],
      currentMedications: ["Albuterol inhaler", "Levothyroxine 50mcg"],
      heightCm: 167,
      weightKg: 62,
      emergencyContactName: "Michael Johnson",
      emergencyContactPhone: "(628) 555-0111",
      emergencyContactRelation: "Spouse",
      insuranceProvider: "Blue Shield of California",
      insurancePolicyNumber: "BSC-88213456",
      insuranceGroupNumber: "GRP-5521",
      insurancePlanType: "PPO Gold 1500",
    },
  });

  console.log("Seeding doctor profiles...");
  const [doctor1, doctor2] = await Promise.all([
    prisma.doctor.create({
      data: {
        userId: doctorUser1.id,
        phone: "(415) 555-0142",
        specialty: "Interventional Cardiology",
        department: Department.CARDIOLOGY,
        bio: "Dr. Chen specializes in preventive cardiology and heart rhythm disorders, with 14 years of clinical experience.",
        yearsExperience: 14,
        availability: {
          create: [
            { dayOfWeek: DayOfWeek.MONDAY, startTime: "09:00", endTime: "17:00" },
            { dayOfWeek: DayOfWeek.WEDNESDAY, startTime: "09:00", endTime: "17:00" },
            { dayOfWeek: DayOfWeek.FRIDAY, startTime: "09:00", endTime: "13:00" },
          ],
        },
      },
    }),
    prisma.doctor.create({
      data: {
        userId: doctorUser2.id,
        phone: "(415) 555-0198",
        specialty: "Family & Internal Medicine",
        department: Department.FAMILY_MEDICINE,
        bio: "Dr. Reyes is a board-certified family physician focused on whole-person, longitudinal primary care.",
        yearsExperience: 9,
        availability: {
          create: [
            { dayOfWeek: DayOfWeek.MONDAY, startTime: "08:00", endTime: "16:00" },
            { dayOfWeek: DayOfWeek.TUESDAY, startTime: "08:00", endTime: "16:00" },
            { dayOfWeek: DayOfWeek.THURSDAY, startTime: "08:00", endTime: "16:00" },
          ],
        },
      },
    }),
  ]);

  console.log("Seeding nurse and lab tech profiles...");
  await Promise.all([
    prisma.nurse.create({
      data: {
        userId: nurseUser.id,
        department: Department.CARDIOLOGY,
        licenseNumber: "RN-2024-001",
      },
    }),
    prisma.labTechnician.create({
      data: {
        userId: labTechUser.id,
        certifications: ["CLIA", "Clinical Lab Science"],
      },
    }),
  ]);

  console.log("Seeding appointments...");
  await prisma.appointment.createMany({
    data: [
      {
        patientId: patient.id,
        doctorId: doctor1.id,
        scheduledAt: daysFromNow(3, 10, 30),
        durationMin: 30,
        type: AppointmentType.IN_PERSON,
        status: AppointmentStatus.CONFIRMED,
        reason: "Annual cardiac checkup",
      },
      {
        patientId: patient.id,
        doctorId: doctor2.id,
        scheduledAt: daysFromNow(9, 14, 0),
        durationMin: 20,
        type: AppointmentType.TELEHEALTH,
        status: AppointmentStatus.SCHEDULED,
        reason: "Follow-up on thyroid levels",
      },
      {
        patientId: patient.id,
        doctorId: doctor2.id,
        scheduledAt: daysFromNow(-14, 9, 0),
        durationMin: 30,
        type: AppointmentType.IN_PERSON,
        status: AppointmentStatus.COMPLETED,
        reason: "Annual physical exam",
        notes: "Overall healthy. Ordered routine bloodwork.",
      },
    ],
  });

  console.log("Seeding medical records...");
  await prisma.medicalRecord.createMany({
    data: [
      {
        patientId: patient.id,
        doctorId: doctor2.id,
        visitDate: daysFromNow(-14, 9, 0),
        diagnosis: "Routine wellness exam — no acute findings",
        treatment: "Continue current regimen; routine bloodwork ordered.",
        notes: "Patient reports good energy levels and regular exercise.",
        bloodPressure: "118/76",
        heartRateBpm: 68,
        temperatureC: 36.7,
        weightKg: 62,
      },
      {
        patientId: patient.id,
        doctorId: doctor1.id,
        visitDate: daysFromNow(-120, 10, 0),
        diagnosis: "Benign palpitations, likely caffeine-related",
        treatment: "Reduce caffeine intake; recheck in 6 months if symptoms persist.",
        notes: "12-lead EKG within normal limits. No structural concerns.",
        bloodPressure: "121/79",
        heartRateBpm: 74,
        temperatureC: 36.8,
        weightKg: 63,
      },
    ],
  });

  console.log("Seeding prescriptions...");
  await prisma.prescription.createMany({
    data: [
      {
        patientId: patient.id,
        doctorId: doctor1.id,
        medicationName: "Levothyroxine",
        dosage: "50mcg",
        frequency: "Once daily, morning, empty stomach",
        instructions: "Take 30-60 minutes before breakfast.",
        startDate: daysFromNow(-200),
        endDate: null,
        refillsRemaining: 3,
        status: PrescriptionStatus.ACTIVE,
      },
      {
        patientId: patient.id,
        doctorId: doctor2.id,
        medicationName: "Albuterol HFA Inhaler",
        dosage: "90mcg/actuation",
        frequency: "2 puffs as needed for wheezing",
        instructions: "Do not exceed 8 puffs in 24 hours.",
        startDate: daysFromNow(-365),
        endDate: null,
        refillsRemaining: 2,
        status: PrescriptionStatus.ACTIVE,
      },
    ],
  });

  console.log("Seeding lab results...");
  await prisma.labResult.createMany({
    data: [
      {
        patientId: patient.id,
        doctorId: doctor2.id,
        testName: "Complete Blood Count (CBC)",
        orderedDate: daysFromNow(-14),
        resultDate: daysFromNow(-12),
        status: LabResultStatus.COMPLETED,
        resultValue: "Within normal limits",
        normalRange: "See report",
        units: "",
        notes: "No abnormalities detected.",
      },
      {
        patientId: patient.id,
        doctorId: doctor1.id,
        testName: "Lipid Panel",
        orderedDate: daysFromNow(-120),
        resultDate: daysFromNow(-118),
        status: LabResultStatus.ABNORMAL,
        resultValue: "LDL 142",
        normalRange: "< 100",
        units: "mg/dL",
        notes: "Mildly elevated LDL. Discussed dietary changes at next visit.",
      },
      {
        patientId: patient.id,
        doctorId: doctor2.id,
        testName: "Vitamin D, 25-Hydroxy",
        orderedDate: daysFromNow(-2),
        resultDate: null,
        status: LabResultStatus.PENDING,
        resultValue: null,
        normalRange: "30 - 100",
        units: "ng/mL",
        notes: null,
      },
    ],
  });

  console.log("Seeding vitals...");
  await prisma.vitals.createMany({
    data: [
      {
        patientId: patient.id,
        recordedAt: daysFromNow(-14),
        bloodPressure: "118/76",
        heartRateBpm: 68,
        temperatureC: 36.7,
        weightKg: 62,
        heightCm: 167,
        notes: "Vitals recorded during annual physical",
      },
      {
        patientId: patient.id,
        recordedAt: daysFromNow(-7),
        bloodPressure: "116/74",
        heartRateBpm: 70,
        temperatureC: 36.6,
        weightKg: 62.5,
        heightCm: 167,
        notes: "Routine check-in",
      },
    ],
  });

  console.log("Seeding notifications...");
  await prisma.notification.createMany({
    data: [
      {
        userId: patientUser.id,
        type: "APPOINTMENT_CONFIRMED",
        title: "Appointment Confirmed",
        message: "Your appointment with Dr. Sarah Chen on Sep 11, 2026 has been confirmed.",
        isRead: false,
      },
      {
        userId: patientUser.id,
        type: "LAB_RESULT_AVAILABLE",
        title: "Lab Results Available",
        message: "Your Complete Blood Count (CBC) results are ready to review.",
        isRead: false,
      },
      {
        userId: patientUser.id,
        type: "PRESCRIPTION_READY",
        title: "Prescription Ready",
        message: "Your prescription for Levothyroxine is ready for pickup.",
        isRead: true,
      },
    ],
  });

  console.log("Seed complete.");
  console.log({
    patientUser: `${patientUser.firstName} ${patientUser.lastName} (${patientUser.email})`,
    doctorUser: `${doctorUser1.firstName} ${doctorUser1.lastName} (${doctorUser1.email})`,
    nurseUser: `${nurseUser.firstName} ${nurseUser.lastName} (${nurseUser.email})`,
    labTechUser: `${labTechUser.firstName} ${labTechUser.lastName} (${labTechUser.email})`,
    adminUser: `${adminUser.firstName} ${adminUser.lastName} (${adminUser.email})`,
    allPassword: "password123",
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
