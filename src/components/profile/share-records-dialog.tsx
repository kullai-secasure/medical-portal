"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Share2, Copy, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createShareLink } from "@/app/(dashboard)/profile/share-actions";

export function ShareRecordsDialog() {
  const [open, setOpen] = useState(false);
  const [expiryHours, setExpiryHours] = useState("24");
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleGenerate() {
    startTransition(async () => {
      const token = await createShareLink(Number(expiryHours));
      const url = `${window.location.origin}/share/${token}`;
      setGeneratedUrl(url);
      router.refresh();
    });
  }

  async function handleCopy() {
    if (!generatedUrl) return;
    await navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    toast.success("Link copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setGeneratedUrl(null);
      setCopied(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Share2 className="size-4" />
          Share Records
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Share Medical Summary</DialogTitle>
          <DialogDescription>
            Generate a temporary link an external provider can use to view your summary. It expires automatically.
          </DialogDescription>
        </DialogHeader>

        {!generatedUrl ? (
          <>
            <div className="flex flex-col gap-2 py-4">
              <Label htmlFor="expiry">Link Expires In</Label>
              <Select value={expiryHours} onValueChange={setExpiryHours}>
                <SelectTrigger id="expiry">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="168">7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button onClick={handleGenerate} disabled={isPending} className="w-full sm:w-auto">
                {isPending && <Loader2 className="size-4 animate-spin" />}
                Generate Link
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 py-4">
              <Input readOnly value={generatedUrl} className="text-xs" />
              <Button size="icon" variant="outline" onClick={handleCopy}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Anyone with this link can view your medical summary until it expires or you revoke it.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
