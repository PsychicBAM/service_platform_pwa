import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveAdminConversation,
  getAdminConversation,
  getAdminMessagesUnreadCount,
  listAdminConversations,
  markAdminConversationUnread,
  sendAdminMessage,
  unarchiveAdminConversation,
} from "@/api/messagesApi";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { useAdminBusiness } from "@/hooks/useAdminBusiness";
import type { ConversationFilter, InboxMessageRead } from "@/types/api";
import { getAdminSettingsErrorMessage } from "@/utils/errors";
import { formatDateTimeLabel } from "@/utils/format";

const FILTER_TABS: Array<{ id: ConversationFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
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
  const isBusiness = side === "right";
  return (
    <div
      className={`flex ${isBusiness ? "justify-end" : "justify-start"}`}
      data-testid="admin-messages-message-bubble"
      data-sender={message.sender_type}
    >
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${
          isBusiness
            ? "rounded-br-md bg-emerald-700 text-white"
            : "rounded-bl-md border border-slate-200 bg-white text-slate-800"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <p
          className={`mt-1 text-[10px] ${
            isBusiness ? "text-emerald-100/90" : "text-slate-400"
          }`}
        >
          {formatDateTimeLabel(message.created_at)}
        </p>
      </div>
    </div>
  );
}

export function AdminMessagesPage() {
  const { businessId } = useAdminBusiness();
  const queryClient = useQueryClient();
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const threadScrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [mobileShowThread, setMobileShowThread] = useState(false);

  function focusComposer() {
    requestAnimationFrame(() => {
      composerRef.current?.focus();
    });
  }

  function scrollThreadToBottom() {
    requestAnimationFrame(() => {
      const scroller = threadScrollRef.current;
      if (scroller) {
        scroller.scrollTop = scroller.scrollHeight;
        return;
      }
      messagesEndRef.current?.scrollIntoView({ block: "end" });
    });
  }

  const listQuery = useQuery({
    queryKey: ["admin-messages", businessId, filter, search],
    queryFn: () =>
      listAdminConversations(businessId!, {
        filter,
        q: search || undefined,
        limit: 50,
      }),
    enabled: Boolean(businessId),
  });

  const unreadQuery = useQuery({
    queryKey: ["admin-messages-unread", businessId],
    queryFn: () => getAdminMessagesUnreadCount(businessId!),
    enabled: Boolean(businessId),
    refetchInterval: 30_000,
  });

  const detailQuery = useQuery({
    queryKey: ["admin-messages-detail", businessId, selectedId],
    queryFn: () => getAdminConversation(businessId!, selectedId!),
    enabled: Boolean(businessId && selectedId),
  });

  useEffect(() => {
    if (detailQuery.isSuccess) {
      void queryClient.invalidateQueries({ queryKey: ["admin-messages", businessId] });
      void queryClient.invalidateQueries({ queryKey: ["admin-messages-unread", businessId] });
    }
  }, [detailQuery.dataUpdatedAt, detailQuery.isSuccess, businessId, queryClient]);

  useEffect(() => {
    if (!selectedId || !detailQuery.data) {
      return;
    }
    scrollThreadToBottom();
  }, [selectedId, detailQuery.data?.messages.length, detailQuery.dataUpdatedAt]);

  const sendMutation = useMutation({
    mutationFn: (body: string) => sendAdminMessage(businessId!, selectedId!, body),
    onSuccess: async () => {
      setDraft("");
      setSendError(null);
      await queryClient.invalidateQueries({
        queryKey: ["admin-messages-detail", businessId, selectedId],
      });
      await queryClient.invalidateQueries({ queryKey: ["admin-messages", businessId] });
      scrollThreadToBottom();
      focusComposer();
    },
    onError: (error) => {
      setSendError(getAdminSettingsErrorMessage(error, "Could not send message."));
      focusComposer();
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => {
      const isArchived = detailQuery.data?.status === "archived";
      return isArchived
        ? unarchiveAdminConversation(businessId!, selectedId!)
        : archiveAdminConversation(businessId!, selectedId!);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-messages", businessId] });
      await queryClient.invalidateQueries({
        queryKey: ["admin-messages-detail", businessId, selectedId],
      });
    },
  });

  const markUnreadMutation = useMutation({
    mutationFn: () => markAdminConversationUnread(businessId!, selectedId!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-messages", businessId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-messages-unread", businessId] });
      setSelectedId(null);
      setMobileShowThread(false);
    },
  });

  const conversations = listQuery.data?.items ?? [];
  const unreadTotal = unreadQuery.data?.unread_total ?? listQuery.data?.meta.unread_total ?? 0;
  const selected = detailQuery.data;

  const clientName = useMemo(
    () => selected?.client?.full_name ?? "Client",
    [selected?.client?.full_name],
  );

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

  if (!businessId) {
    return <LoadingState message="Loading business…" />;
  }

  return (
    <section
      className="flex min-h-0 flex-col gap-4"
      data-testid="admin-messages-page"
    >
      <div className="shrink-0">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Messages</h2>
        <p className="mt-1 text-sm text-gray-500">
          Manage conversations with your clients in one place.
        </p>
      </div>

      <div className="grid h-[calc(100dvh-12rem)] min-h-[420px] max-h-[calc(100dvh-12rem)] grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[280px_minmax(0,1fr)_280px] xl:grid-cols-[300px_minmax(0,1fr)_300px]">
        {/* List */}
        <div
          className={`flex h-full min-h-0 flex-col border-slate-200 lg:border-r ${
            mobileShowThread ? "hidden lg:flex" : "flex"
          }`}
          data-testid="admin-messages-conversation-list"
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
                {tab.id === "all" && unreadTotal > 0 ? (
                  <span
                    className="ml-1 inline-flex min-w-[1.25rem] justify-center rounded-full bg-emerald-600 px-1 text-[10px] text-white"
                    data-testid="admin-messages-unread-badge"
                  >
                    {unreadTotal}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          <form
            className="border-b border-slate-100 p-2"
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(searchInput.trim());
            }}
          >
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search conversations…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              aria-label="Search conversations"
            />
          </form>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {listQuery.isLoading ? <LoadingState message="Loading conversations…" /> : null}
            {listQuery.isError ? (
              <ErrorState
                title="Could not load conversations"
                message={getAdminSettingsErrorMessage(
                  listQuery.error,
                  "Unable to load conversations.",
                )}
              />
            ) : null}
            {!listQuery.isLoading && !listQuery.isError && conversations.length === 0 ? (
              <div className="p-4" data-testid="admin-messages-empty-state">
                <EmptyState
                  title="No conversations yet"
                  description="When clients message your business, conversations will appear here."
                />
              </div>
            ) : null}
            {conversations.map((conversation) => {
              const name = conversation.client?.full_name ?? "Client";
              const active = conversation.id === selectedId;
              return (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => handleSelect(conversation.id)}
                  data-testid="admin-messages-conversation-row"
                  className={`flex w-full gap-3 border-b border-slate-50 px-3 py-3 text-left transition-colors ${
                    active
                      ? "border-l-4 border-l-emerald-600 bg-emerald-50/60"
                      : "border-l-4 border-l-transparent hover:bg-slate-50"
                  }`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                    {initials(name) || "?"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold text-slate-900">{name}</span>
                      <span className="shrink-0 text-[10px] text-slate-400">
                        {conversation.last_message_at
                          ? formatDateTimeLabel(conversation.last_message_at)
                          : ""}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      {conversation.context_type === "general"
                        ? "General"
                        : conversation.context_type}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span className="truncate text-xs text-slate-600">
                        {conversation.last_message_preview ?? "No messages yet"}
                      </span>
                      {conversation.unread_count > 0 ? (
                        <span className="shrink-0 rounded-full bg-emerald-600 px-1.5 text-[10px] font-semibold text-white">
                          {conversation.unread_count}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-400">
            New conversations from admin: Coming soon
          </p>
        </div>

        {/* Thread */}
        <div
          className={`flex h-full min-h-0 min-w-0 flex-col border-slate-200 lg:border-r ${
            mobileShowThread ? "flex" : "hidden lg:flex"
          }`}
          data-testid="admin-messages-thread"
        >
          {!selectedId ? (
            <div className="flex flex-1 items-center justify-center p-6 text-sm text-slate-500">
              Select a conversation to read and reply.
            </div>
          ) : detailQuery.isLoading ? (
            <LoadingState message="Loading thread…" />
          ) : detailQuery.isError ? (
            <ErrorState
              title="Could not load conversation"
              message={getAdminSettingsErrorMessage(
                detailQuery.error,
                "Unable to load conversation.",
              )}
            />
          ) : selected ? (
            <>
              <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-4 py-3">
                <button
                  type="button"
                  className="rounded-md px-2 py-1 text-sm text-slate-600 hover:bg-slate-50 lg:hidden"
                  onClick={() => setMobileShowThread(false)}
                >
                  ← Back
                </button>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold">
                  {initials(clientName)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{clientName}</p>
                  <p className="text-xs text-slate-500">
                    {selected.status === "archived" ? "Archived" : "Open"} ·{" "}
                    {selected.context_type}
                  </p>
                </div>
              </div>
              <div
                ref={threadScrollRef}
                className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/80 px-4 py-4"
                data-testid="admin-messages-thread-scroll"
              >
                {selected.messages.length === 0 ? (
                  <p className="text-center text-sm text-slate-500">No messages yet.</p>
                ) : (
                  selected.messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      side={message.sender_type === "business" ? "right" : "left"}
                    />
                  ))
                )}
                <div ref={messagesEndRef} aria-hidden="true" />
              </div>
              <div
                className="shrink-0 border-t border-slate-100 bg-white p-3"
                data-testid="admin-messages-composer-shell"
              >
                <div data-testid="admin-messages-composer">
                  {sendError ? (
                    <p className="mb-2 text-xs text-red-600" role="alert">
                      {sendError}
                    </p>
                  ) : null}
                  <textarea
                    ref={composerRef}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={handleComposerKeyDown}
                    rows={3}
                    maxLength={5000}
                    placeholder="Type your message…"
                    disabled={sendMutation.isPending || selected.status === "archived"}
                    className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                  />
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled
                        title="Photo/video attachments coming soon"
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-400"
                        data-testid="admin-messages-attach-image"
                      >
                        Photo · Coming soon
                      </button>
                      <button
                        type="button"
                        disabled
                        title="Photo/video attachments coming soon"
                        className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-400"
                        data-testid="admin-messages-attach-video"
                      >
                        Video · Coming soon
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={
                        !draft.trim() || sendMutation.isPending || selected.status === "archived"
                      }
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      data-testid="admin-messages-send"
                    >
                      {sendMutation.isPending ? "Sending…" : "Send"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Details */}
        <aside
          className={`h-full min-h-0 overflow-y-auto p-4 ${
            mobileShowThread && selectedId ? "hidden lg:block" : "hidden lg:block"
          }`}
          data-testid="admin-messages-details-panel"
        >
          {selected ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800">Conversation details</h3>
                <div className="mt-3 flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold">
                    {initials(clientName)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{clientName}</p>
                    {selected.client?.email ? (
                      <p className="truncate text-xs text-slate-500">{selected.client.email}</p>
                    ) : null}
                    {selected.client?.phone ? (
                      <p className="truncate text-xs text-slate-500">{selected.client.phone}</p>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="space-y-1 text-sm text-slate-600">
                <p>
                  <span className="text-slate-400">Status:</span> {selected.status}
                </p>
                <p>
                  <span className="text-slate-400">Context:</span> {selected.context_type}
                </p>
                <p>
                  <span className="text-slate-400">Unread:</span> {selected.unread_count}
                </p>
                {selected.last_message_at ? (
                  <p>
                    <span className="text-slate-400">Last message:</span>{" "}
                    {formatDateTimeLabel(selected.last_message_at)}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => markUnreadMutation.mutate()}
                  disabled={markUnreadMutation.isPending}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                  data-testid="admin-messages-mark-unread"
                >
                  Mark unread
                </button>
                <button
                  type="button"
                  onClick={() => archiveMutation.mutate()}
                  disabled={archiveMutation.isPending}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                  data-testid="admin-messages-archive"
                >
                  {selected.status === "archived" ? "Unarchive conversation" : "Archive conversation"}
                </button>
                <p className="text-[11px] text-slate-400">
                  Booking/order-linked threads: Coming soon
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Select a conversation to see details.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
