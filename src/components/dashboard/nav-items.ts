import {
  LayoutDashboard,
  User,
  CalendarPlus,
  FileText,
  Pill,
  Users,
  Share2,
  FlaskConical,
  CalendarClock,
  ClipboardList,
  Beaker,
  History,
  Upload,
  Search,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@prisma/client";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const navItemsByRole: Record<Role, NavItem[]> = {
  PATIENT: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "My Profile", href: "/profile", icon: User },
    { label: "Appointments", href: "/appointments", icon: CalendarPlus },
    { label: "Medical Records", href: "/records", icon: FileText },
    { label: "Prescriptions", href: "/prescriptions", icon: Pill },
  ],
  DOCTOR: [
    { label: "Dashboard", href: "/doctor-dashboard", icon: LayoutDashboard },
    { label: "My Patients", href: "/doctor-patients", icon: Users },
    { label: "Referrals", href: "/doctor-referrals", icon: Share2 },
    { label: "Prescriptions", href: "/doctor-prescriptions", icon: Pill },
    { label: "Lab Review", href: "/doctor-lab-review", icon: FlaskConical },
    { label: "My Schedule", href: "/doctor-schedule", icon: CalendarClock },
  ],
  NURSE: [
    { label: "Dashboard", href: "/nurse-dashboard", icon: LayoutDashboard },
    { label: "Appointments", href: "/nurse-appointments", icon: ClipboardList },
  ],
  LAB_TECHNICIAN: [
    { label: "Dashboard", href: "/lab-dashboard", icon: LayoutDashboard },
    { label: "Lab Orders", href: "/lab-orders", icon: Beaker },
  ],
  ADMIN: [
    { label: "Dashboard", href: "/admin-dashboard", icon: LayoutDashboard },
    { label: "Global Search", href: "/admin-search", icon: Search },
    { label: "Audit Log", href: "/admin-audit-log", icon: History },
    { label: "Bulk Import", href: "/admin-bulk-import", icon: Upload },
  ],
};

export function navItemsForRole(role: Role | undefined): NavItem[] {
  if (!role) return [];
  return navItemsByRole[role] ?? [];
}
