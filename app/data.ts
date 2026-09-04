export type ClubStatus = "ready" | "reengage" | "contacts" | "activating" | "activated" | "dormant";
export type PayoutStatus = "none" | "partial" | "full";

export type ClubRecord = {
  id: string;
  name: string;
  status: ClubStatus;
  contactName: string;
  contactEmail: string;
  contactIg: string;
  activeMembership: number | null;
  ligoMembers: number | null;
  activationStarted: boolean;
  activationCompleted: boolean;
  eventDistributionStarted: boolean;
  payout: PayoutStatus;
  nextAction: string;
  notes: string;
};

export type TaskItem = {
  id: string;
  label: string;
  owner?: string;
};

export type TaskLane = {
  id: string;
  title: string;
  subtitle: string;
  /** Hard deadline = kickoff + these hours (frozen clock). */
  dueHours: number;
  /** Optional earlier soft checkpoint within the same lane. */
  softHours?: number;
  tasks: TaskItem[];
};

export type TaskProgress = {
  done: boolean;
  completedAt: string | null;
  notes: string;
};

export const EXISTING_DEADLINE = "2026-09-11";
export const PILOT_TOTAL = 1500;
export const EXISTING_POOL = 1050;
export const NET_NEW_RESERVE = 450;
export const PAYOUT_80 = 50;
export const PAYOUT_100 = 75;

export const INITIAL_CLUBS: ClubRecord[] = [
  { id: "aasa", name: "AASA", status: "ready", contactName: "", contactEmail: "", contactIg: "", activeMembership: null, ligoMembers: null, activationStarted: false, activationCompleted: false, eventDistributionStarted: false, payout: "none", nextAction: "Send membership-activation offer", notes: "" },
  { id: "aepi", name: "AEPi", status: "ready", contactName: "", contactEmail: "", contactIg: "", activeMembership: null, ligoMembers: null, activationStarted: false, activationCompleted: false, eventDistributionStarted: false, payout: "none", nextAction: "Send membership-activation offer", notes: "" },
  { id: "guzaarish", name: "Guzaarish", status: "ready", contactName: "", contactEmail: "", contactIg: "", activeMembership: null, ligoMembers: null, activationStarted: false, activationCompleted: false, eventDistributionStarted: false, payout: "none", nextAction: "Send membership-activation offer", notes: "" },
  { id: "lasa", name: "LASA", status: "ready", contactName: "", contactEmail: "", contactIg: "", activeMembership: null, ligoMembers: null, activationStarted: false, activationCompleted: false, eventDistributionStarted: false, payout: "none", nextAction: "Send membership-activation offer", notes: "" },
  { id: "sas", name: "South Asian Society", status: "ready", contactName: "", contactEmail: "", contactIg: "", activeMembership: null, ligoMembers: null, activationStarted: false, activationCompleted: false, eventDistributionStarted: false, payout: "none", nextAction: "Send membership-activation offer", notes: "" },
  { id: "sae", name: "SAE", status: "reengage", contactName: "", contactEmail: "", contactIg: "", activeMembership: null, ligoMembers: null, activationStarted: false, activationCompleted: false, eventDistributionStarted: false, payout: "none", nextAction: "Re-establish relationship, then activate", notes: "" },
  { id: "prospect", name: "Prospect Records", status: "reengage", contactName: "", contactEmail: "", contactIg: "", activeMembership: null, ligoMembers: null, activationStarted: false, activationCompleted: false, eventDistributionStarted: false, payout: "none", nextAction: "Re-establish relationship, then activate", notes: "" },
  { id: "rangila", name: "Georgetown Rangila", status: "contacts", contactName: "", contactEmail: "", contactIg: "", activeMembership: null, ligoMembers: null, activationStarted: false, activationCompleted: false, eventDistributionStarted: false, payout: "none", nextAction: "Pull current contact + relationship context", notes: "" },
  { id: "sam", name: "SAM", status: "contacts", contactName: "", contactEmail: "", contactIg: "", activeMembership: null, ligoMembers: null, activationStarted: false, activationCompleted: false, eventDistributionStarted: false, payout: "none", nextAction: "Pull current contact + relationship context", notes: "" },
  { id: "ggc", name: "Georgetown Global Consulting", status: "contacts", contactName: "", contactEmail: "", contactIg: "", activeMembership: null, ligoMembers: null, activationStarted: false, activationCompleted: false, eventDistributionStarted: false, payout: "none", nextAction: "Pull current contact + relationship context", notes: "" },
  { id: "lecture", name: "Georgetown University Lecture Fund", status: "contacts", contactName: "", contactEmail: "", contactIg: "", activeMembership: null, ligoMembers: null, activationStarted: false, activationCompleted: false, eventDistributionStarted: false, payout: "none", nextAction: "Pull current contact + relationship context", notes: "" },
  { id: "wfi", name: "Washington Forum on India", status: "contacts", contactName: "", contactEmail: "", contactIg: "", activeMembership: null, ligoMembers: null, activationStarted: false, activationCompleted: false, eventDistributionStarted: false, payout: "none", nextAction: "Pull current contact + relationship context", notes: "" },
  { id: "kapi", name: "KAPI", status: "contacts", contactName: "", contactEmail: "", contactIg: "", activeMembership: null, ligoMembers: null, activationStarted: false, activationCompleted: false, eventDistributionStarted: false, payout: "none", nextAction: "Pull current contact + relationship context", notes: "" },
  { id: "voice", name: "The Georgetown Voice", status: "contacts", contactName: "", contactEmail: "", contactIg: "", activeMembership: null, ligoMembers: null, activationStarted: false, activationCompleted: false, eventDistributionStarted: false, payout: "none", nextAction: "Pull current contact + relationship context", notes: "" },
];

export const TASK_LANES: TaskLane[] = [
  {
    id: "24h",
    title: "Next 24 hours",
    subtitle: "Lock economics, pull contacts, fire the ready five",
    dueHours: 24,
    tasks: [
      { id: "t24-1", label: "Pull contacts + relationship history for the 7 clubs missing from the working list", owner: "Micah" },
      { id: "t24-2", label: "Confirm active-membership counts and current Ligo member counts for all 14 partners", owner: "TJ" },
      { id: "t24-3", label: "Lock V1 economics: $1,050 existing pool + $450 net-new reserve = $1,500", owner: "Micah" },
      { id: "t24-4", label: "Send membership-activation offer to the 5 ready clubs (deadline Sept 11)", owner: "TJ" },
      { id: "t24-5", label: "Re-engage SAE + Prospect Records first", owner: "TJ" },
      { id: "t24-6", label: "Build full relevant Georgetown club list (directories, CampusGroups/CAB, sports, IG)", owner: "TJ" },
      { id: "t24-7", label: "Launch net-new outbound with cold email + follow-up sequence", owner: "TJ" },
      { id: "t24-8", label: "Create Ligo event CTA kit (PNG/SVG, link/QR, caption copy, Story guidance)", owner: "Mekhi" },
      { id: "t24-9", label: "Start first social-acquisition creative batch (recruit, value, funding, proof, in-action)", owner: "Mekhi" },
    ],
  },
  {
    id: "72h",
    title: "Next 48–72 hours",
    subtitle: "Broad outbound + social inbound into the same activation system",
    softHours: 48,
    dueHours: 72,
    tasks: [
      { id: "t72-1", label: "Launch broad net-new outbound across the full club list (no pre-tiering)", owner: "TJ" },
      { id: "t72-2", label: "Launch first club-acquisition Instagram post/Story sequence", owner: "Mekhi" },
      { id: "t72-3", label: "Create permanent For Clubs Highlight", owner: "Mekhi" },
      { id: "t72-4", label: "Move every yes into Founding Partner Club activation (7-day window for later clubs)", owner: "TJ" },
      { id: "t72-5", label: "Send progress updates to existing clubs approaching Sept 11", owner: "TJ" },
      { id: "t72-6", label: "Begin recurring event-distribution with any club mid/post activation", owner: "TJ" },
    ],
  },
  {
    id: "30d",
    title: "Next 7–30 days",
    subtitle: "Run the motion, measure what sticks, only redesign with evidence",
    softHours: 24 * 7,
    dueHours: 24 * 30,
    tasks: [
      { id: "t30-1", label: "Keep outbound cadence; move non-responsive clubs to dormant", owner: "TJ" },
      { id: "t30-2", label: "Continue social proof + club/event spotlights", owner: "Mekhi" },
      { id: "t30-3", label: "Measure which clubs mobilize members and repeatedly route event traffic", owner: "TJ" },
      { id: "t30-4", label: "Track $1,500 pilot spend against activation + net-new conversion", owner: "TJ" },
      { id: "t30-5", label: "Review V1 data and change the motion only when evidence gives a reason", owner: "TJ" },
    ],
  },
];

export const STATUS_LABEL: Record<ClubStatus, string> = {
  ready: "Ready",
  reengage: "Re-engage",
  contacts: "Need contact",
  activating: "Activating",
  activated: "Activated",
  dormant: "Dormant",
};

export function threshold80(active: number | null) {
  if (active == null || active <= 0) return null;
  return Math.ceil(active * 0.8);
}

export function activationEmail(club: ClubRecord, deadlineLabel: string) {
  const name = club.contactName || "[Name]";
  const x = club.ligoMembers ?? "[X]";
  return `Subject: Quick Ligo update for ${club.name}

Hey ${name}, quick update as we lock in our Georgetown rollout. We'd love to get the rest of ${club.name}'s active members onto Ligo by ${deadlineLabel}.

You currently have ${x} members on Ligo. Could you send the signup link in your member GroupMe/email and help us get the rest of the active membership onboarded by then?

If ${club.name} reaches 80% of active membership by ${deadlineLabel}, Ligo will contribute $${PAYOUT_80}. If you reach 100%, Ligo will contribute $${PAYOUT_100} total.

Signup link: [LINK]

Thanks,
TJ`;
}

export function coldEmail(clubName: string, contactName = "[Name]") {
  return `Subject: Ligo x ${clubName}

Hey ${contactName},

I'm TJ with Ligo. We're building one place for Georgetown students to see what's happening across campus, and we're working directly with student organizations as we roll it out.

We'd love to bring ${clubName} onto Ligo and help get your events in front of more Georgetown students.

We're also putting some funding behind early partner clubs that help us build out the network at Georgetown.

Would you have 10 minutes this week to chat?

Thanks,
TJ`;
}
