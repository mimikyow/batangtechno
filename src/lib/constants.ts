
import { Challenge } from "./types";

export const CHALLENGES: Challenge[] = [
  "SMART MOBILITY AND TRANSPORTATION",
  "DIGITAL LITERACY AND COMBATING DISINFORMATION",
  "TRANSPARENCY, ACCOUNTABILITY, AND GOOD GOVERNANCE",
  "EMPLOYMENT AND ECONOMIC OPPORTUNITIES",
  "HEALTHCARE ACCESS FOR RURAL AND REMOTE COMMUNITIES",
  "SUSTAINABLE AGRICULTURE"
];

export const MOCK_ENTRIES: any[] = [
  {
    id: "1",
    teamName: "Galactic Coders",
    school: "Techno University",
    members: [{id: '1', name: 'Alice'}, {id: '2', name: 'Bob'}, {id: '3', name: 'Charlie'}],
    videoLink: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    thumbnailUrl: "https://picsum.photos/seed/smart/800/600",
    description: "A revolutionary way to manage space debris using AI-driven orbital mechanics.",
    challenge: "SMART MOBILITY AND TRANSPORTATION",
    rank: 1,
  },
  {
    id: "2",
    teamName: "Nebula Innovators",
    school: "State College of Arts",
    members: [{id: '4', name: 'David'}, {id: '5', name: 'Eve'}, {id: '6', name: 'Frank'}],
    videoLink: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    thumbnailUrl: "https://picsum.photos/seed/health/800/600",
    description: "Decentralized health records for remote communities using secure blockchain protocols.",
    challenge: "HEALTHCARE ACCESS FOR RURAL AND REMOTE COMMUNITIES",
    rank: 2,
  },
  {
    id: "3",
    teamName: "Star Growers",
    school: "Agri Tech Institute",
    members: [{id: '7', name: 'Grace'}, {id: '8', name: 'Heidi'}, {id: '9', name: 'Ivan'}],
    videoLink: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    thumbnailUrl: "https://picsum.photos/seed/farm/800/600",
    description: "Smart irrigation systems that use satellite data to optimize water usage in arid zones.",
    challenge: "SUSTAINABLE AGRICULTURE",
    rank: 3,
  },
  {
    id: "4",
    teamName: "Truth Seeker",
    school: "Digital Academy",
    members: [{id: '10', name: 'John'}, {id: '11', name: 'Kelly'}, {id: '12', name: 'Liam'}],
    videoLink: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    thumbnailUrl: "https://picsum.photos/seed/disinfo/800/600",
    description: "AI browser extension that detects disinformation in real-time.",
    challenge: "DIGITAL LITERACY AND COMBATING DISINFORMATION",
  }
];
