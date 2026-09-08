import { AppShell } from "@/components/dashboard/app-shell";

export const dynamic = "force-dynamic";

export default function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
