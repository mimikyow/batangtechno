
export type Challenge = 
  | "SMART MOBILITY AND TRANSPORTATION"
  | "DIGITAL LITERACY AND COMBATING DISINFORMATION"
  | "TRANSPARENCY, ACCOUNTABILITY, AND GOOD GOVERNANCE"
  | "EMPLOYMENT AND ECONOMIC OPPORTUNITIES"
  | "HEALTHCARE ACCESS FOR RURAL AND REMOTE COMMUNITIES"
  | "SUSTAINABLE AGRICULTURE";

export interface ProjectMember {
  id: string;
  name: string;
}

export interface HackathonEntry {
  id: string;
  teamName: string;
  school: string;
  members: ProjectMember[];
  videoLink: string;
  thumbnailUrl: string;
  description: string;
  challenge: Challenge;
  rank?: number;
  score?: number;
}

export interface ScoreCriteria {
  innovation: number;
  impact: number;
  technical: number;
  presentation: number;
}

export interface JudgingScore {
  id: string;
  entryId: string;
  judgeId: string;
  criteria: ScoreCriteria;
  comment: string;
}
