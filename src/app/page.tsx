
"use client";

import { TopThree } from "@/components/viewer/TopThree";
import { EntryCard } from "@/components/viewer/EntryCard";
import { CHALLENGES } from "@/lib/constants";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Loader2, Trophy, Rocket, Star } from "lucide-react";
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

  const filteredEntries = (entries || []).filter(entry => {
    const matchesSearch = entry.teamName.toLowerCase().includes(search.toLowerCase()) || 
                          entry.projectMembers?.some((m: any) => m.school.toLowerCase().includes(search.toLowerCase()));
    const matchesFilter = filter === "ALL" || entry.challengeId === filter;
    return matchesSearch && matchesFilter;
  });

  const finalists = (entries || []).filter(e => e.finalRank && e.finalRank <= 10).sort((a, b) => (a.finalRank || 0) - (b.finalRank || 0));
  const winners = (entries || []).filter(e => e.finalRank && e.finalRank <= 3);

  return (
    <div className="flex flex-col min-h-screen">
      <section className="relative h-[70vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-background to-background z-10" />
          <div className="star-twinkle absolute top-20 left-1/4 w-1 h-1 bg-white rounded-full" />
          <div className="star-twinkle absolute top-40 right-1/3 w-2 h-2 bg-accent rounded-full opacity-60" />
          <div className="star-twinkle absolute bottom-20 right-1/4 w-1 h-1 bg-white rounded-full" />
        </div>
        
        <div className="relative z-20 max-w-4xl mx-auto animate-float flex flex-col items-center">
          {logo && (
            <div className="mb-8 relative w-40 h-40">
              <Image 
                src={logo.imageUrl}
                alt={logo.description}
                width={160}
                height={160}
                className="object-contain"
                data-ai-hint={logo.imageHint}
              />
            </div>
          )}
          <h1 className="text-6xl md:text-8xl font-black text-white italic tracking-tighter mb-6 glow-accent">
            Batang <span className="text-accent">Techno</span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-400 font-light max-w-2xl mx-auto leading-relaxed">
            Building the Minds of Tomorrow's Innovators
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <Tabs defaultValue="all" className="w-full">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Discovery Hub</h2>
              <p className="text-muted-foreground">Explore the constellation of innovation</p>
            </div>
            
            <TabsList className="bg-white/5 border border-white/10 p-1 h-12 flex-wrap">
              <TabsTrigger value="all" className="data-[state=active]:bg-accent data-[state=active]:text-white gap-2 px-6">
                <Rocket className="w-4 h-4" /> All Missions
              </TabsTrigger>
              <TabsTrigger value="finalists" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white gap-2 px-6">
                <Star className="w-4 h-4" /> Stellar Finalists
              </TabsTrigger>
              <TabsTrigger value="winners" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-white gap-2 px-6">
                <Trophy className="w-4 h-4" /> Final Frontiers
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="mt-0 space-y-8">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  placeholder="Search teams or schools..." 
                  className="w-full h-10 pl-10 pr-4 rounded-md bg-secondary/50 border border-border focus:ring-1 focus:ring-accent outline-none text-sm transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              <div className="relative w-full sm:w-72">
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="bg-secondary/50 border-border text-xs">
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
                <p className="text-muted-foreground uppercase text-xs tracking-widest">Scanning Deep Space...</p>
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
                <p className="text-muted-foreground italic">No entries found in this quadrant...</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="finalists" className="mt-0">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-accent animate-spin" />
                <p className="text-muted-foreground uppercase text-xs tracking-widest">Tracking Finalists...</p>
              </div>
            ) : finalists.length > 0 ? (
              <div className="space-y-8">
                <div className="text-center py-8">
                  <h3 className="text-3xl font-black italic text-white glow-accent uppercase tracking-tighter">Stellar Finalists</h3>
                  <p className="text-muted-foreground">The top performing missions of the cycle</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {finalists.map(entry => (
                    <EntryCard key={entry.id} entry={entry as any} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-20 text-center glass-card rounded-2xl border-dashed">
                <Star className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Finalists Not Selected</h3>
                <p className="text-muted-foreground max-w-xs mx-auto italic">
                  Selection of finalists is in progress. Check back soon.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="winners" className="mt-0">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 text-accent animate-spin" />
                <p className="text-muted-foreground uppercase text-xs tracking-widest">Identifying Champions...</p>
              </div>
            ) : winners.length > 0 ? (
              <TopThree entries={entries || []} />
            ) : (
              <div className="py-20 text-center glass-card rounded-2xl border-dashed">
                <Trophy className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">Final Frontiers Awaiting</h3>
                <p className="text-muted-foreground max-w-xs mx-auto italic">
                  The Command Center is finalizing the ultimate rankings. The winners will be revealed here.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
