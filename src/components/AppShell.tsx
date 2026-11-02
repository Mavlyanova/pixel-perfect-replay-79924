import { useEffect, useState } from "react";
import { ChevronsLeft, ChevronsRight, GitFork, LogOut, Moon, Settings, Sun, Users } from "lucide-react";
import { useShajara } from "@/context/ShajaraContext";
import { LANGS, type Lang, type TranslationKey } from "@/i18n/translations";
import { OnboardingModal } from "@/components/OnboardingModal";
import { TreeTab } from "@/components/TreeTab";
import { PeopleTab } from "@/components/PeopleTab";
import { SettingsTab, LANG_LABEL } from "@/components/SettingsTab";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Tab = "tabTree" | "tabPeople" | "tabSettings";
const TABS: { key: Tab; icon: typeof Users }[] = [
  { key: "tabTree", icon: GitFork },
  { key: "tabPeople", icon: Users },
  { key: "tabSettings", icon: Settings },
];
const ROLE_KEY = { Owner: "roleOwner", Editor: "roleEditor", Viewer: "roleViewer" } as const;
const THEME_KEY = "shajara:theme";
const SIDEBAR_KEY = "shajara:sidebar";

export function AppShell() {
  const { ready, t, lang, setLang, isAuthenticated, user, activeTree, currentRole, nodes, logout } = useShajara();
  const [tab, setTab] = useState<Tab>("tabTree");
  const [dark, setDark] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setDark(window.localStorage.getItem(THEME_KEY) === "dark");
    setCollapsed(window.localStorage.getItem(SIDEBAR_KEY) === "1");
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const toggleTheme = () => {
    window.localStorage.setItem(THEME_KEY, dark ? "light" : "dark");
    setDark(!dark);
  };
  const toggleSidebar = () => {
    window.localStorage.setItem(SIDEBAR_KEY, collapsed ? "0" : "1");
    setCollapsed(!collapsed);
  };

  const langPicker = (
    <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
      <SelectTrigger className="h-9 w-32" aria-label={t("language")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LANGS.map((l) => (
          <SelectItem key={l} value={l}>{LANG_LABEL[l]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
  const themeBtn = (
    <Button size="icon" variant="ghost" onClick={toggleTheme} aria-label={t("theme")} title={dark ? t("light") : t("dark")}>
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );

  if (!ready) return <div className="min-h-screen bg-heritage" />;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-heritage">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h1 className="font-display text-3xl text-primary">{t("appName")}</h1>
            <p className="text-xs text-muted-foreground">{t("tagline")}</p>
          </div>
          <div className="flex items-center gap-2">{langPicker}{themeBtn}</div>
        </header>
        <main className="flex justify-center px-4 py-16">
          <OnboardingModal />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-heritage">
      <aside
        className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] ${collapsed ? "w-16" : "w-60"}`}
      >
        <div className="flex items-center justify-between px-3 py-4">
          {!collapsed && <span className="font-display text-2xl text-sidebar-primary">{t("appName")}</span>}
          <Button size="icon" variant="ghost" onClick={toggleSidebar} aria-label={t("collapse")}>
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
          </Button>
        </div>
        <nav className="flex flex-col gap-1 px-2">
          {TABS.map(({ key, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              title={t(key)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${tab === key ? "bg-sidebar-primary text-sidebar-primary-foreground" : "hover:bg-sidebar-accent"}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && t(key)}
            </button>
          ))}
        </nav>
        <div className="mt-auto space-y-2 border-t border-sidebar-border p-3">
          {!collapsed && (
            <div className="text-xs">
              <p className="text-muted-foreground">{t("activeTree")}</p>
              <p className="font-medium">{activeTree?.name}</p>
              <p className="text-muted-foreground">{nodes.length} {t("members")}</p>
            </div>
          )}
          <div className={`flex gap-1 ${collapsed ? "flex-col items-center" : "items-center"}`}>
            {themeBtn}
            <Button size="icon" variant="ghost" onClick={logout} aria-label={t("logout")} title={t("logout")}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-3">
          <nav className="flex gap-1">
            {TABS.map(({ key }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-4 py-2 text-sm transition-colors ${tab === key ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t(key as TranslationKey)}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {currentRole && (
              <span className="rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground">{t(ROLE_KEY[currentRole])}</span>
            )}
            {langPicker}
          </div>
        </header>
        <main className="px-6 py-6">
          <div className="mb-5">
            <p className="text-sm text-muted-foreground">{t("welcome", { name: user?.fullName ?? "" })}</p>
            <h2 className="font-display text-4xl text-foreground">{activeTree?.name}</h2>
          </div>
          {tab === "tabTree" ? <TreeTab /> : tab === "tabPeople" ? <PeopleTab /> : <SettingsTab />}
        </main>
      </div>
    </div>
  );
}
