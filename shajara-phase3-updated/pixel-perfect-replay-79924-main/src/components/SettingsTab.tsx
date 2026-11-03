import { useState } from "react";
import { toast } from "sonner";
import { useShajara } from "@/context/ShajaraContext";
import { LastOwnerError, listCollaborators, type Role } from "@/lib/shajara";
import { LANGS, type Lang } from "@/i18n/translations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ROLES: Role[] = ["Owner", "Editor", "Viewer"];
const ROLE_KEY = { Owner: "roleOwner", Editor: "roleEditor", Viewer: "roleViewer" } as const;
const DESC_KEY = { Owner: "descOwner", Editor: "descEditor", Viewer: "descViewer" } as const;
export const LANG_LABEL: Record<Lang, string> = { uz: "O'zbekcha", ru: "Русский", en: "English" };

export function SettingsTab() {
  const { t, lang, setLang, activeTree, user, currentRole, changeRole, invite } = useShajara();
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("Viewer");
  if (!activeTree) return null;
  const isOwner = currentRole === "Owner";
  const people = listCollaborators(activeTree, user);

  const onChange = (userId: string, role: Role) => {
    try {
      changeRole(userId, role);
      toast.success(t("roleUpdated"));
    } catch (e) {
      toast.error(e instanceof LastOwnerError ? t("lastOwner") : t("ownerOnly"));
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <section className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-display text-2xl text-card-foreground">{t("collaborators")}</h3>
        <p className="mb-4 text-sm text-muted-foreground">{isOwner ? t("collabHint") : t("ownerOnly")}</p>
        {people.length === 0 ? (
          <p className="text-muted-foreground">{t("noCollaborators")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {people.map((p) => (
              <li key={p.userId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-card-foreground">
                    {p.name}
                    {p.userId === user?.id && <span className="ml-2 text-xs text-primary">({t("you")})</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{t(DESC_KEY[p.role])}</p>
                </div>
                <Select value={p.role} disabled={!isOwner} onValueChange={(v) => onChange(p.userId, v as Role)}>
                  <SelectTrigger className="w-40" aria-label={`${t("role")}: ${p.name}`}>
                    <SelectValue>{t(ROLE_KEY[p.role])}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        <div>
                          <p>{t(ROLE_KEY[r])}</p>
                          <p className="text-xs text-muted-foreground">{t(DESC_KEY[r])}</p>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </li>
            ))}
          </ul>
        )}
        {isOwner && (
          <form
            className="mt-4 flex flex-wrap items-end gap-2 border-t border-border pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!inviteName.trim()) return;
              try {
                invite(inviteName, inviteRole);
                toast.success(t("invited"));
                setInviteName("");
              } catch {
                toast.error(t("ownerOnly"));
              }
            }}
          >
            <div className="min-w-48 flex-1">
              <p className="mb-1 text-sm font-medium">{t("inviteTitle")}</p>
              <Input placeholder={t("fullName")} value={inviteName} onChange={(e) => setInviteName(e.target.value)} />
            </div>
            <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as Role)}>
              <SelectTrigger className="w-36" aria-label={t("role")}>
                <SelectValue>{t(ROLE_KEY[inviteRole])}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{t(ROLE_KEY[r])}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="submit">{t("invite")}</Button>
          </form>
        )}
      </section>
      <section className="h-fit rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 font-display text-xl text-card-foreground">{t("language")}</h3>
        <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
          <SelectTrigger aria-label={t("language")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGS.map((l) => (
              <SelectItem key={l} value={l}>{LANG_LABEL[l]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>
    </div>
  );
}
