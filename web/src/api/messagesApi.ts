import { apiClient } from "@/api/client";
import type {
  ConversationDetail,
  ConversationFilter,
  ConversationListItem,
  ConversationListResponse,
  InboxMessageRead,
  MessagesUnreadCount,
} from "@/types/api";

function buildQuery(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) {
    return "";
  }
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function listAdminConversations(
  businessId: string,
  params?: {
    filter?: ConversationFilter;
    q?: string;
    page?: number;
    limit?: number;
  },
) {
  return apiClient.get<ConversationListResponse>(
    `/businesses/${encodeURIComponent(businessId)}/messages/conversations${buildQuery(params)}`,
  );
}

export function getAdminConversation(businessId: string, conversationId: string) {
  return apiClient.get<ConversationDetail>(
    `/businesses/${encodeURIComponent(businessId)}/messages/conversations/${encodeURIComponent(conversationId)}`,
  );
}

export function sendAdminMessage(businessId: string, conversationId: string, body: string) {
  return apiClient.post<InboxMessageRead>(
    `/businesses/${encodeURIComponent(businessId)}/messages/conversations/${encodeURIComponent(conversationId)}/messages`,
    { body },
  );
}

export function markAdminConversationRead(businessId: string, conversationId: string) {
  return apiClient.post<void>(
    `/businesses/${encodeURIComponent(businessId)}/messages/conversations/${encodeURIComponent(conversationId)}/read`,
  );
}

export function archiveAdminConversation(businessId: string, conversationId: string) {
  return apiClient.post<ConversationListItem>(
    `/businesses/${encodeURIComponent(businessId)}/messages/conversations/${encodeURIComponent(conversationId)}/archive`,
  );
}

export function unarchiveAdminConversation(businessId: string, conversationId: string) {
  return apiClient.post<ConversationListItem>(
    `/businesses/${encodeURIComponent(businessId)}/messages/conversations/${encodeURIComponent(conversationId)}/unarchive`,
  );
}

export function markAdminConversationUnread(businessId: string, conversationId: string) {
  return apiClient.post<void>(
    `/businesses/${encodeURIComponent(businessId)}/messages/conversations/${encodeURIComponent(conversationId)}/mark-unread`,
  );
}

export function getAdminMessagesUnreadCount(businessId: string) {
  return apiClient.get<MessagesUnreadCount>(
    `/businesses/${encodeURIComponent(businessId)}/messages/unread-count`,
  );
}

export function listMyConversations(params?: {
  filter?: ConversationFilter;
  page?: number;
  limit?: number;
}) {
  return apiClient.get<ConversationListResponse>(
    `/me/messages/conversations${buildQuery(params)}`,
  );
}

export function getMyConversation(conversationId: string) {
  return apiClient.get<ConversationDetail>(
    `/me/messages/conversations/${encodeURIComponent(conversationId)}`,
  );
}

export function createMyConversation(businessId: string) {
  return apiClient.post<ConversationListItem>(`/me/messages/conversations`, {
    business_id: businessId,
  });
}

export function sendMyMessage(conversationId: string, body: string) {
  return apiClient.post<InboxMessageRead>(
    `/me/messages/conversations/${encodeURIComponent(conversationId)}/messages`,
    { body },
  );
}

export function markMyConversationRead(conversationId: string) {
  return apiClient.post<void>(
    `/me/messages/conversations/${encodeURIComponent(conversationId)}/read`,
  );
}

export function getMyMessagesUnreadCount() {
  return apiClient.get<MessagesUnreadCount>(`/me/messages/unread-count`);
}
