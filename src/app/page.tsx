"use client";

import { TopThree } from "@/components/viewer/TopThree";
import { EntryCard } from "@/components/viewer/EntryCard";
import { ProgrammingElite } from "@/components/viewer/ProgrammingElite";
import { CHALLENGES } from "@/lib/constants";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Loader2, Trophy, Rocket, Star, Code } from "lucide-react";
import Image from "next/image";
import { getPlaceholderImage } from "@/lib/placeholder-images";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";

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
      {/* Hero Section */}
      <section className="relative min-h-[65vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden border-b border-white/5 py-12">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-background to-background z-10" />
          <div className="star-twinkle absolute top-20 left-1/4 w-1 h-1 bg-white rounded-full" />
          <div className="star-twinkle absolute top-40 right-1/3 w-2 h-2 bg-accent rounded-full opacity-60" />
          <div className="star-twinkle absolute bottom-20 right-1/4 w-1 h-1 bg-white rounded-full" />
        </div>
        
        <div className="relative z-20 w-full max-w-5xl mx-auto flex flex-col items-center pt-8">
          {logo && (
            <div className="mb-6 relative w-20 h-20 sm:w-36 sm:h-36">
              <Image 
                src={logo.imageUrl}
                alt={logo.description}
                width={144}
                height={144}
                className="object-contain animate-float"
                data-ai-hint={logo.imageHint}
              />
            </div>
          )}
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-black text-white italic tracking-tighter mb-4 glow-accent">
            Batang <span className="text-accent">Techno</span>
          </h1>
          <p className="text-sm sm:text-lg md:text-xl text-slate-400 font-light max-w-4xl mx-auto leading-relaxed tracking-[0.1em] sm:tracking-[0.3em] px-4">
            Building the Minds of Tomorrow's Innovators
          </p>
        </div>
      </section>

      {/* Hackathon Hub Section */}
      <section className="container mx-auto px-4 py-16 sm:py-24">
        <Tabs defaultValue="all" className="w-full">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-12 sm:mb-16 gap-8">
            <div className="text-center xl:text-left">
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tighter">Hackathon Challenge</h2>
              <p className="text-muted-foreground uppercase text-[9px] sm:text-[10px] tracking-[0.2em] sm:tracking-[0.4em] font-bold">entries that innovate to elevate</p>
            </div>
            
            <TabsList className="bg-white/5 border border-white/10 p-1 h-auto flex flex-wrap gap-1 justify-center xl:justify-start">
              <TabsTrigger value="all" className="data-[state=active]:bg-accent data-[state=active]:text-white gap-2 px-4 sm:px-6 py-2 uppercase text-[9px] sm:text-[10px] font-black tracking-widest flex-1 sm:flex-none">
                <Rocket className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> All Missions
              </TabsTrigger>
              <TabsTrigger value="finalists" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white gap-2 px-4 sm:px-6 py-2 uppercase text-[9px] sm:text-[10px] font-black tracking-widest flex-1 sm:flex-none">
                <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Stellar Finalists
              </TabsTrigger>
              <TabsTrigger value="winners" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-white gap-2 px-4 sm:px-6 py-2 uppercase text-[9px] sm:text-[10px] font-black tracking-widest flex-1 sm:flex-none">
                <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Final Frontiers
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="mt-0 space-y-12">
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  placeholder="Filter teams or schools..." 
                  className="w-full h-12 pl-10 pr-4 rounded-lg bg-secondary/30 border border-white/10 focus:ring-1 focus:ring-accent outline-none text-sm transition-all text-white placeholder:text-muted-foreground/50"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              <div className="relative w-full sm:w-80">
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="bg-secondary/30 border-white/10 h-12 text-[10px] uppercase font-black tracking-widest text-white">
                    <div className="flex items-center gap-2">
                      <Filter className="w-3.5 h-3.5 text-accent" />
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
              <div className="py-24 flex flex-col items-center justify-center gap-6">
                <Loader2 className="w-12 h-12 text-accent animate-spin" />
                <p className="text-muted-foreground uppercase text-[10px] tracking-[0.5em] font-bold">Scanning Data Stream...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
                {filteredEntries.map(entry => (
                  <EntryCard key={entry.id} entry={entry as any} />
                ))}
              </div>
            )}
            
            {!isLoading && filteredEntries.length === 0 && (
              <div className="py-32 text-center glass-card rounded-3xl border-dashed border-2 flex flex-col items-center justify-center gap-4">
                <Rocket className="w-12 h-12 text-muted-foreground/20" />
                <p className="text-muted-foreground italic uppercase text-xs tracking-widest">No signals found in this quadrant</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="finalists" className="mt-0">
            {isLoading ? (
              <div className="py-24 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-accent animate-spin" />
              </div>
            ) : finalists.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
                {finalists.map(entry => (
                  <EntryCard key={entry.id} entry={entry as any} />
                ))}
              </div>
            ) : (
              <div className="py-32 text-center glass-card rounded-3xl border-dashed border-2 flex flex-col items-center justify-center">
                <Star className="w-16 h-16 text-accent/10 mb-6" />
                <h3 className="text-2xl font-black text-white mb-2 uppercase italic tracking-widest">Stellar Finalists Awaiting</h3>
                <p className="text-muted-foreground max-w-xs mx-auto italic text-xs uppercase tracking-widest">
                  The mission council is identifying the top contenders.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="winners" className="mt-0">
            {isLoading ? (
              <div className="py-24 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-accent animate-spin" />
              </div>
            ) : winners.length > 0 ? (
              <TopThree entries={winners} />
            ) : (
              <div className="py-32 text-center glass-card rounded-3xl border-dashed border-2 flex flex-col items-center justify-center">
                <Trophy className="w-16 h-16 text-yellow-500/10 mb-6" />
                <h3 className="text-2xl font-black text-white mb-2 uppercase italic tracking-widest">Final Frontiers Locked</h3>
                <p className="text-muted-foreground max-w-xs mx-auto italic text-xs uppercase tracking-widest">
                  The ultimate winners will be revealed post-mission.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>

      {/* Programming Challenge Section */}
      <section className="bg-black/40 border-t border-white/5 py-16 sm:py-32">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center text-center mb-16 space-y-4">
            <div className="flex justify-center">
              <div className="bg-purple-500/10 p-4 rounded-full border border-purple-500/20 animate-pulse">
                <Code className="w-8 h-8 text-purple-500" />
              </div>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tighter">Programming Challenge</h2>
            <p className="text-muted-foreground uppercase text-[10px] tracking-[0.4em] font-bold">CODING EXCELLENCE IN DISPLAY</p>
          </div>

          {isProgLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-6">
              <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
              <p className="text-muted-foreground uppercase text-[10px] tracking-[0.5em] font-bold">Accessing Elite Records...</p>
            </div>
          ) : (progWinners && progWinners.length > 0) ? (
            <ProgrammingElite winners={progWinners} />
          ) : (
            <div className="text-center py-20 glass-card rounded-3xl border-dashed border-2 flex flex-col items-center justify-center">
               <div className="flex justify-center mb-6">
                <div className="bg-purple-500/10 p-4 rounded-full border border-purple-500/20">
                  <Code className="w-8 h-8 text-purple-500/20" />
                </div>
              </div>
              <h3 className="text-2xl font-black text-white mb-2 uppercase italic tracking-widest">Elite Coders Pending</h3>
              <p className="text-muted-foreground max-w-xs mx-auto italic text-xs uppercase tracking-widest">
                Algorithm results are currently being compiled.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
