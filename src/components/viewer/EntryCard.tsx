
"use client";

import { HackathonEntry } from "@/lib/types";
import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlayCircle, Users, School, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EntryCardProps {
  entry: HackathonEntry;
}

export function EntryCard({ entry }: EntryCardProps) {
  return (
    <div className="glass-card overflow-hidden group hover:border-accent/50 transition-all flex flex-col h-full">
      <div className="relative aspect-video overflow-hidden">
        <Image 
          src={entry.thumbnailUrl} 
          alt={entry.teamName} 
          fill 
          className="object-cover transition-transform group-hover:scale-105" 
        />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" className="rounded-full w-16 h-16 bg-accent/20 backdrop-blur-sm border border-accent/40 hover:bg-accent/40">
                <PlayCircle className="w-10 h-10 text-white" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-none">
              <div className="aspect-video w-full">
                <iframe
                  width="100%"
                  height="100%"
                  src={entry.videoLink}
                  title={`${entry.teamName} Pitch`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="absolute top-2 right-2">
          {entry.rank && (
            <Badge className="bg-accent text-white border-none shadow-glow">
              Rank #{entry.rank}
            </Badge>
          )}
        </div>
      </div>
      
      <div className="p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-white group-hover:text-accent transition-colors">
            {entry.teamName}
          </h3>
        </div>
        
        <div className="flex flex-col gap-1.5 mb-4 text-xs text-muted-foreground uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <School className="w-3.5 h-3.5 text-accent" />
            {entry.school}
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-accent" />
            {entry.challenge.split(' ').slice(0, 3).join(' ')}...
          </div>
        </div>

        <p className="text-sm text-slate-300 line-clamp-3 mb-6 flex-1">
          {entry.description}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <div className="flex -space-x-2">
            {entry.members.map((member, i) => (
              <div 
                key={member.id} 
                title={member.name}
                className="w-8 h-8 rounded-full border-2 border-card bg-secondary flex items-center justify-center text-[10px] font-bold text-white"
              >
                {member.name.charAt(0)}
              </div>
            ))}
            {entry.members.length > 3 && (
              <div className="w-8 h-8 rounded-full border-2 border-card bg-accent/20 flex items-center justify-center text-[10px] font-bold text-accent">
                +{entry.members.length - 3}
              </div>
            )}
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="link" size="sm" className="text-accent hover:text-white p-0">
                Project Details
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-white">{entry.teamName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="aspect-video relative rounded-lg overflow-hidden">
                   <iframe
                    width="100%"
                    height="100%"
                    src={entry.videoLink}
                    title={`${entry.teamName} Pitch`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-accent uppercase tracking-widest mb-2">Challenge</h4>
                  <p className="text-white">{entry.challenge}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-accent uppercase tracking-widest mb-2">About Project</h4>
                  <p className="text-muted-foreground text-sm leading-relaxed">{entry.description}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-accent uppercase tracking-widest mb-2">Team Stellar</h4>
                  <div className="flex flex-wrap gap-2">
                    {entry.members.map(m => (
                      <Badge key={m.id} variant="secondary" className="flex gap-2 items-center">
                        <Users className="w-3 h-3" />
                        {m.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
