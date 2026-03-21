
"use client";

import { TopThree } from "@/components/viewer/TopThree";
import { EntryCard } from "@/components/viewer/EntryCard";
import { ProgrammingElite } from "@/components/viewer/ProgrammingElite";
import { CHALLENGES } from "@/lib/constants";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Loader2, Trophy, Rocket, Star, Code } from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import Image from "next/image";
import { getPlaceholderImage } from "@/lib/placeholder-images";

export default function Home() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const db = useFirestore();

  const logo = getPlaceholderImage("hero-logo");

  const entriesQuery = useMemoFirebase(() => {
    return query(collection(db, "entries"), where("adminApproved", "==", true));
  }, [db]);
  
  const { data: entries, isLoading } = useCollection(entriesQuery);

  const progWinnersQuery = useMemoFirebase(() => collection(db, "programming_winners"), [db]);
  const { data: progWinners, isLoading: isProgLoading } = useCollection(progWinnersQuery);

  const filteredEntries = (entries || []).filter(entry => {
    const matchesSearch = entry.teamName.toLowerCase().includes(search.toLowerCase()) || 
                          entry.projectMembers?.some((m: any) => m.school.toLowerCase().includes(search.toLowerCase()));
    const matchesFilter = filter === "ALL" || entry.challengeId === filter;
    return matchesSearch && matchesFilter;
  });

  const finalists = (entries || []).filter(e => e.top10Published).sort((a, b) => (a.finalRank || 0) - (b.finalRank || 0));
  const winners = (entries || []).filter(e => e.top3Published).sort((a, b) => (a.finalRank || 0) - (b.finalRank || 0));

  return (
    <div className="flex flex-col min-h-screen">
      <section className="relative h-[60vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-background to-background z-10" />
          <div className="star-twinkle absolute top-20 left-1/4 w-1 h-1 bg-white rounded-full" />
          <div className="star-twinkle absolute top-40 right-1/3 w-2 h-2 bg-accent rounded-full opacity-60" />
          <div className="star-twinkle absolute bottom-20 right-1/4 w-1 h-1 bg-white rounded-full" />
        </div>
        
        <div className="relative z-20 max-w-4xl mx-auto flex flex-col items-center">
          {logo && (
            <div className="mb-6 relative w-32 h-32">
              <Image 
                src={logo.imageUrl}
                alt={logo.description}
                width={128}
                height={128}
                className="object-contain animate-float"
                data-ai-hint={logo.imageHint}
              />
            </div>
          )}
          <h1 className="text-6xl md:text-7xl font-black text-white italic tracking-tighter mb-4 glow-accent">
            Batang <span className="text-accent">Techno</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 font-light max-w-2xl mx-auto leading-relaxed uppercase tracking-widest">
            Unleashing Future Innovators
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <Tabs defaultValue="all" className="w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Innovation Hub</h2>
              <p className="text-muted-foreground uppercase text-xs tracking-widest">The constellation of submissions</p>
            </div>
            
            <TabsList className="bg-white/5 border border-white/10 p-1 h-auto flex-wrap gap-1">
              <TabsTrigger value="all" className="data-[state=active]:bg-accent data-[state=active]:text-white gap-2 px-4 py-2 uppercase text-[10px] font-bold">
                <Rocket className="w-3.5 h-3.5" /> All Missions
              </TabsTrigger>
              <TabsTrigger value="finalists" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white gap-2 px-4 py-2 uppercase text-[10px] font-bold">
                <Star className="w-3.5 h-3.5" /> Stellar Finalists
              </TabsTrigger>
              <TabsTrigger value="winners" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-white gap-2 px-4 py-2 uppercase text-[10px] font-bold">
                <Trophy className="w-3.5 h-3.5" /> Final Frontiers
              </TabsTrigger>
              <TabsTrigger value="programming" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white gap-2 px-4 py-2 uppercase text-[10px] font-bold">
                <Code className="w-3.5 h-3.5" /> Programming Elite
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="mt-0 space-y-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  placeholder="Filter teams or schools..." 
                  className="w-full h-10 pl-10 pr-4 rounded-md bg-secondary/50 border border-border focus:ring-1 focus:ring-accent outline-none text-sm transition-all text-white"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              <div className="relative w-full sm:w-72">
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="bg-secondary/50 border-border text-[10px] uppercase font-bold text-white">
                    <div className="flex items-center gap-2">
                      <Filter className="w-3.5 h-3.5" />
                      <SelectValue placeholder="All Categories" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border text-white">
                    <SelectItem value="ALL">All Categories</SelectItem>
                    {CHALLENGES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-accent animate-spin" />
                <p className="text-muted-foreground uppercase text-xs tracking-widest">Scanning Galaxy...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {filteredEntries.map(entry => (
                  <EntryCard key={entry.id} entry={entry as any} />
                ))}
              </div>
            )}
            
            {!isLoading && filteredEntries.length === 0 && (
              <div className="py-20 text-center glass-card rounded-2xl border-dashed">
                <p className="text-muted-foreground italic uppercase text-xs">No signals found in this quadrant</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="finalists" className="mt-0">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-accent animate-spin" />
              </div>
            ) : finalists.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {finalists.map(entry => (
                  <EntryCard key={entry.id} entry={entry as any} />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center glass-card rounded-2xl border-dashed">
                <Star className="w-12 h-12 text-accent/20 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2 uppercase italic">Stellar Finalists Awaiting</h3>
                <p className="text-muted-foreground max-w-xs mx-auto italic text-xs">
                  The mission council is currently identifying the finalists.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="winners" className="mt-0">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-accent animate-spin" />
              </div>
            ) : winners.length > 0 ? (
              <TopThree entries={winners} />
            ) : (
              <div className="py-20 text-center glass-card rounded-2xl border-dashed">
                <Trophy className="w-12 h-12 text-yellow-500/20 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2 uppercase italic">Final Frontiers Locked</h3>
                <p className="text-muted-foreground max-w-xs mx-auto italic text-xs">
                  The ultimate winners will be revealed after the final evaluation.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="programming" className="mt-0">
            {isProgLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
              </div>
            ) : progWinners && progWinners.length > 0 ? (
              <ProgrammingElite winners={progWinners} />
            ) : (
              <div className="py-20 text-center glass-card rounded-2xl border-dashed">
                <Code className="w-12 h-12 text-purple-500/20 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2 uppercase italic">Elite Coders Pending</h3>
                <p className="text-muted-foreground max-w-xs mx-auto italic text-xs">
                  The results of the programming challenge are being finalized.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
