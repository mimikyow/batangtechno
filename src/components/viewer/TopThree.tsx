
"use client";

import { Trophy, Star, Medal } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { getGoogleDriveImageUrl } from "@/lib/utils";

interface TopThreeProps {
  entries: any[];
}

export function TopThree({ entries }: TopThreeProps) {
  // We expect filtered 'winners' here (top3Published)
  const sorted = [...entries].filter(e => e.finalRank && e.finalRank <= 3).sort((a, b) => (a.finalRank || 0) - (b.finalRank || 0));

  if (sorted.length === 0) return null;

  return (
    <section className="py-12 px-4 relative">
      <div className="absolute inset-0 bg-accent/5 blur-[100px] pointer-events-none" />
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col items-center mb-16">
          <Trophy className="w-10 h-10 text-yellow-500 mb-4 animate-bounce" />
          <h2 className="text-4xl font-black uppercase tracking-[0.2em] text-white text-center glow-accent italic">
            Stellar Winners
          </h2>
          <p className="text-muted-foreground mt-2 text-xs uppercase tracking-widest">The peak of achievement in this cycle</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
          {/* Rank 2 - Silver */}
          {sorted[1] && (
            <div className="order-2 md:order-1 flex flex-col items-center group">
              <div className="relative glass-card w-full p-6 rounded-2xl transform transition-all group-hover:-translate-y-2 border-slate-400/50">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-400 p-2.5 rounded-full shadow-lg">
                  <Medal className="w-5 h-5 text-white" />
                </div>
                <div className="aspect-video relative overflow-hidden rounded-lg mb-4 bg-black/20">
                  <Image fill src={getGoogleDriveImageUrl(sorted[1].thumbnailImageUrl)} alt={sorted[1].teamName} className="object-cover" />
                </div>
                <h3 className="text-lg font-bold text-white text-center mb-1">{sorted[1].teamName}</h3>
                <div className="flex justify-center">
                   <Badge variant="outline" className="text-[8px] border-slate-400 text-slate-400 font-bold uppercase tracking-widest">Silver Radiance</Badge>
                </div>
              </div>
              <div className="h-12 w-full bg-slate-400/10 mt-2 rounded-t-xl" />
            </div>
          )}

          {/* Rank 1 - Gold */}
          {sorted[0] && (
            <div className="order-1 md:order-2 flex flex-col items-center group mb-8 md:mb-10">
              <div className="relative glass-card w-full p-8 rounded-2xl transform transition-all group-hover:-translate-y-4 border-yellow-500 ring-2 ring-yellow-500/20 scale-110">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-yellow-500 p-3.5 rounded-full shadow-[0_0_20px_rgba(234,179,8,0.6)] animate-pulse">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
                <div className="aspect-video relative overflow-hidden rounded-lg mb-4 bg-black/20">
                  <Image fill src={getGoogleDriveImageUrl(sorted[0].thumbnailImageUrl)} alt={sorted[0].teamName} className="object-cover" />
                </div>
                <h3 className="text-xl font-black text-white text-center mb-1 italic uppercase tracking-tighter">{sorted[0].teamName}</h3>
                <div className="flex justify-center">
                   <Badge className="bg-yellow-500 text-white hover:bg-yellow-600 text-[9px] font-black uppercase tracking-[0.2em] px-4">Galactic Champion</Badge>
                </div>
              </div>
              <div className="h-20 w-full bg-yellow-500/10 mt-2 rounded-t-xl" />
            </div>
          )}

          {/* Rank 3 - Bronze */}
          {sorted[2] && (
            <div className="order-3 md:order-3 flex flex-col items-center group">
              <div className="relative glass-card w-full p-6 rounded-2xl transform transition-all group-hover:-translate-y-2 border-amber-700/50">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-amber-700 p-2.5 rounded-full shadow-lg">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <div className="aspect-video relative overflow-hidden rounded-lg mb-4 bg-black/20">
                  <Image fill src={getGoogleDriveImageUrl(sorted[2].thumbnailImageUrl)} alt={sorted[2].teamName} className="object-cover" />
                </div>
                <h3 className="text-lg font-bold text-white text-center mb-1">{sorted[2].teamName}</h3>
                 <div className="flex justify-center">
                   <Badge variant="outline" className="text-[8px] border-amber-700 text-amber-700 font-bold uppercase tracking-widest">Bronze Spark</Badge>
                </div>
              </div>
              <div className="h-10 w-full bg-amber-700/10 mt-2 rounded-t-xl" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
