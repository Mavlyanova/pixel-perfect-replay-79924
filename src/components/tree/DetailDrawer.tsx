import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Trash2, X } from "lucide-react";
import { useShajara } from "@/context/ShajaraContext";
import { canMutate, type Gender } from "@/lib/shajara";
import { lifespan, spousesOf } from "@/lib/treeLayout";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Rel = "parent" | "child" | "spouse";

export function DetailDrawer({ nodeId, onClose }: { nodeId: string | null; onClose: () => void }) {
  const { t, nodes, edges, currentRole, updateNode, addNode, addEdge, removeNode, user } = useShajara();
  const person = nodes.find((n) => n.id === nodeId) ?? null;
  const canEdit = canMutate(currentRole);

  const [notes, setNotes] = useState("");
  const [deathDate, setDeathDate] = useState("");
  const [docLabel, setDocLabel] = useState("");
  const [docUrl, setDocUrl] = useState("");
  const [metaKey, setMetaKey] = useState("");
  const [metaVal, setMetaVal] = useState("");
  const [relName, setRelName] = useState("");
  const [relBirth, setRelBirth] = useState("");
  const [relGender, setRelGender] = useState<Gender>("male");
  const [rel, setRel] = useState<Rel>("child");
  const [otherParent, setOtherParent] = useState("");
  const [pName, setPName] = useState("");
  const [pBirth, setPBirth] = useState("");
  const [pGender, setPGender] = useState<Gender>("male");
  const [pAvatar, setPAvatar] = useState("");

  useEffect(() => {
    setNotes(person?.notes ?? "");
    setDeathDate(person?.deathDate ?? "");
  }, [person?.id, person?.notes, person?.deathDate]);

  useEffect(() => {
    setPName(person?.fullName ?? "");
    setPBirth(person?.birthDate ?? "");
    setPGender(person?.gender ?? "male");
    setPAvatar(person?.avatarUrl ?? "");
    setOtherParent("");
  }, [person?.id, person?.fullName, person?.birthDate, person?.gender, person?.avatarUrl]);

  const saveProfile = () => {
    if (!person) return;
    if (!pName.trim() || !pBirth) { toast.error(t("required")); return; }
    if (pAvatar && !/^https?:\/\//.test(pAvatar.trim())) { toast.error(t("avatarUrl")); return; }
    guard(() => {
      updateNode(person.id, { fullName: pName.trim().replace(/\s+/g, " "), birthDate: pBirth, gender: pGender, avatarUrl: pAvatar.trim() || undefined });
      toast.success(t("profileSaved"));
    });
  };

  const guard = (fn: () => void) => {
    try {
      fn();
    } catch {
      toast.error(t("viewerWarning"));
    }
  };

  const spouses = person ? spousesOf(edges, person.id).map((id) => nodes.find((n) => n.id === id)).filter(Boolean) : [];

  return (
    <Sheet open={!!person} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        {person && (
          <div className="space-y-6">
            <SheetHeader>
              <SheetTitle className="font-display text-3xl">{person.fullName}</SheetTitle>
              <SheetDescription>{lifespan(person)}</SheetDescription>
            </SheetHeader>

            {canEdit && (
              <section className="space-y-2">
                <h3 className="drawer-heading">{t("editProfile")}</h3>
                <Label htmlFor="p-name">{t("fullName")}</Label>
                <Input id="p-name" value={pName} onChange={(e) => setPName(e.target.value)} />
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <Label htmlFor="p-birth">{t("birthDate")}</Label>
                    <Input id="p-birth" type="date" value={pBirth} onChange={(e) => setPBirth(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="p-gender">{t("gender")}</Label>
                    <select id="p-gender" className="field-select h-10" value={pGender} onChange={(e) => setPGender(e.target.value as Gender)}>
                      <option value="male">{t("male")}</option>
                      <option value="female">{t("female")}</option>
                    </select>
                  </div>
                </div>
                <Label htmlFor="p-avatar">{t("avatarUrl")}</Label>
                <div className="flex items-center gap-2">
                  {pAvatar && /^https?:\/\//.test(pAvatar) && <img src={pAvatar} alt="" className="h-10 w-10 rounded-full object-cover" />}
                  <Input id="p-avatar" placeholder="https://" value={pAvatar} onChange={(e) => setPAvatar(e.target.value)} />
                </div>
                <Button className="w-full" variant="outline" onClick={saveProfile}>{t("save")}</Button>
              </section>
            )}

            <section className="space-y-2">
              <h3 className="drawer-heading">{t("notes")}</h3>
              {canEdit ? (
                <>
                  <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
                  <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label htmlFor="death">{t("deathDate")}</Label>
                      <Input id="death" type="date" value={deathDate} onChange={(e) => setDeathDate(e.target.value)} />
                    </div>
                    <Button onClick={() => guard(() => { updateNode(person.id, { notes, deathDate: deathDate || undefined }); toast.success(t("save")); })}>
                      {t("save")}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{person.notes || t("none")}</p>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="drawer-heading">{t("spouses")}</h3>
              {spouses.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("none")}</p>
              ) : (
                <ul className="space-y-1">
                  {spouses.map((s) => (
                    <li key={s!.id} className="rounded-md bg-muted px-3 py-2 text-sm">{s!.fullName} <span className="text-muted-foreground">({lifespan(s!)})</span></li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="drawer-heading">{t("documents")}</h3>
              {(person.documents ?? []).length === 0 && <p className="text-sm text-muted-foreground">{t("none")}</p>}
              <ul className="space-y-1">
                {(person.documents ?? []).map((d, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-sm">
                    <a href={d.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline">
                      {d.label} <ExternalLink className="h-3 w-3" />
                    </a>
                    {canEdit && (
                      <button aria-label="remove" onClick={() => guard(() => updateNode(person.id, { documents: (person.documents ?? []).filter((_, j) => j !== i) }))}>
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {canEdit && (
                <div className="flex gap-2">
                  <Input placeholder={t("label")} value={docLabel} onChange={(e) => setDocLabel(e.target.value)} />
                  <Input placeholder="https://" value={docUrl} onChange={(e) => setDocUrl(e.target.value)} />
                  <Button variant="outline" onClick={() => {
                    if (!docLabel.trim() || !/^https?:\/\//.test(docUrl)) return;
                    guard(() => updateNode(person.id, { documents: [...(person.documents ?? []), { label: docLabel.trim(), url: docUrl.trim() }] }));
                    setDocLabel(""); setDocUrl("");
                  }}>{t("add")}</Button>
                </div>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="drawer-heading">{t("metadata")}</h3>
              {Object.keys(person.metadata ?? {}).length === 0 && <p className="text-sm text-muted-foreground">{t("none")}</p>}
              <dl className="space-y-1">
                {Object.entries(person.metadata ?? {}).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-2 text-sm">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="flex items-center gap-2">{v}
                      {canEdit && (
                        <button aria-label="remove" onClick={() => { const m = { ...(person.metadata ?? {}) }; delete m[k]; guard(() => updateNode(person.id, { metadata: m })); }}>
                          <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              {canEdit && (
                <div className="flex gap-2">
                  <Input placeholder={t("label")} value={metaKey} onChange={(e) => setMetaKey(e.target.value)} />
                  <Input placeholder={t("value")} value={metaVal} onChange={(e) => setMetaVal(e.target.value)} />
                  <Button variant="outline" onClick={() => {
                    if (!metaKey.trim()) return;
                    guard(() => updateNode(person.id, { metadata: { ...(person.metadata ?? {}), [metaKey.trim()]: metaVal.trim() } }));
                    setMetaKey(""); setMetaVal("");
                  }}>{t("add")}</Button>
                </div>
              )}
            </section>

            {canEdit && (
              <section className="space-y-2 rounded-lg border border-border p-4">
                <h3 className="drawer-heading">{t("addRelative")}</h3>
                <div className="grid grid-cols-3 gap-1">
                  {(["parent", "child", "spouse"] as Rel[]).map((r) => (
                    <Button key={r} size="sm" variant={rel === r ? "default" : "outline"} onClick={() => setRel(r)}>
                      {t(r === "parent" ? "relParent" : r === "child" ? "relChild" : "relSpouse")}
                    </Button>
                  ))}
                </div>
                {rel === "child" && spouses.length > 0 && (
                  <div className="space-y-1">
                    <Label htmlFor="other-parent">{t("otherParent")}</Label>
                    <select id="other-parent" className="field-select w-full" value={otherParent} onChange={(e) => setOtherParent(e.target.value)}>
                      <option value="">{t("noOtherParent")}</option>
                      {spouses.map((sp) => <option key={sp!.id} value={sp!.id}>{sp!.fullName}</option>)}
                    </select>
                  </div>
                )}
                <Input placeholder={t("fullName")} value={relName} onChange={(e) => setRelName(e.target.value)} />
                <div className="flex gap-2">
                  <Input type="date" value={relBirth} onChange={(e) => setRelBirth(e.target.value)} />
                  <select className="field-select" value={relGender} onChange={(e) => setRelGender(e.target.value as Gender)}>
                    <option value="male">{t("male")}</option>
                    <option value="female">{t("female")}</option>
                  </select>
                </div>
                <Button className="w-full" onClick={() => {
                  if (!relName.trim() || !relBirth) { toast.error(t("required")); return; }
                  guard(() => {
                    const n = addNode({ fullName: relName.trim(), birthDate: relBirth, gender: relGender });
                    if (rel === "parent") addEdge({ from: n.id, to: person.id, type: "parent" });
                    if (rel === "child") {
                      addEdge({ from: person.id, to: n.id, type: "parent" });
                      if (otherParent) addEdge({ from: otherParent, to: n.id, type: "parent" });
                    }
                    if (rel === "spouse") addEdge({ from: person.id, to: n.id, type: "spouse" });
                  });
                  setRelName(""); setRelBirth("");
                }}>{t("add")}</Button>
              </section>
            )}

            {canEdit && person.id !== user?.nodeId && (
              <Button variant="destructive" className="w-full" onClick={() => { guard(() => removeNode(person.id)); onClose(); }}>
                <Trash2 className="mr-2 h-4 w-4" /> {t("deletePerson")}
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
