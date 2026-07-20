import type { ReactNode } from "react";
import type { MeResponse } from "@/types/api";

type AdminTeamSettingsPanelProps = {
  user: MeResponse | null;
  membershipRole: string | null;
  businessName: string | null;
};

function ComingSoonBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700 ${className}`}
    >
      Coming soon
    </span>
  );
}

function CardIcon({
  tone,
  children,
}: {
  tone: "emerald" | "blue" | "violet" | "amber" | "sky";
  children: ReactNode;
}) {
  const tones: Record<typeof tone, string> = {
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
    sky: "bg-sky-50 text-sky-600",
  };
  return (
    <span
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tones[tone]}`}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

function initialsFromName(name: string | null | undefined, email: string): string {
  const source = (name || email || "?").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function normalizeMemberRole(role: string | null | undefined): "owner" | "admin" | "staff" | "unknown" {
  const value = (role || "").toLowerCase();
  if (value === "owner" || value === "admin" || value === "staff") {
    return value;
  }
  return "unknown";
}

function roleBadgeLabel(role: ReturnType<typeof normalizeMemberRole>): string {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  if (role === "staff") return "Staff";
  return "Member";
}

function roleBadgeClass(role: ReturnType<typeof normalizeMemberRole>): string {
  if (role === "owner" || role === "admin") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (role === "staff") {
    return "bg-violet-100 text-violet-800";
  }
  return "bg-slate-100 text-slate-700";
}

function rolePermissionsCopy(role: ReturnType<typeof normalizeMemberRole>): string {
  if (role === "owner") {
    return "Full access — Manage all settings and data";
  }
  if (role === "admin") {
    return "Full access — Manage settings and day-to-day operations";
  }
  if (role === "staff") {
    return "Limited access — Help with bookings and requests";
  }
  return "Access based on account membership";
}

function StatCard({
  testId,
  tone,
  value,
  label,
  helper,
  icon,
}: {
  testId: string;
  tone: "emerald" | "blue" | "violet" | "amber";
  value: number;
  label: string;
  helper: string;
  icon: ReactNode;
}) {
  return (
    <div
      className="rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm"
      data-testid={testId}
    >
      <div className="flex items-start gap-3">
        <CardIcon tone={tone}>{icon}</CardIcon>
        <div className="min-w-0">
          <p className="text-lg font-semibold tabular-nums text-gray-900">{value}</p>
          <p className="text-sm font-medium text-gray-800">{label}</p>
          <p className="mt-0.5 text-xs text-gray-500">{helper}</p>
        </div>
      </div>
    </div>
  );
}

export function AdminTeamSettingsPanel({
  user,
  membershipRole,
  businessName,
}: AdminTeamSettingsPanelProps) {
  const role = normalizeMemberRole(membershipRole);
  const hasMember = Boolean(user);
  const membersCount = hasMember ? 1 : 0;
  const adminsCount = hasMember && (role === "owner" || role === "admin") ? 1 : 0;
  const staffCount = hasMember && role === "staff" ? 1 : 0;
  const viewersCount = 0;
  const displayName = user?.full_name?.trim() || user?.email || "Account owner";
  const email = user?.email || "—";

  return (
    <div className="space-y-5" data-testid="admin-team-settings-page">
      <section
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        data-testid="admin-team-overview-card"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-gray-900">Team overview</h3>
            <p className="mt-1 text-sm text-gray-500">
              Manage team members, roles, and permissions.
              {businessName ? (
                <>
                  {" "}
                  Current business: <span className="font-medium text-gray-700">{businessName}</span>.
                </>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            disabled
            title="Team invitations are not available yet"
            data-testid="admin-team-invite-button"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 opacity-70"
          >
            <span aria-hidden="true">+</span>
            Invitations coming soon
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            testId="admin-team-members-count"
            tone="emerald"
            value={membersCount}
            label="Team members"
            helper="Active accounts for this business."
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="3" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
          />
          <StatCard
            testId="admin-team-admins-count"
            tone="blue"
            value={adminsCount}
            label={role === "owner" ? "Owners / Admins" : "Admins"}
            helper="Full access."
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 3 4 7v5c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V7l-8-4Z" />
              </svg>
            }
          />
          <StatCard
            testId="admin-team-staff-count"
            tone="violet"
            value={staffCount}
            label="Staff"
            helper="Limited access (planned)."
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="3" />
              </svg>
            }
          />
          <StatCard
            testId="admin-team-viewers-count"
            tone="amber"
            value={viewersCount}
            label="Viewers"
            helper="Read-only access (planned)."
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            }
          />
        </div>
      </section>

      <section
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        data-testid="admin-team-members-card"
      >
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Team members</h3>
            <p className="mt-1 text-sm text-gray-500">
              Showing the real account that currently manages this business. Extra teammates cannot
              be invited yet.
            </p>
          </div>
          <ComingSoonBadge />
        </div>

        {hasMember ? (
          <div className="overflow-x-auto rounded-xl border border-gray-200" data-testid="admin-team-members-table">
            <table className="min-w-full divide-y divide-gray-200 text-left">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Permissions</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white text-sm">
                <tr data-testid="admin-team-member-row">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">
                        {initialsFromName(user?.full_name, email)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-semibold text-gray-900">{displayName}</p>
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            You
                          </span>
                        </div>
                        <p className="truncate text-xs text-gray-500">{email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${roleBadgeClass(role)}`}
                    >
                      {roleBadgeLabel(role)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{rolePermissionsCopy(role)}</td>
                  <td className="px-4 py-3 text-gray-500">—</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                      Active
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">No actions</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div
            className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-600"
            data-testid="admin-team-empty-state"
          >
            Could not load the current account owner for this business.
          </div>
        )}

        <div
          className="mt-4 rounded-xl border border-violet-100 bg-violet-50/60 px-4 py-3"
          data-testid="admin-team-coming-soon-state"
        >
          <p className="text-sm font-medium text-gray-900">
            Team member management is coming soon
          </p>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            For now, this business is managed by the account owner. Inviting teammates, changing
            roles, and removing members will be added with a real invitation flow later.
          </p>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          data-testid="admin-team-roles-card"
        >
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900">Roles &amp; permissions</h3>
            <ComingSoonBadge />
          </div>
          <p className="mb-4 text-sm text-gray-500">
            Planned access levels for this business. Owner/Admin already exist in membership data;
            Staff and Viewer enforcement is not available yet.
          </p>

          <ul className="space-y-2.5">
            <li
              className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-3"
              data-testid="admin-team-role-admin"
            >
              <CardIcon tone="emerald">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 3 4 7v5c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V7l-8-4Z" />
                </svg>
              </CardIcon>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-900">Owner / Admin</p>
                  <span className="text-xs font-medium text-gray-500">
                    {adminsCount} {adminsCount === 1 ? "member" : "members"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  Full access to settings, services, bookings, and billing for this business.
                </p>
              </div>
            </li>
            <li
              className="flex items-start gap-3 rounded-xl border border-dashed border-gray-200 bg-white px-3 py-3"
              data-testid="admin-team-role-staff"
            >
              <CardIcon tone="violet">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="3" />
                </svg>
              </CardIcon>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">Staff</p>
                  <ComingSoonBadge />
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  Limited day-to-day access for bookings and requests. Not assignable yet.
                </p>
              </div>
            </li>
            <li
              className="flex items-start gap-3 rounded-xl border border-dashed border-gray-200 bg-white px-3 py-3"
              data-testid="admin-team-role-viewer"
            >
              <CardIcon tone="amber">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </CardIcon>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">Viewer</p>
                  <ComingSoonBadge />
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  Read-only access. This role is planned and not available in the product yet.
                </p>
              </div>
            </li>
          </ul>

          <button
            type="button"
            disabled
            data-testid="admin-team-manage-roles"
            className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-500 opacity-70 sm:w-auto"
          >
            Manage roles — coming soon
          </button>
        </section>

        <section
          className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 p-5"
          data-testid="admin-team-invite-card"
          aria-disabled="true"
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900">Invite new team member</h3>
            <ComingSoonBadge />
          </div>
          <p className="mb-4 text-sm text-gray-500">
            Invite teammates to collaborate on bookings, services, reviews, and reports. This
            feature will be added later.
          </p>

          <div className="space-y-3 opacity-60">
            <div>
              <label htmlFor="team-invite-email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="team-invite-email"
                type="email"
                disabled
                placeholder="colleague@example.com"
                data-testid="admin-team-invite-email"
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-500"
              />
            </div>
            <div>
              <label htmlFor="team-invite-role" className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                id="team-invite-role"
                disabled
                data-testid="admin-team-invite-role"
                className="mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-500"
                defaultValue=""
              >
                <option value="" disabled>
                  Select a role
                </option>
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </select>
            </div>
            <div>
              <label htmlFor="team-invite-message" className="block text-sm font-medium text-gray-700">
                Personal message (optional)
              </label>
              <textarea
                id="team-invite-message"
                disabled
                rows={3}
                placeholder="Add a short note for your teammate"
                data-testid="admin-team-invite-message"
                className="mt-1.5 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-500"
              />
              <p className="mt-1 text-right text-[11px] text-gray-400">0 / 200</p>
            </div>
            <button
              type="button"
              disabled
              data-testid="admin-team-send-invite"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700/40 px-4 text-sm font-semibold text-white"
            >
              Send invitation
            </button>
          </div>
        </section>
      </div>

      <section
        className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 p-5"
        data-testid="admin-team-settings-card"
        aria-disabled="true"
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-gray-900">Team settings</h3>
          <ComingSoonBadge />
        </div>
        <p className="mb-4 text-sm text-gray-500" data-testid="admin-team-security-coming-soon">
          Security controls coming later. These options are preview-only and are not saved or
          enforced yet.
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 opacity-70">
            <p className="text-sm font-semibold text-gray-900">Member management</p>
            <ul className="mt-3 space-y-2 text-xs text-gray-500">
              <li>Allow Admins to invite new members</li>
              <li>Require email verification for new members</li>
              <li>Allow members to leave the team</li>
            </ul>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 opacity-70">
            <p className="text-sm font-semibold text-gray-900">Permissions &amp; access</p>
            <ul className="mt-3 space-y-2 text-xs text-gray-500">
              <li>Restrict Admin role to specific emails</li>
              <li>Require 2FA for Admins</li>
            </ul>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4 opacity-70">
            <p className="text-sm font-semibold text-gray-900">Security &amp; sessions</p>
            <ul className="mt-3 space-y-2 text-xs text-gray-500">
              <li>Automatically sign out inactive members</li>
              <li>Session timeout controls</li>
            </ul>
          </div>
        </div>

        <p className="mt-4 text-sm text-gray-600">
          Team management settings will become editable when team invitations are available.
        </p>
      </section>
    </div>
  );
}
