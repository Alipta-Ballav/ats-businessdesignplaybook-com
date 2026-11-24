import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/lib/account.functions";
import { Card } from "@/components/ui-bits";

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const del = useServerFn(deleteMyAccount);
  const nav = useNavigate();
  const go = async () => {
    setBusy(true);
    try {
      await del();
      localStorage.clear();
      await supabase.auth.signOut();
      toast.success("Your account and data were deleted");
      nav({ to: "/" });
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <Card className="space-y-3 border-destructive/40">
      <h2 className="font-display text-lg">Delete my account & all data</h2>
      <p className="text-sm text-muted-foreground">
        Permanently erases your login, past checks, saved resumes and bookmarks. Payment receipts
        are kept for accounting. This can't be undone.
      </p>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="rounded-md border border-destructive px-4 py-2 text-sm text-destructive"
        >
          Delete my account
        </button>
      ) : (
        <div className="space-y-2">
          <label className="block text-sm">
            Type DELETE to confirm
            <input
              aria-label="Type DELETE to confirm"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <button
              disabled={text !== "DELETE" || busy}
              onClick={go}
              className="rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground disabled:opacity-40"
            >
              {busy ? "Deleting…" : "Permanently delete"}
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setText("");
              }}
              className="rounded-md border px-4 py-2 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
