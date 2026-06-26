import type { DriveStep } from "driver.js";

// ─── Sidebar navigation steps (per role) ───────────────────────────────────

const SIDEBAR_STEP: DriveStep = {
  element: '[data-tour="sidebar"]',
  popover: {
    title: "Navigation Sidebar",
    description:
      "Use this sidebar to move between all sections of the platform. Click any item to navigate instantly.",
    side: "right",
    align: "start",
  },
};

const NOTIFICATION_STEP: DriveStep = {
  element: '[data-tour="notification-bell"]',
  popover: {
    title: "Notifications",
    description:
      "Real-time alerts for completed interviews, sign-off requests, and system events appear here.",
    side: "bottom",
    align: "end",
  },
};

const CANDIDATE_NAV_STEPS: DriveStep[] = [
  SIDEBAR_STEP,
  {
    element: 'a[href="/candidate/dashboard"]',
    popover: {
      title: "My Interviews",
      description:
        "View all interviews assigned to you — upcoming, active, and completed. Click any card to join or review.",
      side: "right",
    },
  },
  {
    element: 'a[href="/candidate/profile"]',
    popover: {
      title: "Profile",
      description:
        "Keep your personal details up to date. Recruiters see this when reviewing your interviews.",
      side: "right",
    },
  },
  {
    element: 'a[href="/candidate/resume"]',
    popover: {
      title: "Resume",
      description:
        "Upload or update your latest resume. The AI uses it to ask relevant, tailored questions during the interview.",
      side: "right",
    },
  },
  {
    element: 'a[href="/candidate/notifications"]',
    popover: {
      title: "Notifications",
      description:
        "Stay informed about interview invitations, schedule changes, and messages from your recruiting team.",
      side: "right",
    },
  },
  NOTIFICATION_STEP,
];

const RECRUITER_NAV_STEPS: DriveStep[] = [
  SIDEBAR_STEP,
  {
    element: 'a[href="/admin"]',
    popover: {
      title: "Dashboard",
      description:
        "Your command center — live overview of active interviews, pending reviews, and recent activity across your team.",
      side: "right",
    },
  },
  {
    element: 'a[href="/admin/interviews/create"]',
    popover: {
      title: "Create Interview",
      description:
        "Schedule a new AI-led interview. Choose the candidate, role, question bank, duration, and proctoring options.",
      side: "right",
    },
  },
  {
    element: 'a[href="/admin/review"]',
    popover: {
      title: "Review",
      description:
        "Read full transcripts, watch recordings, see AI-scored answers, and give your official sign-off on completed interviews.",
      side: "right",
    },
  },
  {
    element: 'a[href="/admin/candidates"]',
    popover: {
      title: "Candidates",
      description:
        "Browse all candidate profiles, view their interview history, and manage their pipeline status.",
      side: "right",
    },
  },
  {
    element: 'a[href="/admin/clients"]',
    popover: {
      title: "Clients",
      description:
        "Manage the companies and business units you recruit for. Link interviews and candidates to the right client.",
      side: "right",
    },
  },
  {
    element: 'a[href="/admin/calendar"]',
    popover: {
      title: "Calendar",
      description:
        "Day-by-day view of all scheduled interviews. Spot conflicts and plan capacity at a glance.",
      side: "right",
    },
  },
  NOTIFICATION_STEP,
];

const ADMIN_EXTRA_NAV_STEPS: DriveStep[] = [
  {
    element: 'a[href="/admin/settings"]',
    popover: {
      title: "Settings",
      description:
        "Configure branch-level preferences: email templates, proctoring defaults, token quotas, and more.",
      side: "right",
    },
  },
  {
    element: 'a[href="/admin/compliance"]',
    popover: {
      title: "Compliance",
      description:
        "Audit logs, violation reports, and data-retention controls — required for every regulatory review.",
      side: "right",
    },
  },
];

const SUPER_ADMIN_EXTRA_NAV_STEPS: DriveStep[] = [
  {
    element: 'a[href="/admin/staff"]',
    popover: {
      title: "Manage Staff",
      description:
        "Create, deactivate, and assign roles to staff members across all branches.",
      side: "right",
    },
  },
  {
    element: 'a[href="/admin/master-data"]',
    popover: {
      title: "Master Data",
      description:
        "Platform-wide reference data: lookup values, question bank categories, tags, and company records.",
      side: "right",
    },
  },
  {
    element: 'a[href="/admin/questionbank"]',
    popover: {
      title: "Question Bank",
      description:
        "Browse and manage the global pool of interview questions. Every AI-led session draws from this bank.",
      side: "right",
    },
  },
];

export function getSidebarNavSteps(role: string): DriveStep[] {
  switch (role) {
    case "CANDIDATE":
      return CANDIDATE_NAV_STEPS;
    case "RECRUITER":
    case "TESTING_RECRUITER":
      return RECRUITER_NAV_STEPS;
    case "ADMIN":
    case "TESTING_ADMIN":
      return [...RECRUITER_NAV_STEPS, ...ADMIN_EXTRA_NAV_STEPS];
    case "SUPER_ADMIN":
      return [...RECRUITER_NAV_STEPS, ...ADMIN_EXTRA_NAV_STEPS, ...SUPER_ADMIN_EXTRA_NAV_STEPS];
    default:
      return RECRUITER_NAV_STEPS;
  }
}

// ─── Page-specific content steps ───────────────────────────────────────────
// No `element` field → driver.js renders these as a centered floating popover.
// This avoids the zoom/scroll issue that occurs when spotlighting large page areas.

const PAGE_STEPS: Record<string, DriveStep> = {
  "/candidate/dashboard": {
    popover: {
      title: "📋 My Interviews",
      description:
        "This page lists every interview assigned to you. Cards show their status (Scheduled, In Progress, Completed). Click a card to join an active session or review a finished one.",
    },
  },
  "/candidate/profile": {
    popover: {
      title: "👤 Your Profile",
      description:
        "Update your name, contact details, and skills here. Recruiters review this alongside your interview transcript when making decisions.",
    },
  },
  "/candidate/resume": {
    popover: {
      title: "📄 Resume Upload",
      description:
        "Upload a PDF or Word resume. The AI reads your resume before the interview starts and tailors questions to your actual experience.",
    },
  },
  "/candidate/notifications": {
    popover: {
      title: "🔔 Your Notifications",
      description:
        "All messages from your recruiting team appear here — interview invitations, schedule updates, feedback, and system alerts.",
    },
  },
  "/admin": {
    popover: {
      title: "📊 Dashboard",
      description:
        "Live snapshot of your platform — active interviews, recent completions, pending reviews, and team-level metrics. Everything important is surfaced here first.",
    },
  },
  "/admin/interviews/create": {
    popover: {
      title: "➕ Create an Interview",
      description:
        "Fill in the candidate details, select the role and question bank, set the duration, and configure proctoring. The AI will handle the rest once the candidate joins.",
    },
  },
  "/admin/review": {
    popover: {
      title: "✅ Interview Review Queue",
      description:
        "All completed interviews waiting for your review appear here. Click an interview to read the full transcript, see AI scores, check proctoring flags, and sign off.",
    },
  },
  "/admin/candidates": {
    popover: {
      title: "👥 Candidate Management",
      description:
        "Full list of all candidates in the system. Search by name or email, filter by status, view interview history, and jump to a candidate's profile.",
    },
  },
  "/admin/candidates/bulk-import": {
    popover: {
      title: "📥 Bulk Import Candidates",
      description:
        "Upload a spreadsheet (CSV/Excel) to add many candidates at once. Download the template, fill it in, and upload — the system registers all candidates in one go.",
    },
  },
  "/admin/candidates/deployment-bulk-import": {
    popover: {
      title: "📦 Deployment Bulk Import",
      description:
        "Import candidates who are part of a deployment batch. Attach them to a specific client engagement right from the upload.",
    },
  },
  "/admin/clients": {
    popover: {
      title: "🏢 Clients",
      description:
        "All the companies and business units you recruit for. Add a new client, update contact details, or drill into a client to see their active candidate pipeline.",
    },
  },
  "/admin/calendar": {
    popover: {
      title: "📅 Interview Calendar",
      description:
        "Month and week views of every scheduled interview across your team. Use this to spot over-booked slots, reschedule conflicts, and plan capacity.",
    },
  },
  "/admin/settings": {
    popover: {
      title: "⚙️ Platform Settings",
      description:
        "Branch-level configuration: default proctoring rules, email notification templates, token quotas per role, and other operational preferences.",
    },
  },
  "/admin/staff": {
    popover: {
      title: "🛡️ Manage Staff",
      description:
        "Invite new team members, assign them a role (Recruiter, Admin, etc.), and deactivate accounts when needed. Role changes take effect immediately.",
    },
  },
  "/admin/compliance": {
    popover: {
      title: "🔍 Compliance & Audit",
      description:
        "Full audit trail of all platform actions — who created, reviewed, or deleted an interview and when. Export reports for regulatory reviews. Proctoring violation summaries are also here.",
    },
  },
  "/admin/master-data": {
    popover: {
      title: "🗂️ Master Data Overview",
      description:
        "Central hub for all platform-wide reference data. Changes here affect the entire system — use sub-sections for lookup values, QB categories, tags, and companies.",
    },
  },
  "/admin/master-data/lookups": {
    popover: {
      title: "🔤 Lookup Values",
      description:
        "Manage the drop-down options used throughout the platform — skills, departments, experience levels, and more. Kept here so they stay consistent everywhere.",
    },
  },
  "/admin/master-data/categories": {
    popover: {
      title: "📁 QB Categories",
      description:
        "Question bank categories group questions by topic (e.g., Java, System Design, HR). Create and manage categories here so the question bank stays well-organised.",
    },
  },
  "/admin/master-data/tags": {
    popover: {
      title: "🏷️ QB Tags",
      description:
        "Tags are fine-grained labels on individual questions (e.g., 'spring-boot', 'senior', 'coding'). Manage the full tag vocabulary here.",
    },
  },
  "/admin/master-data/companies": {
    popover: {
      title: "🏭 QB Companies",
      description:
        "Company-specific questions are tagged to a company entry here. Useful when a client wants their own custom question set included in every interview.",
    },
  },
  "/admin/questionbank": {
    popover: {
      title: "🗄️ Question Bank",
      description:
        "The global pool of interview questions. Browse by category or tag, preview questions, and manage what the AI draws from when conducting interviews.",
    },
  },
  "/admin/questionbank/questions": {
    popover: {
      title: "❓ Questions",
      description:
        "Add, edit, or remove individual interview questions. Set difficulty, category, tags, expected answer guidance, and whether the question requires a code editor.",
    },
  },
  "/admin/questionbank/categories": {
    popover: {
      title: "📁 Question Bank Categories",
      description:
        "Organise questions into broad topic groups. Categories are selected when creating an interview to pull a relevant subset of questions.",
    },
  },
  "/admin/questionbank/tags": {
    popover: {
      title: "🏷️ Question Bank Tags",
      description:
        "Fine-grained labels on questions. When creating an interview you can filter by tags to include only questions matching the role requirements.",
    },
  },
  "/admin/questionbank/manage": {
    popover: {
      title: "🔧 Manage Question Bank",
      description:
        "Bulk operations on the question bank — import questions from a spreadsheet, reorder, or archive batches of questions at once.",
    },
  },
  "/admin/questionbank/sessions": {
    popover: {
      title: "📈 QB Sessions",
      description:
        "Review how questions performed across interviews — which ones candidates struggled with, which got high AI scores, and which need updating.",
    },
  },
  "/admin/questionbank/emails": {
    popover: {
      title: "✉️ Email Templates",
      description:
        "Customise the email content sent to candidates at different stages — invitation, reminder, completion, and result emails.",
    },
  },
  "/admin/questionbank/users": {
    popover: {
      title: "👤 Question Bank Users",
      description:
        "Manage who has access to contribute to or edit the question bank. Control permissions at the individual staff member level.",
    },
  },
  "/admin/recruiter-bot": {
    popover: {
      title: "🤖 JD Assistant",
      description:
        "AI-powered Job Description assistant. Paste or type a JD and the assistant will suggest matching questions from the question bank and recommend interview configurations.",
    },
  },
};

export function getPageContentStep(pathname: string): DriveStep | null {
  if (PAGE_STEPS[pathname]) return PAGE_STEPS[pathname];

  if (/^\/admin\/interviews\/[^/]+\/review/.test(pathname)) {
    return {
      popover: {
        title: "🎯 Interview Review",
        description:
          "Detailed view of a single interview — full transcript, per-question AI scores, proctoring violation timeline, and the sign-off controls.",
      },
    };
  }
  if (/^\/admin\/interviews\/[^/]+\/edit/.test(pathname)) {
    return {
      popover: {
        title: "✏️ Edit Interview",
        description:
          "Update the interview configuration before the candidate joins — reschedule, swap the question bank, or adjust proctoring settings.",
      },
    };
  }
  if (/^\/admin\/candidates\/[^/]+\/matches/.test(pathname)) {
    return {
      popover: {
        title: "🎯 Candidate Matches",
        description:
          "AI-ranked job matches for this candidate based on interview performance, skills, and resume. Use this to fast-track candidates to the right roles.",
      },
    };
  }

  return null;
}

export function getTourSteps(role: string, pathname: string): DriveStep[] {
  const navSteps = getSidebarNavSteps(role);
  const pageStep = getPageContentStep(pathname);
  return pageStep ? [...navSteps, pageStep] : navSteps;
}
