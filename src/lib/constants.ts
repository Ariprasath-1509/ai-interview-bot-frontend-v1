export const INTERVIEW_MODES = [
  { 
    value: 'SCREENING', 
    label: 'Screening', 
    defaultDuration: 15, 
    description: 'Initial filter - 5 questions',
    questions: 5,
    difficulty: 'Easy'
  },
  { 
    value: 'L1', 
    label: 'L1 - Fundamentals', 
    defaultDuration: 20, 
    description: 'First technical round - 7 questions',
    questions: 7,
    difficulty: 'Easy-Medium'
  },
  { 
    value: 'L2', 
    label: 'L2 - Applied Knowledge', 
    defaultDuration: 25, 
    description: 'Second technical round - 8 questions',
    questions: 8,
    difficulty: 'Medium'
  },
  { 
    value: 'L3', 
    label: 'L3 - Senior Level', 
    defaultDuration: 30, 
    description: 'Senior/deep technical - 10 questions',
    questions: 10,
    difficulty: 'Medium-Hard'
  },
  { 
    value: 'L4', 
    label: 'L4 - Staff/Principal', 
    defaultDuration: 30, 
    description: 'Leadership + depth - 10 questions',
    questions: 10,
    difficulty: 'Hard'
  }
];

export const DURATION_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 20, label: '20 minutes' },
  { value: 25, label: '25 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '60 minutes' },
  { value: 90, label: '90 minutes' },
  { value: 120, label: '2 hours' }
];

export const MODE_COLORS = {
  SCREENING: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200',
  L1: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  L2: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  L3: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  L4: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
};

export const STATUS_COLORS = {
  SCHEDULED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  COMPLETED: 'bg-green-100 text-green-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  SIGNED_OFF: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
};

/** Dedicated time budget for each coding question (main interview timer pauses during this). */
export const CODING_SLOT_MINUTES = 15;

export const VERDICT_COLORS = {
  READY: 'bg-green-100 text-green-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  NEEDS_1_WEEK_PREP: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  NEEDS_RESKILLING: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  MISMATCH_WITH_JD: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  WITHDRAWN: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300'
};
