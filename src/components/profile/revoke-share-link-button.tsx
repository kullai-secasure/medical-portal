"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { revokeShareLink } from "@/app/(dashboard)/profile/share-actions";

export function RevokeShareLinkButton({ shareLinkId }: { shareLinkId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (!confirm("Revoke this share link? It will stop working immediately.")) return;

    startTransition(async () => {
      await revokeShareLink(shareLinkId);
      toast.success("Share link revoked.");
      router.refresh();
    });
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleClick} disabled={isPending} className="text-muted-foreground hover:text-destructive">
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      Revoke
    </Button>
  );
}
