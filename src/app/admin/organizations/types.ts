export type OrgType = "DEMO" | "LIVE";
export type OrgStatus = "ACTIVE" | "SUSPENDED";

export type OrgRow = {
  id: string;
  name: string;
  code: string;
  type: OrgType;
  status: OrgStatus;
  maxInterviews: number | null;
  maxCandidates: number | null;
  maxClients: number | null;
  createdAt: string;
  adminEmail?: string;
};

export type CreateOrgPayload = {
  name: string;
  code: string;
  type: OrgType;
  maxInterviews: number;
  maxCandidates: number;
  maxClients: number;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
};

export type UpdateOrgPayload = Partial<{
  name: string;
  type: OrgType;
  status: OrgStatus;
  maxInterviews: number;
  maxCandidates: number;
  maxClients: number;
}>;

/** Mirrors FeatureKey in auth-service (com.benchreadiness.auth.feature.FeatureKey). */
export const FEATURE_DEFS = [
  { key: "INTERVIEWS", label: "Interviews", description: "Create and run AI interviews" },
  { key: "REVIEW", label: "Review", description: "Review completed interview transcripts and scores" },
  { key: "SCREENING", label: "Screening Pipeline", description: "3-round candidate screening with AI evaluation" },
  { key: "CANDIDATES", label: "Candidates", description: "Candidate directory and profile management" },
  { key: "BULK_IMPORT", label: "Bulk Import", description: "Excel bulk import of candidates" },
  { key: "DEPLOYMENT_IMPORT", label: "Deployment Import", description: "Bulk deployment/placement import" },
  { key: "CLIENTS", label: "Clients", description: "Client directory and job requisitions" },
  { key: "RECRUITER_BOT", label: "JD Assistant", description: "AI assistant for job description drafting" },
  { key: "CALENDAR", label: "Calendar", description: "Interview scheduling calendar" },
  { key: "COMPLIANCE", label: "Compliance", description: "Compliance and audit views" },
  { key: "MASTER_DATA", label: "Master Data", description: "Lookup values, QB categories, tags, companies" },
  { key: "QUESTION_BANK", label: "Question Bank", description: "Question bank management" },
  { key: "ANALYTICS", label: "Analytics", description: "Usage and performance analytics" },
] as const;

export type FeatureKey = (typeof FEATURE_DEFS)[number]["key"];

export type OrgFeatureStates = Record<FeatureKey, boolean>;
