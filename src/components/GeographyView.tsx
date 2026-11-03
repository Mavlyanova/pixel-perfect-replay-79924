import { useState, useMemo } from "react";
import { useShajara, type PersonNode } from "@/context/ShajaraContext";
import { MapPin, Users, Edit3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function GeographyView() {
  const { nodes, t } = useShajara();

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

  const chronologicalLocs = useMemo(() => {
    const withLoc = nodes.filter(n => {
      const bp = n.metadata?.["Tug'ilgan joyi"] || n.metadata?.["Birthplace"] || n.metadata?.["City"] || n.metadata?.["Shahar"] || n.metadata?.["Viloyat"] || n.metadata?.["Location"];
      return !!bp && !!n.birthDate;
    }).map(n => {
      const bp = n.metadata?.["Tug'ilgan joyi"] || n.metadata?.["Birthplace"] || n.metadata?.["City"] || n.metadata?.["Shahar"] || n.metadata?.["Viloyat"] || n.metadata?.["Location"];
      return { name: n.fullName, year: parseInt(n.birthDate.substring(0,4)), loc: bp!.trim() };
    }).sort((a,b) => a.year - b.year);
    
    const moves: {name: string, year: number, loc: string}[] = [];
    for(let i=0; i<withLoc.length; i++) {
      if (i === 0 || withLoc[i].loc !== withLoc[i-1].loc) {
          moves.push({...withLoc[i]});
      } else {
          moves[moves.length-1].name += `, ${withLoc[i].name}`;
      }
    }
    return moves;
  }, [nodes]);



  if (locationKeys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-16rem)] text-center space-y-4 p-8 border border-dashed border-border rounded-xl bg-card/30">
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-2">
          <MapPin className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-display text-2xl">{t("noGeoData")}</h3>
        <p className="text-muted-foreground max-w-md">
          {t("noGeoDesc")}
        </p>
        <Button onClick={() => document.querySelector('[title="Tree"]')?.dispatchEvent(new MouseEvent("click", {bubbles:true}))} variant="outline" className="mt-4">
          <Edit3 className="mr-2 h-4 w-4" /> {t("backToTree")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">

      {chronologicalLocs.length > 1 && (
        <div className="mb-6 bg-card border border-border rounded-xl p-4 shadow-sm overflow-x-auto hidden sm:block">
          <h3 className="font-display text-xl mb-6 text-foreground">{t("familyJourney")}</h3>
          <div className="flex items-center min-w-max px-8 pb-8 pt-4">
            {chronologicalLocs.map((step, i) => (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center relative group cursor-pointer">
                  <div className="h-4 w-4 bg-primary rounded-full z-10 shadow-[0_0_12px_rgba(var(--color-primary),0.8)] transition-transform group-hover:scale-150"></div>
                  <div className="absolute top-6 whitespace-nowrap text-sm font-medium">{step.loc}</div>
                  <div className="absolute -top-10 whitespace-nowrap text-xs text-primary-foreground bg-primary px-2 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                    {step.name} ({step.year})
                  </div>
                </div>
                {i < chronologicalLocs.length - 1 && (
                  <div className="w-32 sm:w-48 relative h-0.5 mx-2">
                    <svg className="absolute inset-0 w-full h-full overflow-visible">
                      <line x1="0" y1="0" x2="100%" y2="0" stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" className="text-primary animate-[dash_2s_linear_infinite]" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes dash {
              to { stroke-dashoffset: -24; }
            }
          `}} />
        </div>
      )}

<div className="flex flex-1 gap-6 min-h-0">
      <div className="w-1/3 border-r border-border pr-4 overflow-y-auto space-y-2 pb-12">
        <h3 className="font-medium text-sm text-muted-foreground mb-4 px-2 uppercase tracking-wider">{t("regions")}</h3>
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
                <Users className="h-4 w-4" /> {t("bornInRegion", { count: String(locations[activeLoc].length) })}
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
                        {n.birthDate?.substring(0,4) || "?"} {n.deathDate ? `– ${n.deathDate.substring(0,4)}` : `- ${t('toPresent')}`}
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
</div>
  );
}
