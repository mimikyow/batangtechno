
"use client";

import { useState } from "react";
import { MOCK_ENTRIES } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Play, Info, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

export default function JudgePage() {
  const { toast } = useToast();
  const [selectedEntry, setSelectedEntry] = useState<any>(null);
  const [scores, setScores] = useState({
    innovation: 5,
    impact: 5,
    technical: 5,
    presentation: 5,
    comment: ""
  });

  const handleSubmitScore = () => {
    toast({
      title: "Score Recorded",
      description: `Evaluation for ${selectedEntry.teamName} has been transmitted to the Command Center.`
    });
    setSelectedEntry(null);
    setScores({ innovation: 5, impact: 5, technical: 5, presentation: 5, comment: "" });
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar: Entries List */}
        <div className="w-full md:w-80 flex flex-col gap-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            Mission Log <Badge variant="secondary" className="bg-accent/20 text-accent border-accent/30">{MOCK_ENTRIES.length}</Badge>
          </h2>
          <div className="flex flex-col gap-2 max-h-[70vh] overflow-y-auto pr-2">
            {MOCK_ENTRIES.map(entry => (
              <button
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className={`p-4 rounded-lg text-left transition-all border ${
                  selectedEntry?.id === entry.id 
                    ? "bg-accent/10 border-accent shadow-[0_0_10px_rgba(51,153,255,0.2)]" 
                    : "bg-white/5 border-white/10 hover:border-white/30"
                }`}
              >
                <div className="font-bold text-white text-sm">{entry.teamName}</div>
                <div className="text-[10px] text-muted-foreground uppercase">{entry.school}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content: Judging Form */}
        <div className="flex-1">
          {selectedEntry ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 space-y-6">
                  <div>
                    <h1 className="text-4xl font-black text-white glow-accent italic">{selectedEntry.teamName}</h1>
                    <p className="text-accent font-semibold">{selectedEntry.challenge}</p>
                  </div>
                  
                  <div className="aspect-video relative rounded-2xl overflow-hidden border border-white/10 bg-black">
                     <iframe
                        width="100%"
                        height="100%"
                        src={selectedEntry.videoLink}
                        title="Pitch Video"
                        allowFullScreen
                      ></iframe>
                  </div>

                  <div className="glass-card p-6 rounded-xl">
                    <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4 text-accent" /> Project Brief
                    </h3>
                    <p className="text-slate-300 text-sm leading-relaxed">{selectedEntry.description}</p>
                  </div>
                </div>

                <div className="w-full lg:w-96 glass-card p-8 rounded-2xl border-accent/30 shadow-glow">
                  <h3 className="text-xl font-bold text-white mb-8 border-b border-white/10 pb-4">Evaluation Matrix</h3>
                  
                  <div className="space-y-8">
                    {[
                      { key: "innovation", label: "Innovation & Creativity", desc: "How original is the idea?" },
                      { key: "impact", label: "Potential Impact", desc: "Real world usefulness" },
                      { key: "technical", label: "Technical Execution", desc: "Quality of the build" },
                      { key: "presentation", label: "Presentation", desc: "Pitch clarity & quality" },
                    ].map(crit => (
                      <div key={crit.key} className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-bold text-white">{crit.label}</label>
                          <span className="text-accent font-mono text-lg">{(scores as any)[crit.key]} / 10</span>
                        </div>
                        <Slider 
                          max={10} 
                          step={1} 
                          value={[(scores as any)[crit.key]]} 
                          onValueChange={(val) => setScores({...scores, [crit.key]: val[0]})}
                        />
                        <p className="text-[10px] text-muted-foreground italic">{crit.desc}</p>
                      </div>
                    ))}

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-white">Judge's Final Thoughts</label>
                      <Textarea 
                        placeholder="Internal notes for committee..." 
                        className="bg-black/20 border-white/10 h-24"
                        value={scores.comment}
                        onChange={e => setScores({...scores, comment: e.target.value})}
                      />
                    </div>

                    <Button className="w-full bg-accent hover:bg-accent/80 py-6" onClick={handleSubmitScore}>
                      <CheckCircle className="w-5 h-5 mr-2" /> Submit Evaluation
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-40 glass-card rounded-2xl border-dashed border-2">
              <div className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <AlertCircle className="w-10 h-10 text-accent" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Awaiting Selection</h2>
              <p className="text-muted-foreground max-w-xs">Please select a mission from the log to begin evaluation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
