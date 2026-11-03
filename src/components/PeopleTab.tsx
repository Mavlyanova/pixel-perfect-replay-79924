import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, CalendarPlus, Cake, FileSpreadsheet, LocateFixed, Pencil } from "lucide-react";
import { buildBirthdayIcs, daysUntilBirthday, googleCalendarUrl } from "@/lib/familyIO";
import { ImportSheetDialog } from "@/components/ImportSheetDialog";
import { canMutate } from "@/lib/shajara";
import { useShajara } from "@/context/ShajaraContext";
import { isInTree } from "@/lib/shajara";
import { DetailDrawer } from "@/components/tree/DetailDrawer";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TranslationKey } from "@/i18n/translations";

type SortKey = "fullName" | "status" | "birthDate" | "deathDate";

const initials = (name: string) =>
  name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

export function PeopleTab({ onFocusPerson }: { onFocusPerson: (nodeId: string) => void }) {
  const { t, nodes, edges, user, currentRole } = useShajara();
  const [importOpen, setImportOpen] = useState(false);
  const exportIcs = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([buildBirthdayIcs(nodes)], { type: "text/calendar" }));
    a.download = "shajara-birthdays.ics";
    a.click();
  };
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "fullName", dir: 1 });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editId, setEditId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return nodes
      .map((n) => ({ ...n, inTree: isInTree({ edges }, n.id) }))
      .filter((n) => !needle || n.fullName.toLowerCase().includes(needle) || n.birthDate.includes(needle))
      .sort((a, b) => {
        const va = sort.key === "status" ? (a.inTree ? t("inTree") : t("notInTree")) : (a[sort.key] ?? "");
        const vb = sort.key === "status" ? (b.inTree ? t("inTree") : t("notInTree")) : (b[sort.key] ?? "");
        return va.localeCompare(vb) * sort.dir;
      });
  }, [nodes, edges, q, sort, t]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)));
  const toggleOne = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const SortHead = ({ k, label }: { k: SortKey; label: TranslationKey }) => {
    const Icon = sort.key !== k ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
    return (
      <TableHead>
        <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(k)}>
          {t(label)} <Icon className="h-3.5 w-3.5" />
        </button>
      </TableHead>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input className="max-w-sm" placeholder={t("searchPlaceholder")} value={q} onChange={(e) => setQ(e.target.value)} />
        {selected.size > 0 && (
          <span className="text-sm text-muted-foreground">{t("selected", { count: String(selected.size) })}</span>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={exportIcs}><CalendarPlus className="mr-1 h-4 w-4" />{t("exportBirthdays")}</Button>
          {canMutate(currentRole) && (
            <Button size="sm" onClick={() => setImportOpen(true)}><FileSpreadsheet className="mr-1 h-4 w-4" />{t("importSheet")}</Button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={allChecked} onCheckedChange={toggleAll} aria-label="select all" />
              </TableHead>
              <SortHead k="fullName" label="colRelative" />
              <SortHead k="status" label="colStatus" />
              <SortHead k="birthDate" label="birthDate" />
              <SortHead k="deathDate" label="deathDate" />
              <TableHead className="text-right">{t("colAction")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">{t("emptyTree")}</TableCell>
              </TableRow>
            ) : (
              rows.map((n) => (
                <TableRow key={n.id} data-state={selected.has(n.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox checked={selected.has(n.id)} onCheckedChange={() => toggleOne(n.id)} aria-label={n.fullName} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        {n.avatarUrl && <AvatarImage src={n.avatarUrl} alt={n.fullName} />}
                        <AvatarFallback className={n.gender === "female" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"}>
                          {initials(n.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {n.fullName}
                        {n.id === user?.nodeId && <span className="ml-2 text-xs text-primary">({t("you")})</span>}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={n.inTree ? "default" : "secondary"}>{n.inTree ? t("inTree") : t("notInTree")}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {n.birthDate || "—"}
                    {(() => { const d = n.deathDate ? null : daysUntilBirthday(n.birthDate); return d !== null && d <= 30 ? (
                      <Badge variant="outline" className="ml-2 border-accent text-accent"><Cake className="mr-1 h-3 w-3" />{t("birthdaySoon", { days: String(d) })}</Badge>
                    ) : null; })()}
                  </TableCell>
                  <TableCell className="tabular-nums">{n.deathDate || "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => onFocusPerson(n.id)} aria-label={`${t("tabTree")}: ${n.fullName}`} title={`${t("tabTree")}: ${n.fullName}`}>
                      <LocateFixed className="h-4 w-4" />
                    </Button>
                    {n.birthDate && !n.deathDate && (
                      <Button asChild size="icon" variant="ghost" title={t("addToCalendar")}>
                        <a href={googleCalendarUrl(n)} target="_blank" rel="noreferrer" aria-label={`${t("addToCalendar")}: ${n.fullName}`}><CalendarPlus className="h-4 w-4" /></a>
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setEditId(n.id)}>
                      <Pencil className="mr-1 h-3.5 w-3.5" /> {t("edit")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <ImportSheetDialog open={importOpen} onOpenChange={setImportOpen} />
      <DetailDrawer nodeId={editId} onClose={() => setEditId(null)} />
    </div>
  );
}
