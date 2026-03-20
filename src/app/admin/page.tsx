
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CHALLENGES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit2, UploadCloud, Users, ShieldAlert, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { doc, collection } from "firebase/firestore";
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
          <h1 className="text-4xl font-bold text-white mb-2">Command Center</h1>
          <p className="text-muted-foreground">Managing {entries?.length || 0} active stellar missions</p>
        </div>
        
        <div className="flex gap-4">
          <Dialog open={isAdding} onOpenChange={setIsAdding}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/80 text-white">
                <Plus className="w-4 h-4 mr-2" /> New Entry
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-card border-border overflow-y-auto max-h-[90vh]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Deploy New Hackathon Entry</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-accent">Team Name</label>
                    <Input 
                      placeholder="e.g. Starburst" 
                      value={newEntry.teamName} 
                      onChange={e => setNewEntry({...newEntry, teamName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-accent">School / Institution</label>
                    <Input 
                      placeholder="e.g. Galaxy Tech" 
                      value={newEntry.projectSchool} 
                      onChange={e => setNewEntry({...newEntry, projectSchool: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-accent">Challenge chosen</label>
                  <Select value={newEntry.challengeId} onValueChange={(val: any) => setNewEntry({...newEntry, challengeId: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CHALLENGES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-accent">Members (Min 3)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {newEntry.projectMembers.map((m, i) => (
                      <Input key={i} value={m} onChange={e => handleMemberChange(i, e.target.value)} placeholder={`Member ${i+1}`} />
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleAddMember} className="mt-2">
                    <Users className="w-4 h-4 mr-2" /> Add Member
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-accent">Video (Embed Link)</label>
                    <Input 
                      placeholder="https://youtube.com/embed/..." 
                      value={newEntry.googleDriveVideoLink} 
                      onChange={e => setNewEntry({...newEntry, googleDriveVideoLink: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-accent">Thumbnail URL</label>
                    <Input 
                      placeholder="https://..." 
                      value={newEntry.thumbnailImageUrl} 
                      onChange={e => setNewEntry({...newEntry, thumbnailImageUrl: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-accent">Project Description</label>
                  <Textarea 
                    placeholder="Briefly describe the mission objective..." 
                    className="h-32"
                    value={newEntry.projectDescription}
                    onChange={e => setNewEntry({...newEntry, projectDescription: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsAdding(false)}>Abort</Button>
                <Button className="bg-accent" onClick={handleSaveEntry}>Initiate Launch</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" className="border-accent text-accent hover:bg-accent/10">
            <UploadCloud className="w-4 h-4 mr-2" /> Bulk Scores Upload
          </Button>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        {isEntriesLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Retrieving mission logs...</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="border-white/10">
                <TableHead className="text-accent uppercase text-xs">Team & School</TableHead>
                <TableHead className="text-accent uppercase text-xs">Challenge</TableHead>
                <TableHead className="text-accent uppercase text-xs text-center">Current Rank</TableHead>
                <TableHead className="text-accent uppercase text-xs text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries?.map((entry) => (
                <TableRow key={entry.id} className="border-white/5 hover:bg-white/5 transition-colors">
                  <TableCell className="py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-white text-lg">{entry.teamName}</span>
                      <span className="text-xs text-muted-foreground uppercase">{entry.projectSchool}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] max-w-[150px] truncate">
                      {entry.challengeId}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <Select defaultValue={entry.finalRank?.toString() || "NONE"} onValueChange={(val) => handleUpdateRank(entry.id, val)}>
                        <SelectTrigger className="w-24 bg-transparent border-white/20">
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
