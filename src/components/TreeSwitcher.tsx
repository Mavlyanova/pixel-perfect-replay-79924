import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useShajara } from "@/context/ShajaraContext";
import { LastOwnerError } from "@/lib/shajara";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Mode = "new" | "rename" | null;

export function TreeSwitcher() {
  const { t, myTrees, activeTree, currentRole, switchTree, createTree, renameTree, deleteTree } = useShajara();
  const [mode, setMode] = useState<Mode>(null);
  const [name, setName] = useState("");
  const isOwner = currentRole === "Owner";

  const open = (m: Mode) => {
    setName(m === "rename" ? activeTree?.name ?? "" : "");
    setMode(m);
  };
  const submit = () => {
    if (!name.trim()) return;
    try {
      if (mode === "new") { createTree(name); toast.success(t("treeCreated")); }
      else { renameTree(name); toast.success(t("treeRenamed")); }
      setMode(null);
    } catch {
      toast.error(t("ownerOnly"));
    }
  };
  const remove = () => {
    if (!activeTree || !window.confirm(`${t("deleteTree")}: ${activeTree.name}?`)) return;
    try {
      deleteTree(activeTree.id);
      toast.success(t("treeDeleted"));
    } catch (e) {
      toast.error(e instanceof LastOwnerError ? t("relInvalid") : t("ownerOnly"));
    }
  };

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{t("activeTree")}</p>
      <Select value={activeTree?.id ?? ""} onValueChange={switchTree}>
        <SelectTrigger className="h-9" aria-label={t("switchTree")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {myTrees.map((tr) => (
            <SelectItem key={tr.id} value={tr.id}>{tr.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => open("new")} aria-label={t("newTree")} title={t("newTree")}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
        {isOwner && (
          <>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => open("rename")} aria-label={t("renameTree")} title={t("renameTree")}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            {myTrees.length > 1 && (
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={remove} aria-label={t("deleteTree")} title={t("deleteTree")}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </>
        )}
      </div>
      <Dialog open={!!mode} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">{mode === "new" ? t("newTree") : t("renameTree")}</DialogTitle>
          </DialogHeader>
          <Input autoFocus placeholder={t("treeName")} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setMode(null)}>{t("relCancel")}</Button>
            <Button onClick={submit}>{mode === "new" ? t("create") : t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
