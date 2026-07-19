type AdminSettingsTabId =
  | "business"
  | "services"
  | "team"
  | "notifications"
  | "email-delivery"
  | "payments"
  | "appearance";

const SETTINGS_TABS: Array<{ id: AdminSettingsTabId; label: string }> = [
  { id: "business", label: "Business" },
  { id: "services", label: "Services" },
  { id: "team", label: "Team" },
  { id: "notifications", label: "Notifications" },
  { id: "email-delivery", label: "Email Delivery" },
  { id: "payments", label: "Payments & Billing" },
  { id: "appearance", label: "Appearance" },
];

type AdminSettingsTabsProps = {
  activeTab: AdminSettingsTabId;
  onChange: (tab: AdminSettingsTabId) => void;
};

export function AdminSettingsTabs({ activeTab, onChange }: AdminSettingsTabsProps) {
  return (
    <div className="border-b border-gray-200" data-testid="admin-settings-tabs">
      <nav
        className="-mb-px flex gap-2 overflow-x-auto pb-px sm:gap-3"
        aria-label="Settings sections"
      >
        {SETTINGS_TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`shrink-0 border-b-2 px-3.5 py-3 text-sm font-medium transition-colors sm:px-4 ${
                isActive
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
              data-testid={`admin-settings-tab-${tab.id}`}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export type { AdminSettingsTabId };
export { SETTINGS_TABS };
