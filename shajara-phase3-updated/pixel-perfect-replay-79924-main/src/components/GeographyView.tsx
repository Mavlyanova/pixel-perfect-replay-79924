import { useState, useMemo } from "react";
import { useShajara, type PersonNode } from "@/context/ShajaraContext";
import { MapPin, Users, Edit3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function GeographyView() {
  const { nodes, setActiveSidebarView, lang } = useShajara();

  const locations = useMemo(() => {
    const locs: Record<string, PersonNode[]> = {};
    nodes.forEach(n => {
      const bp = n.metadata?.["Tug'ilgan joyi"] || n.metadata?.["Birthplace"] || n.metadata?.["City"] || n.metadata?.["Shahar"] || n.metadata?.["Viloyat"] || n.metadata?.["Location"];
      if (bp) {
        const cleanBp = bp.trim();
        if (!locs[cleanBp]) locs[cleanBp] = [];
        locs[cleanBp].push(n);
      }
    });
    return locs;
  }, [nodes]);

  const locationKeys = Object.keys(locations).sort();
  const [activeLoc, setActiveLoc] = useState(locationKeys[0] || "");

  if (locationKeys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-16rem)] text-center space-y-4 p-8 border border-dashed border-border rounded-xl bg-card/30">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-2">
          <MapPin className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-display text-2xl">{lang === "uz" ? "Geografik ma'lumotlar yo'q" : "No geographic data"}</h3>
        <p className="text-muted-foreground max-w-md">
          {lang === "uz" 
            ? "Hali hech kimning tug'ilgan joyi kiritilmagan. Shajaraga qaytib, profilni tahrirlash orqali 'Qo'shimcha maydonlar' qismida 'Tug'ilgan joyi' maydonini qo'shing."
            : "No birthplaces have been recorded yet. Go back to the tree and edit a profile to add a 'Birthplace' field in the metadata section."}
        </p>
        <Button onClick={() => setActiveSidebarView("default")} variant="outline" className="mt-4">
          <Edit3 className="mr-2 h-4 w-4" /> {lang === "uz" ? "Daraxtga qaytish" : "Back to Tree"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-6">
      <div className="w-1/3 border-r border-border pr-4 overflow-y-auto space-y-2 pb-12">
        <h3 className="font-medium text-sm text-muted-foreground mb-4 px-2 uppercase tracking-wider">{lang === "uz" ? "Mintaqalar" : "Regions"}</h3>
        {locationKeys.map(loc => (
          <button
            key={loc}
            onClick={() => setActiveLoc(loc)}
            className={`w-full flex items-center justify-between px-3 py-3 rounded-lg transition-colors ${activeLoc === loc ? "bg-primary text-primary-foreground" : "hover:bg-muted bg-card border border-border shadow-sm"}`}
          >
            <span className="font-medium flex items-center gap-2 text-left line-clamp-1"><MapPin className="h-4 w-4 shrink-0" /> {loc}</span>
            <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${activeLoc === loc ? "bg-primary-foreground/20" : "bg-muted-foreground/20"}`}>
              {locations[loc].length}
            </span>
          </button>
        ))}
      </div>
      <div className="w-2/3 overflow-y-auto pb-12 pr-4">
        {activeLoc && locations[activeLoc] && (
          <>
            <div className="mb-6 border-b border-border pb-4">
              <h2 className="font-display text-3xl flex items-center gap-2"><MapPin className="text-primary h-7 w-7" /> {activeLoc}</h2>
              <p className="text-muted-foreground mt-2 flex items-center gap-2">
                <Users className="h-4 w-4" /> {lang === "uz" ? `Bu hududda ${locations[activeLoc].length} ta oila a'zosi tug'ilgan` : `${locations[activeLoc].length} family members born in this region`}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {locations[activeLoc].map(n => (
                <Card key={n.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-card">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Avatar className="h-12 w-12 border-2 border-primary/10">
                      <AvatarImage src={n.avatarUrl} />
                      <AvatarFallback className="bg-primary/5 text-primary font-medium">
                        {n.fullName.substring(0,2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h4 className="font-medium leading-tight truncate" title={n.fullName}>{n.fullName}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {n.birthDate?.substring(0,4) || "?"} {n.deathDate ? `– ${n.deathDate.substring(0,4)}` : '– Hozirgacha'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
