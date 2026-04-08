
import { Challenge } from "./types";

export const CHALLENGES: Challenge[] = [
  "SMART MOBILITY AND TRANSPORTATION",
  "DIGITAL LITERACY AND COMBATING DISINFORMATION",
  "TRANSPARENCY, ACCOUNTABILITY, AND GOOD GOVERNANCE",
  "EMPLOYMENT AND ECONOMIC OPPORTUNITIES",
  "HEALTHCARE ACCESS FOR RURAL AND REMOTE COMMUNITIES",
  "SUSTAINABLE AGRICULTURE"
];

export const STANDARD_CRITERIA = [
  { 
    key: "mastery", 
    label: "Mastery and Use of Software Concepts", 
    weight: "30%", 
    max: 30, 
    desc: "Evaluates how effectively the team applies relevant concepts, techniques, and technologies to develop a functional and well-designed solution." 
  },
  { 
    key: "innovation", 
    label: "Novelty and Innovation", 
    weight: "30%", 
    max: 30, 
    desc: "Assesses the originality of the project and the creativity behind its concept and implementation." 
  },
  { 
    key: "impact", 
    label: "Real-world Impact and Viability", 
    weight: "30%", 
    max: 30, 
    desc: "Measures how relevant the project is to real-world problems and its potential for practical deployment." 
  },
  { 
    key: "compliance", 
    label: "Compliance to Rules and Restrictions", 
    weight: "10%", 
    max: 10, 
    desc: "Determines the extent to which the project follows all competition guidelines, technical constraints, and ethical standards." 
  },
];

export const FINALS_CRITERIA = [
  { 
    key: "problemFit", 
    label: "Problem & Solution Fit", 
    weight: "30%", 
    max: 30, 
    desc: "Evaluates how well the team defines and understands the problem, including its relevance and target users, and how effectively their proposed solution addresses the identified needs in a clear and logical manner." 
  },
  { 
    key: "techExecution", 
    label: "Product & Technical Execution", 
    weight: "25%", 
    max: 25, 
    desc: "Assesses the overall quality of the product, including its functionality and usability, as well as the appropriateness and soundness of the technologies and methods used in its development." 
  },
  { 
    key: "innovationImpact", 
    label: "Innovation & Impact", 
    weight: "25%", 
    max: 25, 
    desc: "Measures the originality and creativity of the idea, along with its potential to generate meaningful real-world impact, including its feasibility, scalability, and value to its intended users or community." 
  },
  { 
    key: "presentation", 
    label: "Presentation & Delivery", 
    weight: "20%", 
    max: 20, 
    desc: "Judges the team’s ability to clearly and effectively communicate their idea within the given time, including the organization of the pitch, quality of visuals, confidence in delivery, and responsiveness during the Q&A session." 
  },
  {
    key: "uiux",
    label: "Best UI/UX Design Award",
    weight: "Special",
    max: 100,
    desc: "Evaluates the aesthetics, user interface, and user experience of the project."
  },
  {
    key: "sustainability",
    label: "Best Tech for Sustainability Award",
    weight: "Special",
    max: 100,
    desc: "Assesses the project's contribution to environmental or long-term sustainability through technology."
  }
];
