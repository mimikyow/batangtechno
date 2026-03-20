
"use client";

import { Trophy, Star, Medal } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

interface TopThreeProps {
  entries: any[];
}

export function TopThree({ entries }: TopThreeProps) {
  const sorted = [...entries].filter(e => e.finalRank && e.finalRank <= 3).sort((a, b) => (a.finalRank || 0) - (b.finalRank || 0));

  if (sorted.length === 0) return null;

  return (
    <section className="py-12 px-4 relative">
      <div className="absolute inset-0 bg-accent/5 blur-[100px] pointer-events-none" />
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col items-center mb-12">
          <Trophy className="w-12 h-12 text-yellow-500 mb-4 animate-bounce" />
          <h2 className="text-4xl font-bold uppercase tracking-widest text-white text-center glow-accent">
            Stellar Winners
          </h2>
          <p className="text-muted-foreground mt-2">The highest achievements in this nebula</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
          {/* Rank 2 */}
          {sorted[1] && (
            <div className="order-2 md:order-1 flex flex-col items-center group">
              <div className="relative glass-card w-full p-6 rounded-2xl transform transition-all group-hover:-translate-y-2 border-slate-400">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-400 p-3 rounded-full shadow-lg">
                  <Medal className="w-6 h-6 text-white" />
                </div>
                <div className="aspect-video relative overflow-hidden rounded-lg mb-4">
                  <Image fill src={sorted[1].thumbnailImageUrl || "https://picsum.photos/seed/silver/800/600"} alt={sorted[1].teamName} className="object-cover" />
                </div>
                <h3 className="text-xl font-bold text-white text-center mb-1">{sorted[1].teamName}</h3>
                <p className="text-xs text-muted-foreground text-center uppercase tracking-tighter mb-2">{sorted[1].projectSchool}</p>
                <div className="flex justify-center">
                   <Badge variant="outline" className="text-[10px] border-slate-400 text-slate-400">SILVER RADIANCE</Badge>
                </div>
              </div>
              <div className="h-16 w-full bg-slate-400/20 mt-2 rounded-t-xl" />
            </div>
          )}

          {/* Rank 1 */}
          {sorted[0] && (
            <div className="order-1 md:order-2 flex flex-col items-center group mb-8 md:mb-12">
              <div className="relative glass-card w-full p-8 rounded-2xl transform transition-all group-hover:-translate-y-4 border-yellow-500 ring-2 ring-yellow-500/20 scale-110">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-yellow-500 p-4 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.6)] animate-pulse">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <div className="aspect-video relative overflow-hidden rounded-lg mb-4">
                  <Image fill src={sorted[0].thumbnailImageUrl || "https://picsum.photos/seed/gold/800/600"} alt={sorted[0].teamName} className="object-cover" />
                </div>
                <h3 className="text-2xl font-black text-white text-center mb-1 italic tracking-tight">{sorted[0].teamName}</h3>
                <p className="text-sm text-muted-foreground text-center uppercase tracking-widest mb-4">{sorted[0].projectSchool}</p>
                <div className="flex justify-center">
                   <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">GALACTIC CHAMPION</Badge>
                </div>
              </div>
              <div className="h-24 w-full bg-yellow-500/20 mt-2 rounded-t-xl" />
            </div>
          )}

          {/* Rank 3 */}
          {sorted[2] && (
            <div className="order-3 md:order-3 flex flex-col items-center group">
              <div className="relative glass-card w-full p-6 rounded-2xl transform transition-all group-hover:-translate-y-2 border-amber-700">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-amber-700 p-3 rounded-full shadow-lg">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <div className="aspect-video relative overflow-hidden rounded-lg mb-4">
                  <Image fill src={sorted[2].thumbnailImageUrl || "https://picsum.photos/seed/bronze/800/600"} alt={sorted[2].teamName} className="object-cover" />
                </div>
                <h3 className="text-xl font-bold text-white text-center mb-1">{sorted[2].teamName}</h3>
                <p className="text-xs text-muted-foreground text-center uppercase tracking-tighter mb-2">{sorted[2].projectSchool}</p>
                 <div className="flex justify-center">
                   <Badge variant="outline" className="text-[10px] border-amber-700 text-amber-700">BRONZE SPARK</Badge>
                </div>
              </div>
              <div className="h-12 w-full bg-amber-700/20 mt-2 rounded-t-xl" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
