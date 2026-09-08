"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { respondToReferral } from "@/app/(doctor)/doctor-referrals/actions";

export function ReferralResponseButtons({
  referralId,
  status,
}: {
  referralId: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "COMPLETED";
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function respond(next: "ACCEPTED" | "DECLINED" | "COMPLETED") {
    startTransition(async () => {
      try {
        await respondToReferral(referralId, next);
        toast.success(`Referral ${next.toLowerCase()}.`);
        router.refresh();
      } catch {
        toast.error("Could not update referral.");
      }
    });
  }

  if (status === "PENDING") {
    return (
      <div className="flex gap-2">
        <Button size="sm" onClick={() => respond("ACCEPTED")} disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Accept
        </Button>
        <Button size="sm" variant="outline" onClick={() => respond("DECLINED")} disabled={isPending}>
          <X className="size-4" />
          Decline
        </Button>
      </div>
    );
  }

  if (status === "ACCEPTED") {
    return (
      <Button size="sm" variant="outline" onClick={() => respond("COMPLETED")} disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}
        Mark Completed
      </Button>
    );
  }

  return null;
}
