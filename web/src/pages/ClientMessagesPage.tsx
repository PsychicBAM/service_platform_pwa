import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listMyBookings, listMyOrders } from "@/api/meApi";
import {
  createMyConversation,
  getMyConversation,
  getMyMessagesUnreadCount,
  listMyConversations,
  sendMyMessage,
} from "@/api/messagesApi";
import { AuthPrompt } from "@/components/AuthPrompt";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import type { ConversationFilter, InboxMessageRead } from "@/types/api";
import { getMeErrorMessage } from "@/utils/errors";
import { formatDateTimeLabel } from "@/utils/format";

const FILTER_TABS: Array<{ id: ConversationFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "archived", label: "Archived" },
];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function MessageBubble({
  message,
  side,
}: {
  message: InboxMessageRead;
  side: "left" | "right";
}) {
  const isClient = side === "right";
  return (
    <div
      className={`flex ${isClient ? "justify-end" : "justify-start"}`}
      data-testid="client-messages-message-bubble"
      data-sender={message.sender_type}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
          isClient
            ? "rounded-br-md bg-emerald-700 text-white"
            : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <p
          className={`mt-1 text-[10px] ${
            isClient ? "text-emerald-100/90" : "text-slate-400"
          }`}
        >
          {formatDateTimeLabel(message.created_at)}
        </p>
      </div>
    </div>
  );
}

export function ClientMessagesPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const [startBusinessId, setStartBusinessId] = useState("");

  const listQuery = useQuery({
    queryKey: ["client-messages", filter],
    queryFn: () => listMyConversations({ filter, limit: 50 }),
    enabled: isAuthenticated,
  });

  const unreadQuery = useQuery({
    queryKey: ["client-messages-unread"],
    queryFn: () => getMyMessagesUnreadCount(),
    enabled: isAuthenticated,
    refetchInterval: 30_000,
  });

  const detailQuery = useQuery({
    queryKey: ["client-messages-detail", selectedId],
    queryFn: () => getMyConversation(selectedId!),
    enabled: isAuthenticated && Boolean(selectedId),
  });

  const bookingsQuery = useQuery({
    queryKey: ["my-bookings", "upcoming"],
    queryFn: () => listMyBookings("upcoming"),
    enabled: isAuthenticated,
  });

  const ordersQuery = useQuery({
    queryKey: ["my-orders", "active"],
    queryFn: () => listMyOrders("active"),
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (detailQuery.isSuccess) {
      void queryClient.invalidateQueries({ queryKey: ["client-messages"] });
      void queryClient.invalidateQueries({ queryKey: ["client-messages-unread"] });
    }
  }, [detailQuery.dataUpdatedAt, detailQuery.isSuccess, queryClient]);

  const knownBusinesses = useMemo(() => {
    const map = new Map<string, string>();
    for (const booking of bookingsQuery.data?.data ?? []) {
      map.set(booking.business.id, booking.business.name);
    }
    for (const order of ordersQuery.data?.data ?? []) {
      map.set(order.business.id, order.business.name);
    }
    for (const conversation of listQuery.data?.items ?? []) {
      if (conversation.business) {
        map.set(conversation.business.id, conversation.business.name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [bookingsQuery.data, ordersQuery.data, listQuery.data]);

  const sendMutation = useMutation({
    mutationFn: (body: string) => sendMyMessage(selectedId!, body),
    onSuccess: async () => {
      setDraft("");
      setSendError(null);
      await queryClient.invalidateQueries({ queryKey: ["client-messages-detail", selectedId] });
      await queryClient.invalidateQueries({ queryKey: ["client-messages"] });
    },
    onError: (error) => {
      setSendError(getMeErrorMessage(error, "Could not send message."));
    },
  });

  const createMutation = useMutation({
    mutationFn: (businessId: string) => createMyConversation(businessId),
    onSuccess: async (conversation) => {
      await queryClient.invalidateQueries({ queryKey: ["client-messages"] });
      setSelectedId(conversation.id);
      setMobileShowThread(true);
      setStartBusinessId("");
    },
  });

  if (!isAuthenticated) {
    return (
      <AuthPrompt
        title="Sign in to view messages"
        description="Access your conversations with businesses after signing in."
      />
    );
  }

  const conversations = listQuery.data?.items ?? [];
  const selected = detailQuery.data;
  const businessName = selected?.business?.name ?? "Business";

  function handleSelect(id: string) {
    setSelectedId(id);
    setMobileShowThread(true);
    setSendError(null);
  }

  function handleSend() {
    const body = draft.trim();
    if (!body || !selectedId || sendMutation.isPending) {
      return;
    }
    sendMutation.mutate(body);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }
    event.preventDefault();
    handleSend();
  }

  return (
    <section className="space-y-4 overflow-x-hidden" data-testid="client-messages-page">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Messages</h1>
        <p className="mt-1 text-sm text-slate-500">
          Chat with businesses about your bookings and requests.
        </p>
        {(unreadQuery.data?.unread_total ?? 0) > 0 ? (
          <p className="mt-1 text-xs font-medium text-emerald-700">
            {unreadQuery.data?.unread_total} unread
          </p>
        ) : null}
      </div>

      <div className="grid min-h-[480px] grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-[260px_minmax(0,1fr)]">
        <div
          className={`flex min-h-0 flex-col border-slate-200 md:border-r ${
            mobileShowThread ? "hidden md:flex" : "flex"
          }`}
          data-testid="client-messages-conversation-list"
        >
          <div className="flex gap-1 border-b border-slate-100 p-2">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                  filter === tab.id
                    ? "bg-emerald-50 text-emerald-800"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {knownBusinesses.length > 0 ? (
            <div className="space-y-2 border-b border-slate-100 p-2">
              <label className="block text-xs font-medium text-slate-600" htmlFor="start-convo-business">
                Start or open a conversation
              </label>
              <div className="flex gap-2">
                <select
                  id="start-convo-business"
                  value={startBusinessId}
                  onChange={(event) => setStartBusinessId(event.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                >
                  <option value="">Select a business…</option>
                  {knownBusinesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!startBusinessId || createMutation.isPending}
                  onClick={() => createMutation.mutate(startBusinessId)}
                  className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  Open
                </button>
              </div>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto">
            {listQuery.isLoading ? <LoadingState message="Loading messages…" /> : null}
            {listQuery.isError ? (
              <ErrorState
                title="Could not load messages"
                message={getMeErrorMessage(listQuery.error, "Unable to load conversations.")}
              />
            ) : null}
            {!listQuery.isLoading && !listQuery.isError && conversations.length === 0 ? (
              <div className="p-4" data-testid="client-messages-empty-state">
                <EmptyState
                  title="No conversations yet"
                  description={
                    knownBusinesses.length > 0
                      ? "Choose a business above to start messaging."
                      : "Book a service or submit a request, then you can message the business here."
                  }
                />
              </div>
            ) : null}
            {conversations.map((conversation) => {
              const name = conversation.business?.name ?? "Business";
              const active = conversation.id === selectedId;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => handleSelect(conversation.id)}
                  data-testid="client-messages-conversation-row"
                  className={`flex w-full gap-3 border-b border-slate-50 px-3 py-3 text-left ${
                    active ? "bg-emerald-50/70" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">
                    {initials(name) || "B"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-slate-900">{name}</span>
                      {conversation.unread_count > 0 ? (
                        <span className="rounded-full bg-emerald-600 px-1.5 text-[10px] font-semibold text-white">
                          {conversation.unread_count}
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-600">
                      {conversation.last_message_preview ?? "No messages yet"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          className={`flex min-h-0 flex-col ${mobileShowThread ? "flex" : "hidden md:flex"}`}
          data-testid="client-messages-thread"
        >
          {!selectedId ? (
            <div className="flex flex-1 items-center justify-center p-6 text-sm text-slate-500">
              Select a conversation to continue chatting.
            </div>
          ) : detailQuery.isLoading ? (
            <LoadingState message="Loading conversation…" />
          ) : detailQuery.isError ? (
            <ErrorState
              title="Could not load conversation"
              message={getMeErrorMessage(detailQuery.error, "Unable to load conversation.")}
            />
          ) : selected ? (
            <>
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                <button
                  type="button"
                  className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-50 md:hidden"
                  onClick={() => setMobileShowThread(false)}
                >
                  ← Back
                </button>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{businessName}</p>
                  <p className="text-xs text-slate-500">
                    {selected.context_type === "general" ? "General conversation" : selected.context_type}
                  </p>
                </div>
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/80 px-4 py-4">
                {selected.messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    side={message.sender_type === "client" ? "right" : "left"}
                  />
                ))}
              </div>
              <div
                className="border-t border-slate-100 bg-white p-3"
                data-testid="client-messages-composer"
              >
                {sendError ? (
                  <p className="mb-2 text-xs text-red-600" role="alert">
                    {sendError}
                  </p>
                ) : null}
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  rows={3}
                  maxLength={5000}
                  placeholder="Type your message…"
                  disabled={sendMutation.isPending}
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled
                      title="Photo/video attachments coming soon"
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-400"
                      data-testid="client-messages-attach-image"
                    >
                      Photo · Coming soon
                    </button>
                    <button
                      type="button"
                      disabled
                      title="Photo/video attachments coming soon"
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-400"
                      data-testid="client-messages-attach-video"
                    >
                      Video · Coming soon
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!draft.trim() || sendMutation.isPending}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    data-testid="client-messages-send"
                  >
                    {sendMutation.isPending ? "Sending…" : "Send"}
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
