"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { unblockTimeSlot } from "@/app/(doctor)/doctor-schedule/actions";

export function UnblockSlotButton({ blockedSlotId }: { blockedSlotId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      try {
        await unblockTimeSlot(blockedSlotId);
        toast.success("Time slot unblocked.");
        router.refresh();
      } catch {
        toast.error("Could not unblock this slot.");
      }
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleClick} disabled={isPending}>
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
      Remove
    </Button>
  );
}
