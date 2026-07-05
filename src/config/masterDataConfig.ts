export type LookupCategoryKey =
  | "SKILL_SET"
  | "CANDIDATE_STATUS"
  | "CANDIDATE_SOURCE"
  | "CANDIDATE_RATING"
  | "ADMIN_SOURCE"
  | "INTERVIEW_ROUND"
  | "QUESTION_TYPE"
  | "DIFFICULTY"
  | "CATEGORY_INTERVIEW_TYPE"
  | "POSITION_SOURCE"
  | "BRANCH";

export const LOOKUP_CATEGORIES: { key: LookupCategoryKey; label: string; description: string }[] = [
  { key: "SKILL_SET", label: "Skill Sets", description: "Candidate and client skill tracks" },
  { key: "CANDIDATE_STATUS", label: "Candidate Statuses", description: "Pipeline stages (RFD, WFD, etc.)" },
  { key: "CANDIDATE_SOURCE", label: "Candidate Sources", description: "B2B, Bench, Market" },
  { key: "CANDIDATE_RATING", label: "Candidate Ratings", description: "Asset, Medium, Liability" },
  { key: "ADMIN_SOURCE", label: "Admin Sources", description: "Bench, BD, Recruitment admin types" },
  { key: "INTERVIEW_ROUND", label: "Interview Rounds", description: "L1, L2, Screening, HR, etc." },
  { key: "QUESTION_TYPE", label: "Question Types", description: "Technical, Behavioral, Coding" },
  { key: "DIFFICULTY", label: "Difficulty Levels", description: "Easy, Medium, Hard" },
  { key: "CATEGORY_INTERVIEW_TYPE", label: "Category Types", description: "Backend, Frontend, Shared" },
  { key: "POSITION_SOURCE", label: "Position Sources", description: "Bench/B2B vs Market requirements" },
  { key: "BRANCH", label: "Branches", description: "Data segregation branches assignable to staff accounts (e.g. Development, Testing)" },
];
