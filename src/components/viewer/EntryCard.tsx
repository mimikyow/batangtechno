
"use client";

import Image from "next/image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlayCircle, Users, School, Globe, Presentation, FileText, Github } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getGoogleDriveEmbedUrl, getGoogleDriveImageUrl } from "@/lib/utils";
import { getPlaceholderImage } from "@/lib/placeholder-images";

interface ProjectMember {
  name: string;
  school: string;
  schoolLogoUrl?: string;
}

interface EntryCardProps {
  entry: {
    id: string;
    teamName: string;
    projectDescription: string;
    googleDriveVideoLink: string;
    githubLink?: string;
    thumbnailImageUrl: string;
    challengeId: string;
    projectMembers: ProjectMember[];
    finalRank?: number;
    pitchDeckLink?: string;
    top10Published?: boolean;
    top3Published?: boolean;
  };
}

export function EntryCard({ entry }: EntryCardProps) {
  const embedUrl = getGoogleDriveEmbedUrl(entry.googleDriveVideoLink);
  const imageUrl = getGoogleDriveImageUrl(entry.thumbnailImageUrl) || "https://picsum.photos/seed/default/800/600";
  const logo = getPlaceholderImage("hero-logo");

  const uniqueSchoolLogos = entry.projectMembers?.reduce((acc: string[], member) => {
    if (member.schoolLogoUrl) {
      const directUrl = getGoogleDriveImageUrl(member.schoolLogoUrl);
      if (!acc.includes(directUrl)) {
        acc.push(directUrl);
      }
    }
    return acc;
  }, []) || [];

  const primarySchool = entry.projectMembers?.[0]?.school || "Academic Institute";

  return (
    <div className="glass-card overflow-hidden group hover:border-accent/50 transition-all flex flex-col h-full rounded-xl">
      <div className="relative aspect-video overflow-hidden bg-black/20">
        <Image 
          src={imageUrl} 
          alt={entry.teamName} 
          fill 
          className="object-cover transition-transform group-hover:scale-105" 
          data-ai-hint="project thumbnail"
        />
        
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost" className="rounded-full w-14 h-14 bg-accent/20 backdrop-blur-sm border border-accent/40 hover:bg-accent/40 pointer-events-auto">
                <PlayCircle className="w-8 h-8 text-white" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl p-0 overflow-hidden bg-black border-none">
              <div className="aspect-video w-full">
                <iframe
                  width="100%"
                  height="100%"
                  src={embedUrl}
                  title={`${entry.teamName} Pitch`}
                  allowFullScreen
                ></iframe>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="absolute top-2 right-2 z-20 flex gap-2">
          {entry.top3Published && entry.finalRank && (
            <Badge className="bg-yellow-500 text-white border-none shadow-[0_0_10px_rgba(234,179,8,0.5)] text-[9px] uppercase font-bold">
              Winner #{entry.finalRank}
            </Badge>
          )}
          {entry.top10Published && !entry.top3Published && (
            <Badge className="bg-accent text-white border-none shadow-glow text-[9px] uppercase font-bold">
              Finalist
            </Badge>
          )}
        </div>
      </div>
      
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-lg font-bold text-white group-hover:text-accent transition-colors mb-2 line-clamp-1">
          {entry.teamName}
        </h3>
        
        <div className="flex flex-col gap-1.5 mb-4 text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
          <div className="flex items-center gap-2">
            <School className="w-3 h-3 text-accent" />
            <span className="truncate">{primarySchool}</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-3 h-3 text-accent" />
            <span className="truncate">{entry.challengeId}</span>
          </div>
        </div>

        <p className="text-xs text-slate-300 line-clamp-3 mb-6 flex-1 leading-relaxed">
          {entry.projectDescription}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <div className="flex items-center -space-x-2">
            {uniqueSchoolLogos.length > 0 ? (
              uniqueSchoolLogos.map((logoUrl, idx) => (
                <div key={idx} className="relative w-7 h-7 rounded-full bg-black border border-white/10 overflow-hidden">
                  <Image src={logoUrl} alt="School Logo" fill className="object-contain p-1" />
                </div>
              ))
            ) : (
              <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center border border-white/10">
                <School className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            )}
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="link" size="sm" className="text-accent hover:text-white p-0 text-[10px] uppercase font-bold">
                Mission Intel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-card border-border overflow-y-auto max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-white italic">{entry.teamName}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="aspect-video relative rounded-lg overflow-hidden border border-white/10 bg-black">
                   <iframe width="100%" height="100%" src={embedUrl} title="Pitch Video" allowFullScreen></iframe>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2">Quadrant</h4>
                      <p className="text-white text-sm">{entry.challengeId}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2">Mission Parameters</h4>
                      <p className="text-muted-foreground text-xs leading-relaxed">{entry.projectDescription}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-2">
                      {entry.githubLink && (
                        <div>
                          <h4 className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2">Source Control</h4>
                          <Button asChild variant="outline" className="w-full border-accent/30 text-accent hover:bg-accent/10 h-8 text-[10px] uppercase font-bold">
                            <a href={entry.githubLink} target="_blank" rel="noopener noreferrer">
                              <Github className="w-3 h-3 mr-2" /> GitHub Repo
                            </a>
                          </Button>
                        </div>
                      )}
                      {entry.pitchDeckLink && (
                        <div>
                          <h4 className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2">Finalist Payload</h4>
                          <Button asChild variant="outline" className="w-full border-accent/30 text-accent hover:bg-accent/10 h-8 text-[10px] uppercase font-bold">
                            <a href={entry.pitchDeckLink} target="_blank" rel="noopener noreferrer">
                              <FileText className="w-3 h-3 mr-2" /> View Pitch Deck
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-accent uppercase tracking-widest mb-2">Crew Members</h4>
                      <div className="space-y-2">
                        {entry.projectMembers?.map((m, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 bg-white/5 rounded border border-white/10">
                            <div className="overflow-hidden">
                              <div className="text-[10px] font-bold text-white truncate">{m.name}</div>
                              <div className="text-[8px] text-muted-foreground uppercase truncate">{m.school}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
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
