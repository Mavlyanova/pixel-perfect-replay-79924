import { useState } from "react";
import { toast } from "sonner";
import { useShajara } from "@/context/ShajaraContext";
import { CSV_TEMPLATE, parseCsv, rowsToPeople, sheetCsvUrl, type ImportRow } from "@/lib/familyIO";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ImportSheetDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t, nodes, addNode, addEdge } = useShajara();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [link, setLink] = useState("");

  const load = (text: string) => {
    const r = rowsToPeople(parseCsv(text));
    if (!r.length) toast.error(t("importError"));
    setRows(r);
  };

  const loadLink = async (): Promise<void> => {
    const url = sheetCsvUrl(link);
    if (!url) { toast.error(t("importError")); return; }
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      load(await res.text());
    } catch {
      toast.error(t("importError"));
    }
  };

  const confirm = () => {
    try {
      const byName = new Map(nodes.map((n) => [n.fullName.toLowerCase(), n.id]));
      for (const r of rows) {
        if (byName.has(r.fullName.toLowerCase())) continue;
        const n = addNode({ fullName: r.fullName, gender: r.gender, birthDate: r.birthDate, deathDate: r.deathDate });
        byName.set(r.fullName.toLowerCase(), n.id);
      }
      for (const r of rows) {
        const id = byName.get(r.fullName.toLowerCase())!;
        const p = r.parentName && byName.get(r.parentName.toLowerCase());
        const s = r.spouseName && byName.get(r.spouseName.toLowerCase());
        if (p) addEdge({ from: p, to: id, type: "parent" });
        if (s && s !== id) addEdge({ from: id, to: s, type: "spouse" });
      }
      toast.success(t("importDone", { count: String(rows.length) }));
      setRows([]);
      onOpenChange(false);
    } catch {
      /* permission toast already shown */
    }
  };

  const template = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([CSV_TEMPLATE], { type: "text/csv" }));
    a.download = "shajara-template.csv";
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{t("importSheet")}</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{t("importHint")}</p>
        <div className="flex items-center gap-2">
          <Input type="file" accept=".csv,text/csv" onChange={async (e) => { const f = e.target.files?.[0]; if (f) load(await f.text()); }} />
          <Button variant="outline" onClick={template}>{t("downloadTemplate")}</Button>
        </div>
        <div className="flex gap-2">
          <Input placeholder={t("importLink")} value={link} onChange={(e) => setLink(e.target.value)} />
          <Button variant="secondary" onClick={loadLink}>{t("importLoad")}</Button>
        </div>
        {rows.length > 0 && (
          <>
            <ul className="max-h-48 overflow-auto rounded-md border border-border text-sm">
              {rows.map((r, i) => (
                <li key={i} className="flex justify-between border-b border-border px-3 py-1.5 last:border-0">
                  <span>{r.fullName}</span><span className="tabular-nums text-muted-foreground">{r.birthDate || "—"}</span>
                </li>
              ))}
            </ul>
            <Button onClick={confirm}>{t("importConfirm", { count: String(rows.length) })}</Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
