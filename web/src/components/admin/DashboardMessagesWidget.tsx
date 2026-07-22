import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  getAdminMessagesUnreadCount,
  listAdminConversations,
} from "@/api/messagesApi";
import { formatDateTimeLabel } from "@/utils/format";

type DashboardMessagesWidgetProps = {
  businessId: string;
};

export function DashboardMessagesWidget({ businessId }: DashboardMessagesWidgetProps) {
  const unreadQuery = useQuery({
    queryKey: ["admin-messages-unread", businessId],
    queryFn: () => getAdminMessagesUnreadCount(businessId),
    refetchInterval: 60_000,
  });

  const latestQuery = useQuery({
    queryKey: ["admin-messages", businessId, "dashboard"],
    queryFn: () => listAdminConversations(businessId, { filter: "all", limit: 5 }),
    refetchInterval: 60_000,
  });

  const unread = unreadQuery.data?.unread_total ?? 0;
  const latest = latestQuery.data?.items ?? [];

  return (
    <div
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      data-testid="admin-messages-dashboard-widget"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Messages</h3>
          <p className="mt-0.5 text-sm text-gray-500">
            {unread > 0
              ? `${unread} unread conversation${unread === 1 ? "" : "s"}`
              : "Inbox is up to date"}
          </p>
        </div>
        <Link
          to="/admin/messages"
          className="rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
        >
          Open inbox
        </Link>
      </div>

      {latestQuery.isLoading ? (
        <p className="mt-4 text-sm text-gray-500">Loading recent conversations…</p>
      ) : latest.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">No client conversations yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-gray-100">
          {latest.map((conversation) => (
            <li key={conversation.id} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">
                  {conversation.client?.full_name ?? "Client"}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {conversation.last_message_preview ?? "No messages yet"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                {conversation.unread_count > 0 ? (
                  <span className="inline-flex rounded-full bg-emerald-600 px-1.5 text-[10px] font-semibold text-white">
                    {conversation.unread_count}
                  </span>
                ) : null}
                {conversation.last_message_at ? (
                  <p className="mt-1 text-[10px] text-gray-400">
                    {formatDateTimeLabel(conversation.last_message_at)}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
