import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { titleCase } from "@/lib/format";

const STYLES: Record<string, string> = {
  // Appointments
  SCHEDULED: "bg-secondary text-secondary-foreground border-transparent",
  CONFIRMED: "bg-primary/10 text-primary border-transparent",
  COMPLETED: "bg-success/10 text-success border-transparent",
  CANCELLED: "bg-destructive/10 text-destructive border-transparent",
  NO_SHOW: "bg-muted text-muted-foreground border-transparent",
  // Prescriptions
  ACTIVE: "bg-success/10 text-success border-transparent",
  EXPIRED: "bg-muted text-muted-foreground border-transparent",
  // Lab results
  PENDING: "bg-warning/10 text-warning-foreground border-transparent",
  ABNORMAL: "bg-destructive/10 text-destructive border-transparent",
  // Referrals / refill requests / waitlist
  ACCEPTED: "bg-success/10 text-success border-transparent",
  APPROVED: "bg-success/10 text-success border-transparent",
  DECLINED: "bg-destructive/10 text-destructive border-transparent",
  DENIED: "bg-destructive/10 text-destructive border-transparent",
  WAITING: "bg-warning/10 text-warning-foreground border-transparent",
  NOTIFIED: "bg-primary/10 text-primary border-transparent",
  BOOKED: "bg-success/10 text-success border-transparent",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", STYLES[status] ?? "bg-muted text-muted-foreground")}
    >
      {titleCase(status)}
    </Badge>
  );
}
