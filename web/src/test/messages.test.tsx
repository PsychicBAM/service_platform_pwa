import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminBusinessProvider } from "@/hooks/useAdminBusiness";
import { useAuth } from "@/hooks/useAuth";
import { AdminMessagesPage } from "@/pages/admin/AdminMessagesPage";
import { ClientMessagesPage } from "@/pages/ClientMessagesPage";
import { DashboardMessagesWidget } from "@/components/admin/DashboardMessagesWidget";
import { Layout } from "@/components/Layout";
import * as messagesApi from "@/api/messagesApi";
import * as meApi from "@/api/meApi";
import { mockOwnerUser, mockClientUser, BUSINESS_ID } from "@/test/mock-fixtures";
import { mockAuthenticatedAuth, renderRoute } from "@/test/test-utils";

vi.mock("@/hooks/useAuth");
vi.mock("@/api/messagesApi");
vi.mock("@/api/meApi");

const emptyList = {
  items: [],
  meta: { total: 0, page: 1, limit: 50, unread_total: 0 },
};

const sampleConversation = {
  id: "conv-1",
  status: "open" as const,
  context_type: "general" as const,
  context_id: null,
  subject: null,
  last_message_at: "2026-07-22T10:00:00Z",
  last_message_preview: "Hello from client",
  unread_count: 2,
  client: {
    id: "client-1",
    full_name: "Sarah Johnson",
    email: "sarah@example.com",
    phone: null,
  },
  business: {
    id: BUSINESS_ID,
    name: "Demo Business",
    slug: "demo-business",
    logo_url: null,
  },
  created_at: "2026-07-22T09:00:00Z",
  updated_at: "2026-07-22T10:00:00Z",
};

const sampleDetail = {
  ...sampleConversation,
  unread_count: 0,
  messages: [
    {
      id: "msg-1",
      conversation_id: "conv-1",
      sender_type: "client" as const,
      sender_user_id: "user-client",
      body: "Hello from client",
      read_at: "2026-07-22T10:05:00Z",
      created_at: "2026-07-22T10:00:00Z",
    },
  ],
};

describe("Admin messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));
    vi.mocked(messagesApi.listAdminConversations).mockResolvedValue(emptyList);
    vi.mocked(messagesApi.getAdminMessagesUnreadCount).mockResolvedValue({ unread_total: 0 });
  });

  it("shows Messages sidebar link", () => {
    renderRoute(
      <AdminBusinessProvider businesses={mockOwnerUser.businesses}>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route index element={<div>Dashboard</div>} />
          </Route>
        </Routes>
      </AdminBusinessProvider>,
      { route: "/admin", path: "/admin/*" },
    );

    expect(screen.getByTestId("admin-messages-sidebar-link")).toHaveTextContent("Messages");
  });

  it("renders empty state when no conversations", async () => {
    renderRoute(
      <AdminBusinessProvider businesses={mockOwnerUser.businesses}>
        <AdminMessagesPage />
      </AdminBusinessProvider>,
      { route: "/admin/messages", path: "/admin/messages" },
    );

    expect(await screen.findByTestId("admin-messages-page")).toBeInTheDocument();
    expect(await screen.findByTestId("admin-messages-empty-state")).toBeInTheDocument();
  });

  it("renders conversation list, opens thread, and sends a message", async () => {
    const user = userEvent.setup();
    vi.mocked(messagesApi.listAdminConversations).mockResolvedValue({
      items: [sampleConversation],
      meta: { total: 1, page: 1, limit: 50, unread_total: 2 },
    });
    vi.mocked(messagesApi.getAdminMessagesUnreadCount).mockResolvedValue({ unread_total: 2 });
    vi.mocked(messagesApi.getAdminConversation).mockResolvedValue(sampleDetail);
    vi.mocked(messagesApi.sendAdminMessage).mockResolvedValue({
      id: "msg-2",
      conversation_id: "conv-1",
      sender_type: "business",
      sender_user_id: "user-admin",
      body: "Thanks for reaching out",
      read_at: null,
      created_at: "2026-07-22T10:10:00Z",
    });

    renderRoute(
      <AdminBusinessProvider businesses={mockOwnerUser.businesses}>
        <AdminMessagesPage />
      </AdminBusinessProvider>,
      { route: "/admin/messages", path: "/admin/messages" },
    );

    expect(await screen.findByTestId("admin-messages-conversation-row")).toHaveTextContent(
      "Sarah Johnson",
    );
    expect(screen.getByTestId("admin-messages-unread-badge")).toHaveTextContent("2");

    await user.click(screen.getByTestId("admin-messages-conversation-row"));
    expect(await screen.findByTestId("admin-messages-thread")).toBeInTheDocument();
    expect(screen.getByTestId("admin-messages-message-bubble")).toHaveTextContent(
      "Hello from client",
    );

    await user.type(screen.getByPlaceholderText("Type your message…"), "Thanks for reaching out");
    await user.click(screen.getByTestId("admin-messages-send"));

    await waitFor(() => {
      expect(messagesApi.sendAdminMessage).toHaveBeenCalledWith(
        BUSINESS_ID,
        "conv-1",
        "Thanks for reaching out",
      );
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Type your message…")).toHaveFocus();
    });

    expect(screen.getByTestId("admin-messages-attach-image")).toBeDisabled();
    expect(screen.getByTestId("admin-messages-attach-video")).toBeDisabled();
    expect(screen.getByTestId("admin-messages-archive")).toBeInTheDocument();
    expect(screen.getByTestId("admin-messages-mark-unread")).toBeInTheDocument();
    expect(screen.getByTestId("admin-messages-thread-scroll")).toHaveClass("overflow-y-auto");
    expect(screen.getByTestId("admin-messages-composer-shell")).toBeInTheDocument();
  });

  it("keeps admin composer visible with a long thread", async () => {
    const user = userEvent.setup();
    const longThread = {
      ...sampleDetail,
      messages: Array.from({ length: 40 }, (_, index) => ({
        id: `msg-long-${index}`,
        conversation_id: "conv-1",
        sender_type: index % 2 === 0 ? ("client" as const) : ("business" as const),
        sender_user_id: index % 2 === 0 ? "user-client" : "user-admin",
        body: `Message number ${index + 1}`,
        read_at: null,
        created_at: `2026-07-22T10:${String(index).padStart(2, "0")}:00Z`,
      })),
    };
    vi.mocked(messagesApi.listAdminConversations).mockResolvedValue({
      items: [sampleConversation],
      meta: { total: 1, page: 1, limit: 50, unread_total: 0 },
    });
    vi.mocked(messagesApi.getAdminConversation).mockResolvedValue(longThread);

    renderRoute(
      <AdminBusinessProvider businesses={mockOwnerUser.businesses}>
        <AdminMessagesPage />
      </AdminBusinessProvider>,
      { route: "/admin/messages", path: "/admin/messages" },
    );

    await user.click(await screen.findByTestId("admin-messages-conversation-row"));
    expect(await screen.findByTestId("admin-messages-thread-scroll")).toBeInTheDocument();
    expect(screen.getByTestId("admin-messages-composer-shell")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Type your message…")).toBeInTheDocument();
    expect(screen.getByTestId("admin-messages-send")).toBeInTheDocument();
  });

  it("sends admin message when Enter is pressed", async () => {
    const user = userEvent.setup();
    vi.mocked(messagesApi.listAdminConversations).mockResolvedValue({
      items: [sampleConversation],
      meta: { total: 1, page: 1, limit: 50, unread_total: 0 },
    });
    vi.mocked(messagesApi.getAdminConversation).mockResolvedValue(sampleDetail);
    vi.mocked(messagesApi.sendAdminMessage).mockResolvedValue({
      id: "msg-enter",
      conversation_id: "conv-1",
      sender_type: "business",
      sender_user_id: "user-admin",
      body: "Sent with Enter",
      read_at: null,
      created_at: "2026-07-22T10:10:00Z",
    });

    renderRoute(
      <AdminBusinessProvider businesses={mockOwnerUser.businesses}>
        <AdminMessagesPage />
      </AdminBusinessProvider>,
      { route: "/admin/messages", path: "/admin/messages" },
    );

    await user.click(await screen.findByTestId("admin-messages-conversation-row"));
    const composer = await screen.findByPlaceholderText("Type your message…");
    await user.type(composer, "Sent with Enter");
    fireEvent.keyDown(composer, { key: "Enter", shiftKey: false });

    await waitFor(() => {
      expect(messagesApi.sendAdminMessage).toHaveBeenCalledWith(
        BUSINESS_ID,
        "conv-1",
        "Sent with Enter",
      );
    });
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Type your message…")).toHaveFocus();
    });
  });

  it("inserts a newline in admin composer with Shift+Enter", async () => {
    const user = userEvent.setup();
    vi.mocked(messagesApi.listAdminConversations).mockResolvedValue({
      items: [sampleConversation],
      meta: { total: 1, page: 1, limit: 50, unread_total: 0 },
    });
    vi.mocked(messagesApi.getAdminConversation).mockResolvedValue(sampleDetail);

    renderRoute(
      <AdminBusinessProvider businesses={mockOwnerUser.businesses}>
        <AdminMessagesPage />
      </AdminBusinessProvider>,
      { route: "/admin/messages", path: "/admin/messages" },
    );

    await user.click(await screen.findByTestId("admin-messages-conversation-row"));
    const composer = await screen.findByPlaceholderText("Type your message…");
    await user.type(composer, "Line one");
    fireEvent.keyDown(composer, { key: "Enter", shiftKey: true });
    expect(messagesApi.sendAdminMessage).not.toHaveBeenCalled();
    await user.type(composer, "{Shift>}{Enter}{/Shift}Line two");
    expect(composer).toHaveValue("Line one\nLine two");
    expect(messagesApi.sendAdminMessage).not.toHaveBeenCalled();
  });

  it("does not send whitespace-only admin message with Enter", async () => {
    const user = userEvent.setup();
    vi.mocked(messagesApi.listAdminConversations).mockResolvedValue({
      items: [sampleConversation],
      meta: { total: 1, page: 1, limit: 50, unread_total: 0 },
    });
    vi.mocked(messagesApi.getAdminConversation).mockResolvedValue(sampleDetail);

    renderRoute(
      <AdminBusinessProvider businesses={mockOwnerUser.businesses}>
        <AdminMessagesPage />
      </AdminBusinessProvider>,
      { route: "/admin/messages", path: "/admin/messages" },
    );

    await user.click(await screen.findByTestId("admin-messages-conversation-row"));
    const composer = await screen.findByPlaceholderText("Type your message…");
    await user.type(composer, "   ");
    fireEvent.keyDown(composer, { key: "Enter", shiftKey: false });
    expect(messagesApi.sendAdminMessage).not.toHaveBeenCalled();
  });

  it("does not submit admin Enter twice while sending", async () => {
    const user = userEvent.setup();
    let resolveSend!: (value: {
      id: string;
      conversation_id: string;
      sender_type: "business";
      sender_user_id: string;
      body: string;
      read_at: null;
      created_at: string;
    }) => void;
    vi.mocked(messagesApi.listAdminConversations).mockResolvedValue({
      items: [sampleConversation],
      meta: { total: 1, page: 1, limit: 50, unread_total: 0 },
    });
    vi.mocked(messagesApi.getAdminConversation).mockResolvedValue(sampleDetail);
    vi.mocked(messagesApi.sendAdminMessage).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSend = resolve;
        }),
    );

    renderRoute(
      <AdminBusinessProvider businesses={mockOwnerUser.businesses}>
        <AdminMessagesPage />
      </AdminBusinessProvider>,
      { route: "/admin/messages", path: "/admin/messages" },
    );

    await user.click(await screen.findByTestId("admin-messages-conversation-row"));
    const composer = await screen.findByPlaceholderText("Type your message…");
    await user.type(composer, "Only once");
    fireEvent.keyDown(composer, { key: "Enter", shiftKey: false });

    await waitFor(() => {
      expect(messagesApi.sendAdminMessage).toHaveBeenCalledTimes(1);
      expect(composer).toBeDisabled();
    });

    fireEvent.keyDown(composer, { key: "Enter", shiftKey: false });
    expect(messagesApi.sendAdminMessage).toHaveBeenCalledTimes(1);

    resolveSend({
      id: "msg-pending",
      conversation_id: "conv-1",
      sender_type: "business",
      sender_user_id: "user-admin",
      body: "Only once",
      read_at: null,
      created_at: "2026-07-22T10:10:00Z",
    });
  });

  it("dashboard widget shows real unread and latest conversations", async () => {
    vi.mocked(messagesApi.getAdminMessagesUnreadCount).mockResolvedValue({ unread_total: 3 });
    vi.mocked(messagesApi.listAdminConversations).mockResolvedValue({
      items: [sampleConversation],
      meta: { total: 1, page: 1, limit: 5, unread_total: 3 },
    });

    renderRoute(<DashboardMessagesWidget businessId={BUSINESS_ID} />, {
      route: "/admin",
      path: "/admin",
    });

    expect(await screen.findByTestId("admin-messages-dashboard-widget")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("admin-messages-dashboard-widget")).toHaveTextContent("3 unread");
    });
    expect(screen.getByText("Sarah Johnson")).toBeInTheDocument();
    expect(screen.getByText("Hello from client")).toBeInTheDocument();
  });
});

describe("Client messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockClientUser));
    vi.mocked(messagesApi.listMyConversations).mockResolvedValue(emptyList);
    vi.mocked(messagesApi.getMyMessagesUnreadCount).mockResolvedValue({ unread_total: 0 });
    vi.mocked(meApi.listMyBookings).mockResolvedValue({ data: [], meta: { page: 1, limit: 50, total: 0 } });
    vi.mocked(meApi.listMyOrders).mockResolvedValue({ data: [], meta: { page: 1, limit: 50, total: 0 } });
  });

  it("renders empty state for signed-in client", async () => {
    renderRoute(<ClientMessagesPage />, { route: "/me/messages", path: "/me/messages" });
    expect(await screen.findByTestId("client-messages-page")).toBeInTheDocument();
    expect(await screen.findByTestId("client-messages-empty-state")).toBeInTheDocument();
  });

  it("sends a client message", async () => {
    const user = userEvent.setup();
    vi.mocked(messagesApi.listMyConversations).mockResolvedValue({
      items: [sampleConversation],
      meta: { total: 1, page: 1, limit: 50, unread_total: 1 },
    });
    vi.mocked(messagesApi.getMyConversation).mockResolvedValue({
      ...sampleDetail,
      messages: [
        {
          id: "msg-b",
          conversation_id: "conv-1",
          sender_type: "business",
          sender_user_id: null,
          body: "How can we help?",
          read_at: null,
          created_at: "2026-07-22T10:00:00Z",
        },
      ],
    });
    vi.mocked(messagesApi.sendMyMessage).mockResolvedValue({
      id: "msg-c",
      conversation_id: "conv-1",
      sender_type: "client",
      sender_user_id: "u1",
      body: "I need to reschedule",
      read_at: null,
      created_at: "2026-07-22T10:12:00Z",
    });

    renderRoute(<ClientMessagesPage />, { route: "/me/messages", path: "/me/messages" });

    await user.click(await screen.findByTestId("client-messages-conversation-row"));
    await user.type(await screen.findByPlaceholderText("Type your message…"), "I need to reschedule");
    await user.click(screen.getByTestId("client-messages-send"));

    await waitFor(() => {
      expect(messagesApi.sendMyMessage).toHaveBeenCalledWith("conv-1", "I need to reschedule");
    });
    await waitFor(() => {
      expect(screen.getByPlaceholderText("Type your message…")).toHaveFocus();
    });
    expect(screen.getByTestId("client-messages-attach-image")).toBeDisabled();
    expect(screen.getByTestId("client-messages-thread-scroll")).toHaveClass("overflow-y-auto");
    expect(screen.getByTestId("client-messages-composer-shell")).toBeInTheDocument();
    expect(screen.getByTestId("client-messages-thread-scroll")).not.toContainElement(
      screen.getByTestId("client-messages-composer-shell"),
    );
  });

  it("keeps client composer visible with a long thread", async () => {
    const user = userEvent.setup();
    const longThread = {
      ...sampleDetail,
      messages: Array.from({ length: 40 }, (_, index) => ({
        id: `msg-client-long-${index}`,
        conversation_id: "conv-1",
        sender_type: index % 2 === 0 ? ("business" as const) : ("client" as const),
        sender_user_id: index % 2 === 0 ? null : "u1",
        body: `Client thread message ${index + 1}`,
        read_at: null,
        created_at: `2026-07-22T11:${String(index).padStart(2, "0")}:00Z`,
      })),
    };
    vi.mocked(messagesApi.listMyConversations).mockResolvedValue({
      items: [sampleConversation],
      meta: { total: 1, page: 1, limit: 50, unread_total: 0 },
    });
    vi.mocked(messagesApi.getMyConversation).mockResolvedValue(longThread);

    renderRoute(<ClientMessagesPage />, { route: "/me/messages", path: "/me/messages" });

    await user.click(await screen.findByTestId("client-messages-conversation-row"));
    const scroll = await screen.findByTestId("client-messages-thread-scroll");
    const composerShell = screen.getByTestId("client-messages-composer-shell");
    expect(scroll).toBeInTheDocument();
    expect(composerShell).toBeInTheDocument();
    expect(scroll).not.toContainElement(composerShell);
    expect(screen.getByPlaceholderText("Type your message…")).toBeInTheDocument();
    expect(screen.getByTestId("client-messages-send")).toBeInTheDocument();
    expect(screen.getAllByTestId("client-messages-message-bubble")).toHaveLength(40);
  });

  it("sends client message when Enter is pressed", async () => {
    const user = userEvent.setup();
    vi.mocked(messagesApi.listMyConversations).mockResolvedValue({
      items: [sampleConversation],
      meta: { total: 1, page: 1, limit: 50, unread_total: 0 },
    });
    vi.mocked(messagesApi.getMyConversation).mockResolvedValue(sampleDetail);
    vi.mocked(messagesApi.sendMyMessage).mockResolvedValue({
      id: "msg-enter-client",
      conversation_id: "conv-1",
      sender_type: "client",
      sender_user_id: "u1",
      body: "Client enter send",
      read_at: null,
      created_at: "2026-07-22T10:12:00Z",
    });

    renderRoute(<ClientMessagesPage />, { route: "/me/messages", path: "/me/messages" });

    await user.click(await screen.findByTestId("client-messages-conversation-row"));
    const composer = await screen.findByPlaceholderText("Type your message…");
    await user.type(composer, "Client enter send");
    fireEvent.keyDown(composer, { key: "Enter", shiftKey: false });

    await waitFor(() => {
      expect(messagesApi.sendMyMessage).toHaveBeenCalledWith("conv-1", "Client enter send");
    });
  });

  it("inserts a newline in client composer with Shift+Enter", async () => {
    const user = userEvent.setup();
    vi.mocked(messagesApi.listMyConversations).mockResolvedValue({
      items: [sampleConversation],
      meta: { total: 1, page: 1, limit: 50, unread_total: 0 },
    });
    vi.mocked(messagesApi.getMyConversation).mockResolvedValue(sampleDetail);

    renderRoute(<ClientMessagesPage />, { route: "/me/messages", path: "/me/messages" });

    await user.click(await screen.findByTestId("client-messages-conversation-row"));
    const composer = await screen.findByPlaceholderText("Type your message…");
    await user.type(composer, "Hello{Shift>}{Enter}{/Shift}World");
    expect(composer).toHaveValue("Hello\nWorld");
    expect(messagesApi.sendMyMessage).not.toHaveBeenCalled();
  });

  it("shows floating button with unread badge on client area pages", async () => {
    vi.mocked(messagesApi.getMyMessagesUnreadCount).mockResolvedValue({ unread_total: 4 });

    renderRoute(
      <Routes>
        <Route element={<Layout />}>
          <Route path="me" element={<div>Account</div>} />
        </Route>
      </Routes>,
      { route: "/me", path: "/*" },
    );

    expect(await screen.findByTestId("client-floating-messages-button")).toBeInTheDocument();
    expect(await screen.findByTestId("client-floating-messages-unread-badge")).toHaveTextContent(
      "4",
    );
  });

  it("hides floating button on logged-out pages", () => {
    vi.mocked(useAuth).mockReturnValue({
      ...mockAuthenticatedAuth(mockClientUser),
      isAuthenticated: false,
      user: null,
    });

    renderRoute(
      <Routes>
        <Route element={<Layout />}>
          <Route path="login" element={<div>Login</div>} />
        </Route>
      </Routes>,
      { route: "/login", path: "/*" },
    );

    expect(screen.queryByTestId("client-floating-messages-button")).not.toBeInTheDocument();
  });

  it("hides floating button on messages page", async () => {
    renderRoute(
      <Routes>
        <Route element={<Layout />}>
          <Route path="me/messages" element={<div>Messages page</div>} />
        </Route>
      </Routes>,
      { route: "/me/messages", path: "/*" },
    );

    expect(screen.queryByTestId("client-floating-messages-button")).not.toBeInTheDocument();
  });

  it("hides floating button on public/legal Layout pages", () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockClientUser));

    renderRoute(
      <Routes>
        <Route element={<Layout />}>
          <Route path="legal/terms" element={<div>Terms</div>} />
        </Route>
      </Routes>,
      { route: "/legal/terms", path: "/*" },
    );

    expect(screen.queryByTestId("client-floating-messages-button")).not.toBeInTheDocument();
  });

  it("renders business logo avatar when logo_url is present", async () => {
    const withLogo = {
      ...sampleConversation,
      business: {
        ...sampleConversation.business!,
        logo_url: "/uploads/businesses/demo/logo.webp",
      },
    };
    vi.mocked(messagesApi.listMyConversations).mockResolvedValue({
      items: [withLogo],
      meta: { total: 1, page: 1, limit: 50, unread_total: 0 },
    });
    vi.mocked(messagesApi.getMyConversation).mockResolvedValue({
      ...sampleDetail,
      business: withLogo.business,
    });

    renderRoute(<ClientMessagesPage />, { route: "/me/messages", path: "/me/messages" });

    const avatar = await screen.findByTestId("client-messages-business-avatar");
    expect(avatar).toHaveAttribute("src", "/uploads/businesses/demo/logo.webp");
    expect(avatar).toHaveAttribute("alt", "Demo Business logo");
    expect(screen.queryByTestId("client-messages-business-avatar-fallback")).not.toBeInTheDocument();

    await userEvent.setup().click(screen.getByTestId("client-messages-conversation-row"));
    expect(await screen.findByTestId("client-messages-thread-business-avatar")).toHaveAttribute(
      "src",
      "/uploads/businesses/demo/logo.webp",
    );
  });

  it("falls back to initials when business logo is missing", async () => {
    vi.mocked(messagesApi.listMyConversations).mockResolvedValue({
      items: [sampleConversation],
      meta: { total: 1, page: 1, limit: 50, unread_total: 0 },
    });

    renderRoute(<ClientMessagesPage />, { route: "/me/messages", path: "/me/messages" });

    expect(await screen.findByTestId("client-messages-business-avatar-fallback")).toHaveTextContent(
      "DB",
    );
    expect(screen.queryByTestId("client-messages-business-avatar")).not.toBeInTheDocument();
  });
});
