import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useShajara } from "@/context/ShajaraContext";
import type { Match, User } from "@/lib/shajara";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = { kind: "form" } | { kind: "challenge"; user: User; match: Match } | { kind: "nomatch"; user: User };

export function OnboardingModal() {
  const { t, beginLogin, acceptClaim, startOwnTree } = useShajara();
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [step, setStep] = useState<Step>({ kind: "form" });
  const [error, setError] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !birthDate) {
      setError(t("required"));
      return;
    }
    setError("");
    const { user, match } = beginLogin(fullName, birthDate);
    setStep(match ? { kind: "challenge", user, match } : { kind: "nomatch", user });
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-heritage" role="dialog" aria-modal="true">
      {step.kind === "form" && (
        <form onSubmit={submit} className="space-y-5">
          <div>
            <h2 className="font-display text-3xl text-foreground">{t("loginTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("loginSubtitle")}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">{t("fullName")}</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthDate">{t("birthDate")}</Label>
            <Input id="birthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full">{t("continue")}</Button>
        </form>
      )}

      {step.kind === "challenge" && (
        <div className="space-y-6 text-center">
          <h2 className="font-display text-3xl text-foreground">{t("challengeTitle")}</h2>
          <p className="text-lg text-foreground">
            {t("challengeQuestion", {
              father: step.match.father?.fullName ?? t("unknown"),
              mother: step.match.mother?.fullName ?? t("unknown"),
            })}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setStep({ kind: "nomatch", user: step.user })}>
              {t("no")}
            </Button>
            <Button className="flex-1" onClick={() => acceptClaim(step.user, step.match)}>
              {t("yes")}
            </Button>
          </div>
        </div>
      )}

      {step.kind === "nomatch" && (
        <div className="space-y-5">
          <div>
            <h2 className="font-display text-3xl text-foreground">{t("noMatchTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("noMatchBody")}</p>
          </div>
          <Button className="w-full" onClick={() => startOwnTree(step.user)}>{t("createTree")}</Button>
          <Button variant="outline" className="w-full" onClick={() => toast(t("sheetsSoon"))}>
            {t("uploadSheets")}
          </Button>
        </div>
      )}
    </div>
  );
}
