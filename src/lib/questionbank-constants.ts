export const QB_ROUNDS = ["L1", "L2", "L3", "L4", "HR"] as const;
export const QB_IMPORTANCE = ["CRITICAL", "HIGH", "MODERATE", "LOW"] as const;
export const QB_INTERVIEW_TYPES = ["backend", "frontend", "fullstack"] as const;

export type QBRound = (typeof QB_ROUNDS)[number];
export type QBImportance = (typeof QB_IMPORTANCE)[number];
export type QBInterviewType = (typeof QB_INTERVIEW_TYPES)[number];

export const ROUND_COLORS: Record<string, string> = {
  L1: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  L2: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  L3: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  L4: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  HR: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
};

export const IMPORTANCE_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  MODERATE: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  LOW: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

export const INTERVIEW_TYPE_COLORS: Record<string, string> = {
  backend: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  frontend: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  shared: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export const RELEVANCY_OPTIONS = [
  { value: "NONE", label: "None" },
  { value: "CRITICAL", label: "Critical" },
  { value: "HIGH", label: "High" },
  { value: "MODERATE", label: "Moderate" },
  { value: "LOW", label: "Low" },
] as const;
