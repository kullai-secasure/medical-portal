"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelAppointment } from "@/app/(dashboard)/appointments/actions";

export function CancelAppointmentButton({
  appointmentId,
}: {
  appointmentId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleCancel() {
    if (!confirm("Cancel this appointment?")) return;

    startTransition(async () => {
      try {
        await cancelAppointment(appointmentId);
        toast.success("Appointment cancelled.");
        router.refresh();
      } catch {
        toast.error("Could not cancel this appointment.");
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCancel}
      disabled={isPending}
      className="text-muted-foreground hover:text-destructive"
    >
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
      Cancel
    </Button>
  );
}
