"use client";

import { useEffect, useMemo, useState } from "react";
import "./clubs.css";
import {
  INITIAL_CLUBS,
  TASK_LANES,
  EXISTING_DEADLINE,
  PILOT_TOTAL,
  EXISTING_POOL,
  NET_NEW_RESERVE,
  PAYOUT_80,
  PAYOUT_100,
  STATUS_LABEL,
  activationEmail,
  coldEmail,
  threshold80,
  type ClubRecord,
  type ClubStatus,
  type PayoutStatus,
  type TaskProgress,
  type TaskLane,
} from "./data";

const STORAGE_KEY = "ligo:founding-partner-clubs:v2";
const LEGACY_STORAGE_KEY = "ligo:founding-partner-clubs:v1";

type Persisted = {
  kickoffAt: string;
  tasks: Record<string, TaskProgress>;
  clubs: ClubRecord[];
};

type Tab = "today" | "clubs" | "playbook";

const EMPTY_TASK: TaskProgress = { done: false, completedAt: null, notes: "" };

function daysUntil(dateIso: string) {
  const target = new Date(`${dateIso}T23:59:59`);
  const now = new Date();
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function mergeClubs(saved?: ClubRecord[]) {
  if (!saved?.length) return INITIAL_CLUBS;
  const byId = new Map(saved.map((c) => [c.id, c]));
  return INITIAL_CLUBS.map((base) => ({ ...base, ...byId.get(base.id) }));
}

function formatDeadline(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function spendFromClubs(clubs: ClubRecord[]) {
  return clubs.reduce((sum, c) => {
    if (c.payout === "full") return sum + PAYOUT_100;
    if (c.payout === "partial") return sum + PAYOUT_80;
    return sum;
  }, 0);
}

function addHours(iso: string, hours: number) {
  return new Date(new Date(iso).getTime() + hours * 60 * 60 * 1000);
}

function formatStamp(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCountdown(ms: number) {
  const abs = Math.abs(ms);
  const totalMin = Math.floor(abs / 60000);
  const days = Math.floor(totalMin / (60 * 24));
  const hours = Math.floor((totalMin % (60 * 24)) / 60);
  const mins = totalMin % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function migrateTasks(raw: unknown): Record<string, TaskProgress> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, TaskProgress> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "boolean") {
      out[id] = { done: value, completedAt: value ? new Date().toISOString() : null, notes: "" };
      continue;
    }
    if (value && typeof value === "object") {
      const v = value as Partial<TaskProgress>;
      out[id] = {
        done: !!v.done,
        completedAt: v.completedAt ?? null,
        notes: typeof v.notes === "string" ? v.notes : "",
      };
    }
  }
  return out;
}

function laneTiming(lane: TaskLane, kickoffAt: string, nowMs: number) {
  const dueAt = addHours(kickoffAt, lane.dueHours);
  const softAt = lane.softHours != null ? addHours(kickoffAt, lane.softHours) : null;
  const dueMs = dueAt.getTime() - nowMs;
  const overdue = dueMs < 0;
  return { dueAt, softAt, dueMs, overdue };
}

function taskTiming(progress: TaskProgress, dueAt: Date) {
  if (!progress.done || !progress.completedAt) return null;
  const completed = new Date(progress.completedAt);
  const late = completed.getTime() > dueAt.getTime();
  return { completed, late };
}

export default function ClubsPlaybookPage() {
  const [tab, setTab] = useState<Tab>("today");
  const [hydrated, setHydrated] = useState(false);
  const [kickoffAt, setKickoffAt] = useState(() => new Date().toISOString());
  const [tasks, setTasks] = useState<Record<string, TaskProgress>>({});
  const [clubs, setClubs] = useState<ClubRecord[]>(INITIAL_CLUBS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClubStatus | "all">("all");
  const [copied, setCopied] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Persisted> & { tasks?: unknown };
        const nextKickoff = parsed.kickoffAt || new Date().toISOString();
        setKickoffAt(nextKickoff);
        setTasks(migrateTasks(parsed.tasks));
        setClubs(mergeClubs(parsed.clubs));
      } else {
        setKickoffAt(new Date().toISOString());
      }
    } catch {
      setKickoffAt(new Date().toISOString());
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const payload: Persisted = { kickoffAt, tasks, clubs };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [hydrated, kickoffAt, tasks, clubs]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const selected = clubs.find((c) => c.id === selectedId) || null;
  const remaining = daysUntil(EXISTING_DEADLINE);
  const spent = spendFromClubs(clubs);
  const deadlineLabel = formatDeadline(EXISTING_DEADLINE);

  const stats = useMemo(() => {
    const ready = clubs.filter((c) => c.status === "ready").length;
    const contacts = clubs.filter((c) => c.status === "contacts").length;
    const activating = clubs.filter((c) => c.status === "activating" || c.activationStarted).length;
    const activated = clubs.filter((c) => c.status === "activated" || c.activationCompleted).length;
    return { ready, contacts, activating, activated };
  }, [clubs]);

  const filteredClubs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clubs.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.contactName.toLowerCase().includes(q) ||
        c.nextAction.toLowerCase().includes(q)
      );
    });
  }, [clubs, query, statusFilter]);

  function getTask(id: string): TaskProgress {
    return tasks[id] || EMPTY_TASK;
  }

  function toggleTask(id: string) {
    setTasks((prev) => {
      const current = prev[id] || EMPTY_TASK;
      const nextDone = !current.done;
      return {
        ...prev,
        [id]: {
          ...current,
          done: nextDone,
          completedAt: nextDone ? new Date().toISOString() : null,
        },
      };
    });
  }

  function updateTaskNotes(id: string, notes: string) {
    setTasks((prev) => {
      const current = prev[id] || EMPTY_TASK;
      return { ...prev, [id]: { ...current, notes } };
    });
  }

  function updateClub(id: string, patch: Partial<ClubRecord>) {
    setClubs((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  }

  return (
    <div className="clubs-shell">
      <header className="clubs-top">
        <div className="clubs-top-inner">
          <div className="clubs-brand">
            <div className="clubs-mark">L</div>
            <div>
              <strong>Founding Partner Clubs</strong>
              <span>Georgetown V1 · live ops board</span>
            </div>
          </div>
          <nav className="clubs-nav" aria-label="Sections">
            <button type="button" aria-current={tab === "today" ? "page" : undefined} onClick={() => setTab("today")}>
              Today
            </button>
            <button type="button" aria-current={tab === "clubs" ? "page" : undefined} onClick={() => setTab("clubs")}>
              Club tracker
            </button>
            <button type="button" aria-current={tab === "playbook" ? "page" : undefined} onClick={() => setTab("playbook")}>
              Playbook
            </button>
          </nav>
        </div>
      </header>

      <main className="clubs-main">
        <section className="clubs-hero">
          <div className="clubs-panel hero">
            <div className="clubs-kicker">Operating goal</div>
            <h1>Activate clubs. Route events. Prove distribution.</h1>
            <p>
              Build the first cohort of active Georgetown Founding Partner Clubs and use the $1,500 pilot pool to prove
              membership activation + recurring event distribution.
            </p>
            <div className="clubs-model">
              Find → close → activate 80–100% → route public events through Ligo → measure → repeat
            </div>
          </div>

          <div className="clubs-panel clubs-budget-grid">
            <div>
              <div className="clubs-kicker">Pilot pool</div>
              <div className="clubs-budget-big">${PILOT_TOTAL.toLocaleString()}</div>
            </div>
            <div className="clubs-budget-split">
              <div className="clubs-mini">
                <b>${EXISTING_POOL.toLocaleString()}</b>
                <span>Existing max (14 × $75)</span>
              </div>
              <div className="clubs-mini">
                <b>${NET_NEW_RESERVE}</b>
                <span>Net-new reserve</span>
              </div>
            </div>
            <div className="clubs-mini">
              <b>${spent}</b>
              <span>Committed from tracker payouts · ${EXISTING_POOL - spent} left in existing pool</span>
            </div>
            <div className="clubs-deadline">
              <span>Existing clubs deadline · {deadlineLabel}</span>
              <strong>
                {remaining > 1 ? `${remaining} days left` : remaining === 1 ? "1 day left" : remaining === 0 ? "Due today" : "Past due"}
              </strong>
            </div>
          </div>
        </section>

        <section className="clubs-stats" aria-label="Partner base snapshot">
          <div className="clubs-stat">
            <b>14</b>
            <span>Partners total</span>
          </div>
          <div className="clubs-stat">
            <b>{stats.ready}</b>
            <span>Ready now</span>
          </div>
          <div className="clubs-stat">
            <b>{stats.contacts}</b>
            <span>Contacts to pull</span>
          </div>
          <div className="clubs-stat">
            <b>{stats.activated}</b>
            <span>Activated</span>
          </div>
        </section>

        {tab === "today" && (
          <section>
            <div className="clubs-section-head">
              <div>
                <h2>Live task boards</h2>
                <p>
                  Clocks froze at kickoff · {formatStamp(kickoffAt)}. Check off, add notes — done stamps + on-time /
                  overdue stick.
                </p>
              </div>
            </div>
            <div className="clubs-lanes">
              {TASK_LANES.map((lane) => {
                const progressList = lane.tasks.map((t) => getTask(t.id));
                const doneCount = progressList.filter((t) => t.done).length;
                const allDone = doneCount === lane.tasks.length;
                const { dueAt, softAt, dueMs, overdue } = laneTiming(lane, kickoffAt, nowMs);
                const laneLateCompletes = lane.tasks.some((t) => {
                  const timing = taskTiming(getTask(t.id), dueAt);
                  return timing?.late;
                });
                const statusClass = allDone
                  ? laneLateCompletes
                    ? "late"
                    : "ontime"
                  : overdue
                    ? "overdue"
                    : "open";
                const statusLabel = allDone
                  ? laneLateCompletes
                    ? "Done · some late"
                    : "Done on time"
                  : overdue
                    ? `Overdue · ${formatCountdown(dueMs)}`
                    : `${formatCountdown(dueMs)} left`;

                return (
                  <div className={`clubs-lane${overdue && !allDone ? " lane-overdue" : ""}`} key={lane.id}>
                    <div className="clubs-lane-top">
                      <div>
                        <h3>{lane.title}</h3>
                        <p className="sub">{lane.subtitle}</p>
                      </div>
                      <span className="clubs-progress-pill">
                        {doneCount}/{lane.tasks.length}
                      </span>
                    </div>

                    <div className={`clubs-lane-clock ${statusClass}`}>
                      <div>
                        <strong>Due {formatStamp(dueAt)}</strong>
                        {softAt ? <span>Soft checkpoint {formatStamp(softAt)}</span> : null}
                      </div>
                      <em>{statusLabel}</em>
                    </div>

                    {lane.tasks.map((task, index) => {
                      const progress = getTask(task.id);
                      const timing = taskTiming(progress, dueAt);
                      const expanded = expandedTaskId === task.id;
                      const notePreview = progress.notes.trim();
                      return (
                        <div
                          key={task.id}
                          className={`clubs-task-card${progress.done ? " done" : ""}${timing?.late ? " late" : ""}${expanded ? " open" : ""}`}
                        >
                          <div className="clubs-task-row">
                            <button
                              type="button"
                              className="clubs-task-checkbtn"
                              onClick={() => toggleTask(task.id)}
                              aria-pressed={progress.done}
                              aria-label={progress.done ? "Mark incomplete" : "Mark done"}
                            >
                              <span className="clubs-check" aria-hidden>
                                ✓
                              </span>
                            </button>
                            <div className="clubs-task-main">
                              <div className="clubs-task-label">
                                <span className="clubs-task-num">#{index + 1}</span> {task.label}
                              </div>
                              <div className="clubs-task-meta">
                                {task.owner ? <span className="clubs-task-owner">{task.owner}</span> : null}
                                {timing ? (
                                  <span className={`clubs-task-stamp${timing.late ? " late" : " ontime"}`}>
                                    Done {formatStamp(timing.completed)}
                                    {timing.late ? " · late" : " · on time"}
                                  </span>
                                ) : null}
                                <button
                                  type="button"
                                  className={`clubs-note-link${notePreview ? " has" : ""}`}
                                  onClick={() => setExpandedTaskId(expanded ? null : task.id)}
                                >
                                  {expanded ? "Close" : notePreview ? "Edit note" : "Add note"}
                                </button>
                              </div>

                              {!expanded && notePreview ? (
                                <button
                                  type="button"
                                  className="clubs-note-preview"
                                  onClick={() => setExpandedTaskId(task.id)}
                                >
                                  {notePreview}
                                </button>
                              ) : null}

                              {expanded ? (
                                <div className="clubs-task-notes">
                                  <textarea
                                    id={`note-${task.id}`}
                                    value={progress.notes}
                                    placeholder="Quick note — blockers, who you pinged, next step…"
                                    onChange={(e) => updateTaskNotes(task.id, e.target.value)}
                                    rows={3}
                                    autoFocus
                                  />
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {tab === "clubs" && (
          <section>
            <div className="clubs-section-head">
              <div>
                <h2>Club tracker</h2>
                <p>Click a row to edit contacts, counts, payout, and copy the activation email.</p>
              </div>
            </div>

            <div className="clubs-toolbar">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search clubs, contacts, next action…"
                aria-label="Search clubs"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ClubStatus | "all")}
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                {(Object.keys(STATUS_LABEL) as ClubStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>

            <div className="clubs-table-wrap">
              <table className="clubs-table">
                <thead>
                  <tr>
                    <th>Club</th>
                    <th>Status</th>
                    <th>Active</th>
                    <th>On Ligo</th>
                    <th>80%</th>
                    <th>Payout</th>
                    <th>Next action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClubs.map((club) => (
                    <tr
                      key={club.id}
                      className={selectedId === club.id ? "active" : undefined}
                      onClick={() => setSelectedId(club.id)}
                    >
                      <td>
                        <strong>{club.name}</strong>
                        {club.contactName ? (
                          <div style={{ color: "var(--c-muted)", fontSize: 12, marginTop: 2 }}>{club.contactName}</div>
                        ) : null}
                      </td>
                      <td>
                        <span className={`clubs-status ${club.status}`}>{STATUS_LABEL[club.status]}</span>
                      </td>
                      <td>{club.activeMembership ?? "—"}</td>
                      <td>{club.ligoMembers ?? "—"}</td>
                      <td>{threshold80(club.activeMembership) ?? "—"}</td>
                      <td>
                        {club.payout === "full" ? `$${PAYOUT_100}` : club.payout === "partial" ? `$${PAYOUT_80}` : "—"}
                      </td>
                      <td>{club.nextAction || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "playbook" && (
          <section className="clubs-ref">
            <div className="clubs-section-head">
              <div>
                <h2>Playbook reference</h2>
                <p>Rules, package, emails, and distribution — open when you need them.</p>
              </div>
            </div>

            <div className="clubs-ref-grid">
              <details open>
                <summary>V1 rules</summary>
                <div className="body">
                  <ul>
                    <li>One ask at a time.</li>
                    <li>Pay for useful distribution behavior, not the “partner” label.</li>
                    <li>Club owns creative; Ligo owns the CTA system.</li>
                    <li>Go broad on net-new first; prioritize on real momentum.</li>
                    <li>No fixed club cap — the $1,500 pool is the constraint.</li>
                    <li>Run long enough to learn before redesigning.</li>
                  </ul>
                </div>
              </details>

              <details open>
                <summary>Existing-club payout</summary>
                <div className="body">
                  <ul>
                    <li>80% of active membership → <strong>${PAYOUT_80}</strong></li>
                    <li>100% of active membership → <strong>${PAYOUT_100} total</strong></li>
                    <li>The ${PAYOUT_100} is not ${PAYOUT_80} + ${PAYOUT_100}.</li>
                    <li>Current deadline: <strong>{deadlineLabel}</strong></li>
                    <li>Later / net-new clubs: <strong>7-day activation window</strong></li>
                    <li>No separate payment for event CTA behavior in V1</li>
                  </ul>
                </div>
              </details>

              <details>
                <summary>What the club commits to</summary>
                <div className="body">
                  <p>
                    <strong>1. Membership activation</strong> — 80–100% of confirmed active membership in the agreed
                    window.
                  </p>
                  <p>
                    <strong>2. Recurring event distribution</strong> — public Georgetown-facing events route audience
                    through Ligo (RSVP / discovery CTA). Standing partner behavior, not a bounty.
                  </p>
                  <p>Keep asks sequential: activation first, distribution second.</p>
                </div>
              </details>

              <details>
                <summary>Cold outbound email</summary>
                <div className="body">
                  <div className="clubs-email">{coldEmail("[Club]")}</div>
                  <button type="button" className="clubs-ghost" style={{ marginTop: 10 }} onClick={() => copyText(coldEmail("[Club]"))}>
                    Copy template
                  </button>
                </div>
              </details>

              <details>
                <summary>Activation email</summary>
                <div className="body">
                  <div className="clubs-email">{activationEmail(INITIAL_CLUBS[0], deadlineLabel)}</div>
                </div>
              </details>

              <details>
                <summary>Recurring event distribution</summary>
                <div className="body">
                  <p>Club promotes event → Ligo is the CTA → students enter Ligo. Ligo amplifies back.</p>
                  <ul>
                    <li>Transparent “RSVP ON LIGO” PNG / SVG</li>
                    <li>Small Ligo badge / logo</li>
                    <li>Event link or QR</li>
                    <li>Approved caption lines + Story guidance</li>
                  </ul>
                  <p>Public student-facing events only — not every internal meeting.</p>
                </div>
              </details>

              <details>
                <summary>Social / inbound (Mekhi)</summary>
                <div className="body">
                  <ul>
                    <li>Direct recruitment PSA — DM “CLUB”</li>
                    <li>Problem / value prop</li>
                    <li>Funding / early-partner opportunity</li>
                    <li>Social proof (14 partners)</li>
                    <li>Partnership in action spotlight</li>
                    <li>Permanent For Clubs Highlight</li>
                  </ul>
                </div>
              </details>

              <details>
                <summary>Why this works</summary>
                <div className="body">
                  <p>
                    Clubs are distribution, not just event supply. Early stage needs subsidy + promo support because the
                    network isn’t valuable enough yet. Goal: network value up → subsidies down.
                  </p>
                  <ul>
                    <li>Logo ≠ success. Member activation + recurring traffic = success.</li>
                    <li>Logo on a flyer = awareness. CTA = behavior.</li>
                  </ul>
                </div>
              </details>
            </div>
          </section>
        )}

        <p className="clubs-footer-note">
          Progress stores locally in this browser · hello@meetligo.com · TJ Club BD · Mekhi Social/creative
        </p>
      </main>

      {selected && (
        <div className="clubs-drawer-backdrop" onClick={() => setSelectedId(null)}>
          <aside className="clubs-drawer" onClick={(e) => e.stopPropagation()} aria-label={`${selected.name} details`}>
            <div className="clubs-drawer-head">
              <div>
                <div className="clubs-kicker">Club detail</div>
                <h3>{selected.name}</h3>
              </div>
              <button type="button" className="clubs-ghost" onClick={() => setSelectedId(null)}>
                Close
              </button>
            </div>

            <div className="clubs-field">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={selected.status}
                onChange={(e) => updateClub(selected.id, { status: e.target.value as ClubStatus })}
              >
                {(Object.keys(STATUS_LABEL) as ClubStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>

            <div className="clubs-field-row">
              <div className="clubs-field">
                <label htmlFor="contactName">Contact name</label>
                <input
                  id="contactName"
                  value={selected.contactName}
                  onChange={(e) => updateClub(selected.id, { contactName: e.target.value })}
                />
              </div>
              <div className="clubs-field">
                <label htmlFor="contactIg">Instagram</label>
                <input
                  id="contactIg"
                  value={selected.contactIg}
                  onChange={(e) => updateClub(selected.id, { contactIg: e.target.value })}
                />
              </div>
            </div>

            <div className="clubs-field">
              <label htmlFor="contactEmail">Email</label>
              <input
                id="contactEmail"
                value={selected.contactEmail}
                onChange={(e) => updateClub(selected.id, { contactEmail: e.target.value })}
              />
            </div>

            <div className="clubs-field-row">
              <div className="clubs-field">
                <label htmlFor="activeMembership">Active membership</label>
                <input
                  id="activeMembership"
                  type="number"
                  min={0}
                  value={selected.activeMembership ?? ""}
                  onChange={(e) =>
                    updateClub(selected.id, {
                      activeMembership: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="clubs-field">
                <label htmlFor="ligoMembers">On Ligo</label>
                <input
                  id="ligoMembers"
                  type="number"
                  min={0}
                  value={selected.ligoMembers ?? ""}
                  onChange={(e) =>
                    updateClub(selected.id, {
                      ligoMembers: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="clubs-field">
              <label>Thresholds</label>
              <div style={{ fontSize: 13, color: "var(--c-muted)" }}>
                80% = {threshold80(selected.activeMembership) ?? "—"} · 100% = {selected.activeMembership ?? "—"} ·
                Payout ${PAYOUT_80} / ${PAYOUT_100} total
              </div>
            </div>

            <div className="clubs-field">
              <label htmlFor="payout">Payout status</label>
              <select
                id="payout"
                value={selected.payout}
                onChange={(e) => updateClub(selected.id, { payout: e.target.value as PayoutStatus })}
              >
                <option value="none">None</option>
                <option value="partial">Partial (${PAYOUT_80})</option>
                <option value="full">Full (${PAYOUT_100} total)</option>
              </select>
            </div>

            <div className="clubs-toggle-row">
              <button
                type="button"
                className={`clubs-toggle${selected.activationStarted ? " on" : ""}`}
                onClick={() => updateClub(selected.id, { activationStarted: !selected.activationStarted })}
              >
                Activation started
              </button>
              <button
                type="button"
                className={`clubs-toggle${selected.activationCompleted ? " on" : ""}`}
                onClick={() => updateClub(selected.id, { activationCompleted: !selected.activationCompleted })}
              >
                Activation done
              </button>
              <button
                type="button"
                className={`clubs-toggle${selected.eventDistributionStarted ? " on" : ""}`}
                onClick={() =>
                  updateClub(selected.id, { eventDistributionStarted: !selected.eventDistributionStarted })
                }
              >
                Event routing
              </button>
            </div>

            <div className="clubs-field">
              <label htmlFor="nextAction">Next action</label>
              <input
                id="nextAction"
                value={selected.nextAction}
                onChange={(e) => updateClub(selected.id, { nextAction: e.target.value })}
              />
            </div>

            <div className="clubs-field">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                value={selected.notes}
                onChange={(e) => updateClub(selected.id, { notes: e.target.value })}
              />
            </div>

            <div className="clubs-field">
              <label>Activation email</label>
              <div className="clubs-email">{activationEmail(selected, deadlineLabel)}</div>
            </div>

            <button
              type="button"
              className="clubs-primary"
              onClick={() => copyText(activationEmail(selected, deadlineLabel))}
            >
              {copied ? "Copied" : "Copy activation email"}
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}
