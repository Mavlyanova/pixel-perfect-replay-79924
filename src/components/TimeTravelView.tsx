import { useState, useMemo } from "react";
import { useShajara } from "@/context/ShajaraContext";
import { Calendar, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type TimelineEvent = {
  id: string;
  year: number;
  type: "birth" | "death" | "marriage";
  title: string;
  description: string;
  avatar?: string;
};

export function TimeTravelView() {
  const { nodes, edges, t } = useShajara();
  const [search, setSearch] = useState("");
  const [century, setCentury] = useState("all");

  const events = useMemo(() => {
    const evs: TimelineEvent[] = [];
    nodes.forEach(n => {
      if (n.birthDate) {
        const y = parseInt(n.birthDate.substring(0, 4), 10);
        if (!isNaN(y)) evs.push({ id: `b-${n.id}`, year: y, type: "birth", title: `${n.fullName} ${t("born")}`, description: n.birthDate, avatar: n.avatarUrl });
      }
      if (n.deathDate) {
        const y = parseInt(n.deathDate.substring(0, 4), 10);
        if (!isNaN(y)) evs.push({ id: `d-${n.id}`, year: y, type: "death", title: `${n.fullName} ${t("died")}`, description: n.deathDate, avatar: n.avatarUrl });
      }
    });
    edges.forEach(e => {
      if (e.type === "spouse" && e.marriageYear) {
        const y = parseInt(String(e.marriageYear), 10);
        const p1 = nodes.find(n => n.id === e.from);
        const p2 = nodes.find(n => n.id === e.to);
        if (!isNaN(y) && p1 && p2) {
          evs.push({ id: `m-${e.id}`, year: y, type: "marriage", title: `${p1.fullName} & ${p2.fullName} ${t("married")}`, description: `${t("year")}: ${y}` });
        }
      }
    });
    return evs.sort((a, b) => a.year - b.year);
  }, [nodes, edges, t]);

  const filtered = useMemo(() => {
    return events.filter(e => {
      if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (century !== "all") {
        const c = parseInt(century, 10);
        if (e.year < c || e.year > c + 99) return false;
      }
      return true;
    });
  }, [events, search, century]);

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] space-y-4">
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder={t("searchEvent")} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={century} onValueChange={setCentury}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t("selectCentury")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allTimes")}</SelectItem>
            <SelectItem value="1800">{t("century19")}</SelectItem>
            <SelectItem value="1900">{t("century20")}</SelectItem>
            <SelectItem value="2000">{t("century21")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex-1 overflow-y-auto pr-4 pb-12">
        <div className="relative border-l-2 border-primary/30 ml-4 space-y-8 pb-8 mt-4">
          {filtered.length === 0 ? (
            <p className="pl-6 text-muted-foreground pt-4">{t("noEvents")}</p>
          ) : (
            filtered.map(e => (
              <div key={e.id} className="relative pl-6 group">
                <div className="absolute -left-[11px] top-2 h-5 w-5 rounded-full bg-background border-2 border-primary flex items-center justify-center transition-transform group-hover:scale-125">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                </div>
                <div className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow transition-shadow">
                  <div className="flex items-center gap-4">
                    {e.avatar ? (
                      <Avatar className="h-12 w-12 border border-border"><AvatarImage src={e.avatar} /></Avatar>
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground"><Calendar className="h-6 w-6" /></div>
                    )}
                    <div>
                      <h4 className="font-medium text-lg leading-none">{e.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1.5">{e.year} • {e.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
