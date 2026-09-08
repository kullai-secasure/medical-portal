import { hash, compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function hashPassword(password: string) {
  return hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return compare(password, hash);
}

export async function createUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: "PATIENT" | "DOCTOR" | "NURSE" | "LAB_TECHNICIAN" | "ADMIN"
) {
  const passwordHash = await hashPassword(password);
  return prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      role,
    },
  });
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      patient: true,
      doctor: true,
      nurse: true,
      labTech: true,
    },
  });
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      patient: true,
      doctor: true,
      nurse: true,
      labTech: true,
    },
  });
}
