
"use client";

import { Trophy, Medal, Star } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { ProgrammingWinner } from "@/lib/types";
import { getGoogleDriveImageUrl } from "@/lib/utils";

interface ProgrammingEliteProps {
  winners: ProgrammingWinner[];
}

export function ProgrammingElite({ winners }: ProgrammingEliteProps) {
  const collegeWinners = winners
    .filter((w) => w.category === "COLLEGE")
    .sort((a, b) => a.place - b.place);
  
  const hsWinners = winners
    .filter((w) => w.category === "HIGH_SCHOOL")
    .sort((a, b) => a.place - b.place);

  const renderPodium = (categoryWinners: ProgrammingWinner[], title: string) => {
    // Desktop order: 2nd, 1st, 3rd. Mobile order will be handled by order-X classes.
    const podiumOrder = [
      categoryWinners.find(w => w.place === 2),
      categoryWinners.find(w => w.place === 1),
      categoryWinners.find(w => w.place === 3)
    ].filter(Boolean) as ProgrammingWinner[];

    if (categoryWinners.length === 0) return null;

    return (
      <div className="space-y-12">
        <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-widest text-center border-b border-white/10 pb-4">
          {title}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end max-w-5xl mx-auto px-4">
          {podiumOrder.map((winner) => {
            const isFirst = winner.place === 1;
            const isSecond = winner.place === 2;
            const isThird = winner.place === 3;

            return (
              <div 
                key={winner.id} 
                className={`flex flex-col items-center group w-full 
                  ${isFirst ? 'md:mb-8 z-10 order-1 md:order-2' : ''} 
                  ${isSecond ? 'order-2 md:order-1' : ''} 
                  ${isThird ? 'order-3 md:order-3' : ''}`}
              >
                <div className={`relative glass-card w-full p-6 rounded-2xl transition-all duration-500 group-hover:-translate-y-2 border-white/10 
                  ${isFirst ? 'scale-105 md:scale-110 border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.1)]' : ''}`}>
                  
                  <div className={`absolute -top-5 left-1/2 -translate-x-1/2 p-2 rounded-full shadow-lg border border-white/20 z-20 ${
                    isFirst ? 'bg-yellow-500' : isSecond ? 'bg-slate-400' : 'bg-amber-700'
                  }`}>
                    {isFirst ? <Trophy className="w-5 h-5 text-white" /> : isSecond ? <Medal className="w-5 h-5 text-white" /> : <Star className="w-5 h-5 text-white" />}
                  </div>
                  
                  <div className="aspect-square relative overflow-hidden rounded-full mb-6 mx-auto w-24 h-24 sm:w-32 sm:h-32 border-4 border-white/5 bg-black/20">
                    <Image 
                      fill 
                      src={getGoogleDriveImageUrl(winner.pictureUrl) || "https://picsum.photos/seed/winner/200/200"} 
                      alt={winner.name} 
                      className="object-cover"
                      data-ai-hint="winner portrait"
                    />
                  </div>

                  <div className="text-center space-y-2">
                    <h4 className={`font-black text-white uppercase tracking-tight truncate w-full ${isFirst ? 'text-lg' : 'text-base'}`}>
                      {winner.name}
                    </h4>
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-2 max-w-full">
                        <div className="relative w-4 h-4 flex-shrink-0">
                          <Image src={getGoogleDriveImageUrl(winner.schoolLogoUrl)} alt="School" fill className="object-contain" />
                        </div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold truncate max-w-[150px]">{winner.school}</span>
                      </div>
                      <Badge variant="outline" className={`text-[8px] font-black uppercase border-white/10 ${
                        isFirst ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' : 
                        isSecond ? 'bg-slate-400/20 text-slate-300 border-slate-400/30' : 
                        'bg-amber-700/20 text-amber-600 border-amber-700/30'
                      }`}>
                        {winner.place === 1 ? 'Champion' : winner.place === 2 ? 'Silver Medalist' : 'Bronze Medalist'}
                      </Badge>
                    </div>
                  </div>
                </div>
                {/* Visual base for the podium pedestals */}
                <div className={`w-full rounded-t-xl hidden md:block ${
                  isFirst ? 'h-16 bg-yellow-500/5 mt-4' : isSecond ? 'h-10 bg-slate-400/5 mt-2' : 'h-6 bg-amber-700/5 mt-2'
                }`} />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="py-8 sm:py-12 space-y-16 sm:space-y-24">
      <div className="space-y-24 sm:space-y-32">
        {renderPodium(collegeWinners, "College Division")}
        {renderPodium(hsWinners, "Senior High School Division")}
      </div>
    </div>
  );
}
