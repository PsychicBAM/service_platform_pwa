import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMyMessagesUnreadCount } from "@/api/messagesApi";
import { useAuth } from "@/hooks/useAuth";

function shouldShowFloatingMessagesButton(pathname: string, isAuthenticated: boolean): boolean {
  if (!isAuthenticated) {
    return false;
  }
  if (pathname.startsWith("/admin") || pathname.startsWith("/superadmin")) {
    return false;
  }
  if (!(pathname === "/me" || pathname.startsWith("/me/"))) {
    return false;
  }
  if (pathname === "/me/messages" || pathname.startsWith("/me/messages/")) {
    return false;
  }
  return true;
}

/**
 * Floating messages entry for signed-in clients on /me/* pages only.
 * Outer gate never calls useQuery, so public/legal Layout renders stay safe
 * without QueryClientProvider.
 */
export function ClientFloatingMessagesButton() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const show = shouldShowFloatingMessagesButton(location.pathname, isAuthenticated);

  if (!show || !user) {
    return null;
  }

  return <ClientFloatingMessagesButtonActive />;
}

function ClientFloatingMessagesButtonActive() {
  const unreadQuery = useQuery({
    queryKey: ["client-messages-unread"],
    queryFn: () => getMyMessagesUnreadCount(),
    refetchInterval: 30_000,
  });

  const unread = unreadQuery.data?.unread_total ?? 0;

  return (
    <Link
      to="/me/messages"
      className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-700/30 transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 md:bottom-6"
      aria-label={unread > 0 ? `Messages, ${unread} unread` : "Messages"}
      data-testid="client-floating-messages-button"
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" aria-hidden="true">
        <path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      </svg>
      {unread > 0 ? (
        <span
          className="absolute -right-1 -top-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-4 text-white"
          data-testid="client-floating-messages-unread-badge"
        >
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}

export { shouldShowFloatingMessagesButton };
