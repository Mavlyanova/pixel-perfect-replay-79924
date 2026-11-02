import { useState } from "react";
import { useShajara } from "@/context/ShajaraContext";
import { LANGS, type TranslationKey } from "@/i18n/translations";
import { OnboardingModal } from "@/components/OnboardingModal";
import { TreeTab } from "@/components/TreeTab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const TABS: TranslationKey[] = ["tabTree", "tabMembers", "tabSearch", "tabSettings"];
const ROLE_KEY = { Owner: "roleOwner", Editor: "roleEditor", Viewer: "roleViewer" } as const;

export function AppShell() {
  const { ready, t, lang, setLang, isAuthenticated, user, activeTree, currentRole, nodes, logout } = useShajara();
  const [tab, setTab] = useState<TranslationKey>("tabTree");
  const [q, setQ] = useState("");

  const filtered = nodes.filter((n) => n.fullName.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen bg-heritage">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="font-display text-3xl text-primary">{t("appName")}</h1>
          <p className="text-xs text-muted-foreground">{t("tagline")}</p>
        </div>
        <div className="flex items-center gap-2">
          {LANGS.map((l) => (
            <Button key={l} size="sm" variant={l === lang ? "default" : "ghost"} onClick={() => setLang(l)}>
              {l.toUpperCase()}
            </Button>
          ))}
          {isAuthenticated && (
            <Button size="sm" variant="outline" onClick={logout}>{t("logout")}</Button>
          )}
        </div>
      </header>

      {!ready ? null : !isAuthenticated ? (
        <main className="flex justify-center px-4 py-16">
          <OnboardingModal />
        </main>
      ) : (
        <main className={`mx-auto px-6 py-8 ${tab === "tabTree" ? "max-w-7xl" : "max-w-5xl"}`}>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t("welcome", { name: user?.fullName ?? "" })}</p>
              <h2 className="font-display text-4xl text-foreground">{activeTree?.name}</h2>
            </div>
            {currentRole && (
              <span className="rounded-full bg-accent px-3 py-1 text-sm text-accent-foreground">
                {t(ROLE_KEY[currentRole])}
              </span>
            )}
          </div>
          <nav className="mb-6 flex gap-1 border-b border-border">
            {TABS.map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`px-4 py-2 text-sm transition-colors ${tab === k ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t(k)}
              </button>
            ))}
          </nav>
          {(tab === "tabSearch" || tab === "tabMembers") && (
            <Input className="mb-4" placeholder={t("searchPlaceholder")} value={q} onChange={(e) => setQ(e.target.value)} />
          )}
          {tab === "tabTree" ? (
            <TreeTab />
          ) : tab === "tabSettings" ? (
            <p className="text-muted-foreground">{t("activeTree")}: {activeTree?.name}</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground">{t("emptyTree")}</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((n) => (
                <li key={n.id} className={`rounded-xl border bg-card p-4 ${n.id === user?.nodeId ? "border-primary" : "border-border"}`}>
                  <p className="font-display text-xl text-card-foreground">{n.fullName}</p>
                  <p className="text-sm text-muted-foreground">{n.birthDate}</p>
                </li>
              ))}
            </ul>
          )}
        </main>
      )}
    </div>
  );
}
