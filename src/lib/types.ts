
export type Challenge = 
  | "SMART MOBILITY AND TRANSPORTATION"
  | "DIGITAL LITERACY AND COMBATING DISINFORMATION"
  | "TRANSPARENCY, ACCOUNTABILITY, AND GOOD GOVERNANCE"
  | "EMPLOYMENT AND ECONOMIC OPPORTUNITIES"
  | "HEALTHCARE ACCESS FOR RURAL AND REMOTE COMMUNITIES"
  | "SUSTAINABLE AGRICULTURE";

export interface ProjectMember {
  id?: string;
  name: string;
  school: string;
  schoolLogoUrl?: string;
}

export interface HackathonEntry {
  id: string;
  projectName: string;
  teamName: string;
  projectDescription: string;
  googleDriveVideoLink: string;
  githubLink?: string;
  thumbnailImageUrl: string;
  challengeId: string;
  projectMembers: ProjectMember[];
  submissionDate: string;
  adminApproved: boolean;
  top10Published: boolean;
  top3Published: boolean;
  finalRank?: number;
  pitchDeckLink?: string;
  overallScore?: number;
  isPeoplesChoice?: boolean;
  // Special Award Flags
  awardProblemFit?: boolean;
  awardTechExecution?: boolean;
  awardInnovationImpact?: boolean;
  awardPresentation?: boolean;
  awardUiux?: boolean;
  awardSustainability?: boolean;
}

export interface ProgrammingWinner {
  id: string;
  name: string;
  school: string;
  pictureUrl: string;
  schoolLogoUrl: string;
  place: 1 | 2 | 3;
  category: "HIGH_SCHOOL" | "COLLEGE";
}

export interface ScoreCriteria {
  mastery?: number;
  innovation?: number;
  impact?: number;
  compliance?: number;
  problemFit?: number;
  techExecution?: number;
  innovationImpact?: number;
  presentation?: number;
  uiux?: number;
  sustainability?: number;
}

export interface JudgingScore {
  id: string;
  entryId: string;
  judgeId: string;
  scores: ScoreCriteria;
  comment: string;
  submissionDate: string;
  adminUploaded: boolean;
  phase: 'STANDARD' | 'FINALS';
}
