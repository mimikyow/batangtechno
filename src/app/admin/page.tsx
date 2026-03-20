"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CHALLENGES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Zap, ShieldAlert, Loader2, Trophy, UserPlus, KeyRound } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useUser, useFirestore, useMemoFirebase, useCollection, useAuth } from "@/firebase";
import { doc, collection, getDocs, setDoc } from "firebase/firestore";
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { firebaseConfig } from "@/firebase/config";

export default function AdminPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const isAdmin = user?.email === ADMIN_EMAIL;

  // Auto-provision admin document if the user matches the ENV email but doesn't have a doc yet
  useEffect(() => {
    if (user && isAdmin) {
      const provisionAdmin = async () => {
        const adminRef = doc(db, "roles_admin", user.uid);
        await setDoc(adminRef, {
          id: user.uid,
          externalAuthId: user.uid,
          email: user.email,
          name: user.displayName || "System Admin",
          role: "admin"
        }, { merge: true });
      };
      provisionAdmin();
    }
  }, [user, isAdmin, db]);

  const entriesQuery = useMemoFirebase(() => collection(db, "entries"), [db]);
  const { data: entries } = useCollection(entriesQuery);

  const judgesQuery = useMemoFirebase(() => collection(db, "roles_judge"), [db]);
  const { data: judges } = useCollection(judgesQuery);

  const [isAdding, setIsAdding] = useState(false);
  const [isAddingJudge, setIsAddingJudge] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
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

  const [newJudge, setNewJudge] = useState({
    name: "",
    username: "",
    email: ""
  });

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login");
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-accent animate-spin" />
        <p className="text-muted-foreground uppercase tracking-widest text-xs">Accessing Command Center...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-2 uppercase italic tracking-tighter">Access Denied</h1>
        <p className="text-muted-foreground max-w-md mb-8">Admin privileges required. Contact sys-admin.</p>
        <Button onClick={() => router.push("/login")} variant="outline" className="border-white/20">
          Go to Login
        </Button>
      </div>
    );
  }

  const handleResetPassword = async () => {
    if (!user?.email) return;
    setIsResettingPassword(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast({ 
        title: "Security Link Sent", 
        description: `Check your inbox (and spam) at ${user.email}. Domain verification in Firebase Console helps prevent spam.` 
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Reset Failed", description: error.message });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleCreateJudge = async () => {
    if (!newJudge.name || !newJudge.username || !newJudge.email) {
      toast({ variant: "destructive", title: "Error", description: "All fields are required." });
      return;
    }

    const automatedPassword = `BT_${newJudge.name.replace(/\s+/g, '')}`;
    
    try {
      const secondaryApp = !getApps().find(app => app.name === 'secondary') 
        ? initializeApp(firebaseConfig, 'secondary')
        : getApp('secondary');
      
      const secondaryAuth = getAuth(secondaryApp);
      
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newJudge.email, automatedPassword);
      const judgeUid = userCredential.user.uid;

      await setDoc(doc(db, "roles_judge", judgeUid), {
        id: judgeUid,
        externalAuthId: judgeUid,
        email: newJudge.email,
        username: newJudge.username,
        name: newJudge.name,
        role: "judge"
      });

      toast({ 
        title: "Judge Account Ready", 
        description: `Credentials: ${newJudge.email} / ${automatedPassword}. Ensure email templates are active in console.` 
      });
      
      setNewJudge({ name: "", username: "", email: "" });
      setIsAddingJudge(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Creation Failed", description: error.message });
    }
  };

  const handleProcessLeaderboard = async () => {
    if (!entries || entries.length === 0) return;
    
    setProcessingStatus("CALCULATING");
    
    try {
      const results = [];
      
      for (const entry of entries) {
        const scoresRef = collection(db, "entries", entry.id, "scoreSubmissions");
        const snapshot = await getDocs(scoresRef);
        
        let totalWeightedScore = 0;
        let submissionCount = 0;
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.scores) {
            const { mastery = 0, innovation = 0, impact = 0, compliance = 0 } = data.scores;
            // 30/30/30/10 weighted logic
            const weightedAvg = (mastery * 0.3) + (innovation * 0.3) + (impact * 0.3) + (compliance * 0.1);
            totalWeightedScore += weightedAvg;
            submissionCount++;
          }
        });
        
        results.push({
          id: entry.id,
          teamName: entry.teamName,
          school: entry.projectSchool,
          avgScore: submissionCount > 0 ? (totalWeightedScore / submissionCount).toFixed(2) : "0.00",
          submissionCount
        });
      }
      
      const sorted = results.sort((a: any, b: any) => parseFloat(b.avgScore) - parseFloat(a.avgScore));
      setRankedResults(sorted);
      setProcessingStatus("READY");
    } catch (error) {
      toast({ variant: "destructive", title: "Process Failed", description: "Check Firestore connection." });
      setProcessingStatus("IDLE");
    }
  };

  const handleApplyRanks = () => {
    rankedResults.slice(0, 10).forEach((res, index) => {
      updateDocumentNonBlocking(doc(db, "entries", res.id), { finalRank: index + 1 });
    });
    
    rankedResults.slice(10).forEach((res) => {
      updateDocumentNonBlocking(doc(db, "entries", res.id), { finalRank: null });
    });

    setIsProcessing(false);
    setProcessingStatus("IDLE");
    toast({ title: "Leaderboard Published", description: "Top 10 ranks synced to Public Board." });
  };

  const handleSaveEntry = () => {
    if (!newEntry.teamName || !newEntry.projectSchool) {
      toast({ variant: "destructive", title: "Missing Fields", description: "Team name and school are required." });
      return;
    }
    
    addDocumentNonBlocking(collection(db, "entries"), {
      ...newEntry,
      submissionDate: new Date().toISOString(),
      adminApproved: true
    });

    setIsAdding(false);
    toast({ title: "Entry Deployed", description: `${newEntry.teamName} is now live.` });
  };

  const handleDeleteEntry = (id: string) => {
    deleteDocumentNonBlocking(doc(db, "entries", id));
    toast({ title: "Entry Scrubbed", description: "Record removed from database." });
  };

  const handleUpdateRank = (id: string, rank: string) => {
    const rankNum = rank === "NONE" ? null : parseInt(rank);
    updateDocumentNonBlocking(doc(db, "entries", id), { finalRank: rankNum });
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-4xl font-bold text-white uppercase italic tracking-tighter">Command Center</h1>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleResetPassword}
              disabled={isResettingPassword}
              className="border-white/10 text-muted-foreground hover:text-white h-8 text-[10px] uppercase tracking-widest"
            >
              {isResettingPassword ? <Loader2 className="w-3 h-3 animate-spin" /> : <KeyRound className="w-3 h-3 mr-2" />}
              Reset My Password
            </Button>
          </div>
          <p className="text-muted-foreground uppercase text-xs tracking-widest">Admin Control Panel</p>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <Dialog open={isAddingJudge} onOpenChange={setIsAddingJudge}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-accent text-accent hover:bg-accent/10 uppercase text-xs font-bold tracking-widest">
                <UserPlus className="w-4 h-4 mr-2" /> Register Judge
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold uppercase italic">New Judge Protocol</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-accent tracking-widest">Full Name</label>
                  <Input placeholder="Judge Name" value={newJudge.name} onChange={e => setNewJudge({...newJudge, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-accent tracking-widest">Username</label>
                  <Input placeholder="handle" value={newJudge.username} onChange={e => setNewJudge({...newJudge, username: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-accent tracking-widest">Email</label>
                  <Input type="email" placeholder="judge@email.com" value={newJudge.email} onChange={e => setNewJudge({...newJudge, email: e.target.value})} />
                </div>
                <div className="bg-white/5 p-3 rounded text-[10px] text-muted-foreground italic">
                  Password: BT_{newJudge.name.replace(/\s+/g, '') || "Name"}
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsAddingJudge(false)} className="uppercase text-xs">Cancel</Button>
                <Button className="bg-accent uppercase text-xs font-bold" onClick={handleCreateJudge}>Authorize Judge</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAdding} onOpenChange={setIsAdding}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/80 text-white uppercase text-xs font-bold tracking-widest">
                <Plus className="w-4 h-4 mr-2" /> New Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-card border-border overflow-y-auto max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold uppercase italic">Deploy New Entry</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-accent tracking-widest">Team Name</label>
                    <Input placeholder="Team Star" value={newEntry.teamName} onChange={e => setNewEntry({...newEntry, teamName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-accent tracking-widest">School</label>
                    <Input placeholder="School Name" value={newEntry.projectSchool} onChange={e => setNewEntry({...newEntry, projectSchool: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-accent tracking-widest">Challenge</label>
                  <Select value={newEntry.challengeId} onValueChange={(val: any) => setNewEntry({...newEntry, challengeId: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CHALLENGES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-accent tracking-widest">Google Drive Video Link</label>
                  <Input placeholder="https://drive.google.com/..." value={newEntry.googleDriveVideoLink} onChange={e => setNewEntry({...newEntry, googleDriveVideoLink: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-accent tracking-widest">Thumbnail Image URL</label>
                  <Input placeholder="https://..." value={newEntry.thumbnailImageUrl} onChange={e => setNewEntry({...newEntry, thumbnailImageUrl: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-accent tracking-widest">Description</label>
                  <Textarea className="h-32" value={newEntry.projectDescription} onChange={e => setNewEntry({...newEntry, projectDescription: e.target.value})} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsAdding(false)} className="uppercase text-xs">Cancel</Button>
                <Button className="bg-accent uppercase text-xs font-bold" onClick={handleSaveEntry}>Save Entry</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isProcessing} onOpenChange={setIsProcessing}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-accent text-accent hover:bg-accent/10 uppercase text-xs font-bold tracking-widest">
                <Zap className="w-4 h-4 mr-2" /> Leaderboard Engine
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl bg-card border-border">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold uppercase italic">Calculate Standings</DialogTitle>
              </DialogHeader>
              <div className="py-6">
                {processingStatus === "IDLE" && (
                  <div className="text-center py-12">
                    <Trophy className="w-12 h-12 text-accent/20 mx-auto mb-4" />
                    <Button onClick={handleProcessLeaderboard} className="bg-accent uppercase font-bold">Process Weighted Scores</Button>
                  </div>
                )}
                {processingStatus === "CALCULATING" && (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 text-accent animate-spin mx-auto mb-4" />
                  </div>
                )}
                {processingStatus === "READY" && (
                  <div className="space-y-6">
                    <div className="glass-card rounded-lg overflow-hidden border-white/10 max-h-80 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Rank</TableHead>
                            <TableHead>Team</TableHead>
                            <TableHead>Avg Weighted</TableHead>
                            <TableHead>Evals</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rankedResults.slice(0, 10).map((res, i) => (
                            <TableRow key={res.id}>
                              <TableCell className="font-bold text-accent">#{i+1}</TableCell>
                              <TableCell>{res.teamName}</TableCell>
                              <TableCell>{res.avgScore}</TableCell>
                              <TableCell>{res.submissionCount}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <Button onClick={handleApplyRanks} className="w-full bg-accent uppercase font-bold">Publish to Global Leaderboard</Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-12">
        <div className="xl:col-span-2 glass-card rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/10 bg-white/5">
            <h2 className="font-bold uppercase text-xs tracking-widest text-accent">Active Missions</h2>
          </div>
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead>Challenge</TableHead>
                <TableHead>Current Rank</TableHead>
                <TableHead className="text-right">Manage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries?.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-white">{entry.teamName}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">{entry.projectSchool}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[9px] border-white/20">{entry.challengeId}</Badge>
                  </TableCell>
                  <TableCell>
                    <Select defaultValue={entry.finalRank?.toString() || "NONE"} onValueChange={(val) => handleUpdateRank(entry.id, val)}>
                      <SelectTrigger className="w-24 h-8 text-[10px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">Unranked</SelectItem>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(r => (
                          <SelectItem key={r} value={r.toString()}>{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteEntry(entry.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="glass-card rounded-xl overflow-hidden h-fit">
          <div className="p-4 border-b border-white/10 bg-white/5">
            <h2 className="font-bold uppercase text-xs tracking-widest text-accent">Authorized Judges</h2>
          </div>
          <div className="p-4 space-y-4">
            {judges?.map((judge) => (
              <div key={judge.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                <div>
                  <div className="font-bold text-sm text-white">{judge.name}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-tighter">@{judge.username}</div>
                </div>
                <Badge className="bg-accent/20 text-accent border-accent/20 text-[9px]">{judge.email}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
