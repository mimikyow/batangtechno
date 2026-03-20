
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CHALLENGES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit2, Zap, Users, ShieldAlert, Loader2, Trophy, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { doc, collection, getDocs } from "firebase/firestore";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";

export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const adminDocRef = useMemoFirebase(() => user ? doc(db, "roles_admin", user.uid) : null, [db, user]);
  const { data: adminRole, isLoading: isAdminChecking } = useDoc(adminDocRef);

  const entriesQuery = useMemoFirebase(() => collection(db, "entries"), [db]);
  const { data: entries, isLoading: isEntriesLoading } = useCollection(entriesQuery);

  const [isAdding, setIsAdding] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<"IDLE" | "CALCULATING" | "READY">("IDLE");
  const [rankedResults, setRankedResults] = useState<any[]>([]);

  const [newEntry, setNewEntry] = useState({
    teamName: "",
    projectSchool: "",
    projectDescription: "",
    challengeId: CHALLENGES[0],
    googleDriveVideoLink: "",
    thumbnailImageUrl: "",
    projectMembers: ["Member 1", "Member 2", "Member 3"]
  });

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login");
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || isAdminChecking) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-accent animate-spin" />
        <p className="text-muted-foreground uppercase tracking-widest text-xs">Accessing Command Center...</p>
      </div>
    );
  }

  if (!adminRole) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-2 uppercase italic tracking-tighter">Access Denied</h1>
        <p className="text-muted-foreground max-w-md mb-8">Your credentials do not grant administrative privileges. Please login with admin credentials.</p>
        <Button onClick={() => router.push("/login")} variant="outline" className="border-white/20">
          Go to Login
        </Button>
      </div>
    );
  }

  const handleProcessLeaderboard = async () => {
    if (!entries || entries.length === 0) return;
    
    setProcessingStatus("CALCULATING");
    
    try {
      const results = [];
      
      for (const entry of entries) {
        const scoresRef = collection(db, "entries", entry.id, "scoreSubmissions");
        const snapshot = await getDocs(scoresRef);
        
        let totalScore = 0;
        let submissionCount = 0;
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.scores) {
            const avg = (data.scores.innovation + data.scores.impact + data.scores.technical + data.scores.presentation) / 4;
            totalScore += avg;
            submissionCount++;
          }
        });
        
        results.push({
          id: entry.id,
          teamName: entry.teamName,
          school: entry.projectSchool,
          avgScore: submissionCount > 0 ? (totalScore / submissionCount).toFixed(2) : 0,
          submissionCount
        });
      }
      
      // Sort by score descending
      const sorted = results.sort((a: any, b: any) => parseFloat(b.avgScore) - parseFloat(a.avgScore));
      setRankedResults(sorted);
      setProcessingStatus("READY");
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Process Failed", description: "Could not aggregate scores." });
      setProcessingStatus("IDLE");
    }
  };

  const handleApplyRanks = () => {
    rankedResults.slice(0, 10).forEach((res, index) => {
      updateDocumentNonBlocking(doc(db, "entries", res.id), { finalRank: index + 1 });
    });
    
    // Clear rank for others
    rankedResults.slice(10).forEach((res) => {
      updateDocumentNonBlocking(doc(db, "entries", res.id), { finalRank: null });
    });

    setIsProcessing(false);
    setProcessingStatus("IDLE");
    toast({ title: "Leaderboard Published", description: "Top 10 ranks have been updated on the public board." });
  };

  const handleAddMember = () => {
    setNewEntry(prev => ({ ...prev, projectMembers: [...prev.projectMembers, `Member ${prev.projectMembers.length + 1}`] }));
  };

  const handleMemberChange = (index: number, value: string) => {
    const updated = [...newEntry.projectMembers];
    updated[index] = value;
    setNewEntry(prev => ({ ...prev, projectMembers: updated }));
  };

  const handleSaveEntry = () => {
    if (!newEntry.teamName || !newEntry.projectSchool) {
      toast({ variant: "destructive", title: "Missing Fields", description: "Team name and school are required." });
      return;
    }
    
    addDocumentNonBlocking(collection(db, "entries"), {
      ...newEntry,
      submissionDate: new Date().toISOString(),
      adminApproved: true,
      assignedJudges: {}
    });

    setIsAdding(false);
    toast({ title: "Entry Uploaded", description: `${newEntry.teamName} has been added to the mission.` });
  };

  const handleDeleteEntry = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "entries", id));
    toast({ title: "Entry Removed", description: "The entry has been decommissioned." });
  };

  const handleUpdateRank = (id: string, rank: string) => {
    const rankNum = rank === "NONE" ? null : parseInt(rank);
    updateDocumentNonBlocking(doc(db, "entries", id), { finalRank: rankNum });
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 uppercase italic tracking-tighter">Command Center</h1>
          <p className="text-muted-foreground uppercase text-xs tracking-widest">Managing {entries?.length || 0} active stellar missions</p>
        </div>
        
        <div className="flex gap-4">
          <Dialog open={isAdding} onOpenChange={setIsAdding}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/80 text-white uppercase text-xs font-bold tracking-widest">
                <Plus className="w-4 h-4 mr-2" /> New Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-card border-border overflow-y-auto max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold uppercase italic">Deploy New Hackathon Entry</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-accent tracking-widest">Team Name</label>
                    <Input 
                      placeholder="e.g. Starburst" 
                      value={newEntry.teamName} 
                      onChange={e => setNewEntry({...newEntry, teamName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-accent tracking-widest">School / Institution</label>
                    <Input 
                      placeholder="e.g. Galaxy Tech" 
                      value={newEntry.projectSchool} 
                      onChange={e => setNewEntry({...newEntry, projectSchool: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-accent tracking-widest">Challenge Category</label>
                  <Select value={newEntry.challengeId} onValueChange={(val: any) => setNewEntry({...newEntry, challengeId: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CHALLENGES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-accent tracking-widest">Members (Min 3)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {newEntry.projectMembers.map((m, i) => (
                      <Input key={i} value={m} onChange={e => handleMemberChange(i, e.target.value)} placeholder={`Member ${i+1}`} />
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleAddMember} className="mt-2 text-[10px] uppercase font-bold">
                    <Users className="w-3 h-3 mr-2" /> Add Member
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-accent tracking-widest">Video (Embed Link)</label>
                    <Input 
                      placeholder="https://youtube.com/embed/..." 
                      value={newEntry.googleDriveVideoLink} 
                      onChange={e => setNewEntry({...newEntry, googleDriveVideoLink: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-accent tracking-widest">Thumbnail URL</label>
                    <Input 
                      placeholder="https://..." 
                      value={newEntry.thumbnailImageUrl} 
                      onChange={e => setNewEntry({...newEntry, thumbnailImageUrl: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-accent tracking-widest">Project Description</label>
                  <Textarea 
                    placeholder="Briefly describe the mission objective..." 
                    className="h-32"
                    value={newEntry.projectDescription}
                    onChange={e => setNewEntry({...newEntry, projectDescription: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsAdding(false)} className="uppercase text-xs">Abort</Button>
                <Button className="bg-accent uppercase text-xs font-bold" onClick={handleSaveEntry}>Initiate Launch</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isProcessing} onOpenChange={setIsProcessing}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-accent text-accent hover:bg-accent/10 uppercase text-xs font-bold tracking-widest">
                <Zap className="w-4 h-4 mr-2" /> Process Leaderboard
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold uppercase italic">Leaderboard Processor</DialogTitle>
              </DialogHeader>
              
              <div className="py-6">
                {processingStatus === "IDLE" && (
                  <div className="text-center py-12">
                    <Trophy className="w-12 h-12 text-accent/20 mx-auto mb-4" />
                    <p className="text-muted-foreground mb-6">Ready to aggregate scores from all judges and calculate the current standing.</p>
                    <Button onClick={handleProcessLeaderboard} className="bg-accent uppercase font-bold">Start Calculation</Button>
                  </div>
                )}

                {processingStatus === "CALCULATING" && (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 text-accent animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground uppercase text-xs tracking-widest">Scanning Judge Logs & Crunching Data...</p>
                  </div>
                )}

                {processingStatus === "READY" && (
                  <div className="space-y-6">
                    <div className="glass-card rounded-lg overflow-hidden border-white/10">
                      <Table>
                        <TableHeader className="bg-white/5">
                          <TableRow className="border-white/5">
                            <TableHead className="text-[10px] uppercase text-accent font-bold">Rank</TableHead>
                            <TableHead className="text-[10px] uppercase text-accent font-bold">Team</TableHead>
                            <TableHead className="text-[10px] uppercase text-accent font-bold text-center">Avg Score</TableHead>
                            <TableHead className="text-[10px] uppercase text-accent font-bold text-center">Judges</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rankedResults.slice(0, 10).map((res, i) => (
                            <TableRow key={res.id} className="border-white/5">
                              <TableCell className="font-bold text-accent">#{i+1}</TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="text-white font-bold">{res.teamName}</span>
                                  <span className="text-[9px] text-muted-foreground uppercase">{res.school}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-mono text-white">{res.avgScore}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary" className="text-[9px]">{res.submissionCount}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    <div className="bg-accent/5 border border-accent/20 p-4 rounded-lg flex gap-4 items-start">
                      <AlertTriangle className="w-5 h-5 text-accent shrink-0 mt-1" />
                      <p className="text-xs text-slate-300">
                        Finalizing rankings will immediately update the public board. This will set the Top 10 Finalists and Top 3 Winners based on the current averages.
                      </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button variant="ghost" onClick={() => setProcessingStatus("IDLE")} className="uppercase text-xs">Recalculate</Button>
                      <Button onClick={handleApplyRanks} className="bg-accent uppercase text-xs font-bold tracking-widest">Publish Ranks</Button>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        {isEntriesLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground uppercase text-xs tracking-widest">Retrieving mission logs...</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="border-white/10">
                <TableHead className="text-accent uppercase text-[10px] font-bold tracking-widest">Team & School</TableHead>
                <TableHead className="text-accent uppercase text-[10px] font-bold tracking-widest">Challenge</TableHead>
                <TableHead className="text-accent uppercase text-[10px] font-bold tracking-widest text-center">Status / Rank</TableHead>
                <TableHead className="text-accent uppercase text-[10px] font-bold tracking-widest text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries?.map((entry) => (
                <TableRow key={entry.id} className="border-white/5 hover:bg-white/5 transition-colors">
                  <TableCell className="py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-white text-lg">{entry.teamName}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-tight">{entry.projectSchool}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[9px] max-w-[150px] truncate border-white/20 text-muted-foreground">
                      {entry.challengeId}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <Select defaultValue={entry.finalRank?.toString() || "NONE"} onValueChange={(val) => handleUpdateRank(entry.id, val)}>
                        <SelectTrigger className="w-28 bg-transparent border-white/20 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">Unranked</SelectItem>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(rank => (
                            <SelectItem key={rank} value={rank.toString()}>
                              {rank === 1 ? "1st Place" : rank === 2 ? "2nd Place" : rank === 3 ? "3rd Place" : `Rank ${rank}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Button variant="ghost" size="icon" className="hover:text-accent"><Edit2 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleDeleteEntry(entry.id)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!entries || entries.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="h-40 text-center text-muted-foreground italic">
                    No active missions registered in the constellation.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
