import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookingPage } from "@/pages/BookingPage";
import { OrderRequestPage } from "@/pages/OrderRequestPage";
import { AdminBookingsPage } from "@/pages/admin/AdminBookingsPage";
import { AdminOrdersPage } from "@/pages/admin/AdminOrdersPage";
import { AdminBusinessProvider } from "@/hooks/useAdminBusiness";
import { useAuth } from "@/hooks/useAuth";
import * as publicApi from "@/api/publicApi";
import * as adminApi from "@/api/adminApi";
import { ApiClientError } from "@/api/client";
import {
  BOOKING_SERVICE_ID,
  BUSINESS_ID,
  DEMO_SLUG,
  ORDER_SERVICE_ID,
  emptyListMeta,
  mockBookingService,
  mockOwnerUser,
  mockOrderService,
} from "@/test/mock-fixtures";
import { mockAuthenticatedAuth, mockUnauthenticatedAuth, renderRoute } from "@/test/test-utils";
import { generateBookingDates } from "@/utils/format";

vi.mock("@/hooks/useAuth");
vi.mock("@/api/publicApi");
vi.mock("@/api/adminApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/adminApi")>();
  return {
    ...actual,
    listAdminBookings: vi.fn(),
    listAdminOrders: vi.fn(),
    listWaitlistEntries: vi.fn(),
    sendReviewRequestEmail: vi.fn(),
    createReviewRequestLink: vi.fn(),
  };
});

async function acceptLegalConsent(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole("checkbox", { name: /acknowledge the draft privacy policy/i }),
  );
}

describe("follow-up email consent and review request email", () => {
  const defaultDate = generateBookingDates(1)[0]!.date;
  const slotStartsAt = `${defaultDate}T10:00:00`;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue(mockUnauthenticatedAuth());
    vi.mocked(adminApi.listWaitlistEntries).mockResolvedValue({ data: [] });
  });

  async function selectFirstSlot(user: ReturnType<typeof userEvent.setup>) {
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /10:00/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /10:00/i }));
  }

  it("booking form shows follow-up consent unchecked by default and submits false", async () => {
    const user = userEvent.setup();
    vi.mocked(publicApi.getPublicService).mockResolvedValue(mockBookingService);
    vi.mocked(publicApi.getAvailability).mockResolvedValue({
      date: defaultDate,
      service_id: BOOKING_SERVICE_ID,
      slots: [{ starts_at: slotStartsAt, ends_at: `${defaultDate}T11:00:00` }],
    });
    vi.mocked(publicApi.createPublicBooking).mockResolvedValue({
      id: "booking-1",
      reference: "BKG-TEST-001",
      status: "pending",
      starts_at: slotStartsAt,
      ends_at: `${defaultDate}T11:00:00`,
      service: { id: BOOKING_SERVICE_ID, name: mockBookingService.name, type: "booking" },
      client: {
        id: "client-1",
        full_name: "Test Client",
        email: "client@example.com",
        phone: null,
      },
      payment_required: false,
      payment: null,
    });

    renderRoute(<BookingPage />, {
      route: `/b/${DEMO_SLUG}/services/${BOOKING_SERVICE_ID}/book`,
      path: "/b/:slug/services/:serviceId/book",
    });

    await screen.findByRole("heading", { level: 1, name: mockBookingService.name });
    await selectFirstSlot(user);

    const consent = screen.getByTestId("follow-up-email-consent-checkbox");
    expect(consent).not.toBeChecked();

    await user.type(screen.getByLabelText(/full name/i), "Test Client");
    await user.type(screen.getByLabelText(/^email$/i), "client@example.com");
    await acceptLegalConsent(user);
    await user.click(screen.getByRole("button", { name: "Confirm booking" }));

    await waitFor(() => {
      expect(publicApi.createPublicBooking).toHaveBeenCalledWith(
        DEMO_SLUG,
        expect.objectContaining({ follow_up_email_consent: false }),
      );
    });
  });

  it("booking form sends follow_up_email_consent true when checked", async () => {
    const user = userEvent.setup();
    vi.mocked(publicApi.getPublicService).mockResolvedValue(mockBookingService);
    vi.mocked(publicApi.getAvailability).mockResolvedValue({
      date: defaultDate,
      service_id: BOOKING_SERVICE_ID,
      slots: [{ starts_at: slotStartsAt, ends_at: `${defaultDate}T11:00:00` }],
    });
    vi.mocked(publicApi.createPublicBooking).mockResolvedValue({
      id: "booking-1",
      reference: "BKG-TEST-001",
      status: "pending",
      starts_at: slotStartsAt,
      ends_at: `${defaultDate}T11:00:00`,
      service: { id: BOOKING_SERVICE_ID, name: mockBookingService.name, type: "booking" },
      client: {
        id: "client-1",
        full_name: "Test Client",
        email: "client@example.com",
        phone: null,
      },
      payment_required: false,
      payment: null,
    });

    renderRoute(<BookingPage />, {
      route: `/b/${DEMO_SLUG}/services/${BOOKING_SERVICE_ID}/book`,
      path: "/b/:slug/services/:serviceId/book",
    });

    await screen.findByRole("heading", { level: 1, name: mockBookingService.name });
    await selectFirstSlot(user);
    await user.type(screen.getByLabelText(/full name/i), "Test Client");
    await user.type(screen.getByLabelText(/^email$/i), "client@example.com");
    await acceptLegalConsent(user);
    await user.click(screen.getByTestId("follow-up-email-consent-checkbox"));
    await user.click(screen.getByRole("button", { name: "Confirm booking" }));

    await waitFor(() => {
      expect(publicApi.createPublicBooking).toHaveBeenCalledWith(
        DEMO_SLUG,
        expect.objectContaining({ follow_up_email_consent: true }),
      );
    });
  });

  it("order form shows follow-up consent unchecked by default and submits false", async () => {
    const user = userEvent.setup();
    vi.mocked(publicApi.getPublicService).mockResolvedValue(mockOrderService);
    vi.mocked(publicApi.createPublicOrder).mockResolvedValue({
      id: "order-1",
      reference: "REQ-TEST-001",
      status: "submitted",
      form_data: { details: "Need help" },
      service: { id: ORDER_SERVICE_ID, name: mockOrderService.name, type: "order" },
      client: {
        id: "client-1",
        full_name: "Test Client",
        email: "client@example.com",
        phone: null,
      },
      created_at: "2026-06-30T10:00:00Z",
      payment_required: false,
      payment: null,
    });

    renderRoute(<OrderRequestPage />, {
      route: `/b/${DEMO_SLUG}/services/${ORDER_SERVICE_ID}/request`,
      path: "/b/:slug/services/:serviceId/request",
    });

    expect(await screen.findByTestId("follow-up-email-consent-checkbox")).not.toBeChecked();
    await user.type(screen.getByLabelText(/full name/i), "Test Client");
    await user.type(screen.getByLabelText(/^email$/i), "client@example.com");
    await user.type(screen.getByLabelText(/what do you need/i), "Need help with a project");
    await acceptLegalConsent(user);
    await user.click(screen.getByRole("button", { name: /send request/i }));

    await waitFor(() => {
      expect(publicApi.createPublicOrder).toHaveBeenCalledWith(
        DEMO_SLUG,
        expect.objectContaining({ follow_up_email_consent: false }),
      );
    });
  });

  it("order form sends follow_up_email_consent true when checked", async () => {
    const user = userEvent.setup();
    vi.mocked(publicApi.getPublicService).mockResolvedValue(mockOrderService);
    vi.mocked(publicApi.createPublicOrder).mockResolvedValue({
      id: "order-1",
      reference: "REQ-TEST-001",
      status: "submitted",
      form_data: { details: "Need help" },
      service: { id: ORDER_SERVICE_ID, name: mockOrderService.name, type: "order" },
      client: {
        id: "client-1",
        full_name: "Test Client",
        email: "client@example.com",
        phone: null,
      },
      created_at: "2026-06-30T10:00:00Z",
      payment_required: false,
      payment: null,
    });

    renderRoute(<OrderRequestPage />, {
      route: `/b/${DEMO_SLUG}/services/${ORDER_SERVICE_ID}/request`,
      path: "/b/:slug/services/:serviceId/request",
    });

    await screen.findByTestId("follow-up-email-consent-checkbox");
    await user.type(screen.getByLabelText(/full name/i), "Test Client");
    await user.type(screen.getByLabelText(/^email$/i), "client@example.com");
    await user.type(screen.getByLabelText(/what do you need/i), "Need help with a project");
    await acceptLegalConsent(user);
    await user.click(screen.getByTestId("follow-up-email-consent-checkbox"));
    await user.click(screen.getByRole("button", { name: /send request/i }));

    await waitFor(() => {
      expect(publicApi.createPublicOrder).toHaveBeenCalledWith(
        DEMO_SLUG,
        expect.objectContaining({ follow_up_email_consent: true }),
      );
    });
  });

  it("admin completed booking with consent shows send action and succeeds", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));
    vi.mocked(adminApi.listAdminBookings).mockResolvedValue({
      data: [
        {
          id: "booking-completed-consent",
          reference: "BKG-001",
          status: "completed",
          starts_at: "2026-06-20T10:00:00Z",
          ends_at: "2026-06-20T11:00:00Z",
          service_name: "Arabic Lesson",
          client_name: "Client Demo",
          client_email: "client@example.com",
          client_phone: null,
          has_review: false,
          can_review: true,
          follow_up_email_consent: true,
          review_request_email_sent_at: null,
        },
      ],
      meta: emptyListMeta,
    });
    vi.mocked(adminApi.sendReviewRequestEmail).mockResolvedValue({
      sent: true,
      dry_run: true,
      message: "Review request sent.",
      message_code: "EMAIL_DRY_RUN",
    });

    renderRoute(
      <AdminBusinessProvider businesses={mockOwnerUser.businesses}>
        <AdminBookingsPage />
      </AdminBusinessProvider>,
      { route: "/admin/bookings", path: "/admin/bookings" },
    );

    await user.click(await screen.findByTestId("admin-booking-actions-menu"));
    expect(await screen.findByTestId("admin-booking-actions-menu-panel")).toBeInTheDocument();
    await user.click(await screen.findByTestId("send-review-request-button"));
    await waitFor(() => {
      expect(adminApi.sendReviewRequestEmail).toHaveBeenCalledWith(BUSINESS_ID, {
        booking_id: "booking-completed-consent",
      });
    });
    expect(await screen.findByTestId("send-review-request-success")).toHaveTextContent(
      "Review request sent.",
    );
  });

  it("admin completed booking shows sent state when email already sent", async () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));
    vi.mocked(adminApi.listAdminBookings).mockResolvedValue({
      data: [
        {
          id: "booking-completed-sent",
          reference: "BKG-SENT",
          status: "completed",
          starts_at: "2026-06-20T10:00:00Z",
          ends_at: "2026-06-20T11:00:00Z",
          service_name: "Arabic Lesson",
          client_name: "Client Demo",
          client_email: "client@example.com",
          client_phone: null,
          has_review: false,
          can_review: true,
          follow_up_email_consent: true,
          review_request_email_sent_at: "2026-06-21T12:00:00Z",
        },
      ],
      meta: emptyListMeta,
    });

    renderRoute(
      <AdminBusinessProvider businesses={mockOwnerUser.businesses}>
        <AdminBookingsPage />
      </AdminBusinessProvider>,
      { route: "/admin/bookings", path: "/admin/bookings" },
    );

    expect(await screen.findByTestId("review-request-email-sent")).toHaveTextContent(
      "Review request sent",
    );
    expect(screen.queryByTestId("send-review-request-button")).not.toBeInTheDocument();
  });

  it("admin completed booking without consent shows note", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));
    vi.mocked(adminApi.listAdminBookings).mockResolvedValue({
      data: [
        {
          id: "booking-completed-no-consent",
          reference: "BKG-002",
          status: "completed",
          starts_at: "2026-06-20T10:00:00Z",
          ends_at: "2026-06-20T11:00:00Z",
          service_name: "Arabic Lesson",
          client_name: "Client Demo",
          client_email: "client@example.com",
          client_phone: null,
          has_review: false,
          can_review: true,
          follow_up_email_consent: false,
          review_request_email_sent_at: null,
        },
      ],
      meta: emptyListMeta,
    });

    renderRoute(
      <AdminBusinessProvider businesses={mockOwnerUser.businesses}>
        <AdminBookingsPage />
      </AdminBusinessProvider>,
      { route: "/admin/bookings", path: "/admin/bookings" },
    );

    await user.click(await screen.findByTestId("admin-booking-actions-menu"));
    expect(await screen.findByTestId("admin-booking-actions-menu-panel")).toBeInTheDocument();
    expect(await screen.findByTestId("send-review-request-disabled-note")).toHaveTextContent(
      "Client did not agree to follow-up emails.",
    );
    expect(screen.queryByTestId("send-review-request-button")).not.toBeInTheDocument();
  });

  it("admin pending booking does not show send review request", async () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));
    vi.mocked(adminApi.listAdminBookings).mockResolvedValue({
      data: [
        {
          id: "booking-pending",
          reference: "BKG-003",
          status: "pending",
          starts_at: "2026-06-23T10:00:00Z",
          ends_at: "2026-06-23T11:00:00Z",
          service_name: "Arabic Lesson",
          client_name: "Client Demo",
          client_email: "client@example.com",
          client_phone: null,
          has_review: false,
          can_review: false,
          follow_up_email_consent: true,
          review_request_email_sent_at: null,
        },
      ],
      meta: emptyListMeta,
    });

    renderRoute(
      <AdminBusinessProvider businesses={mockOwnerUser.businesses}>
        <AdminBookingsPage />
      </AdminBusinessProvider>,
      { route: "/admin/bookings", path: "/admin/bookings" },
    );

    expect(await screen.findByText("BKG-003")).toBeInTheDocument();
    expect(screen.queryByTestId("send-review-request-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("send-review-request-disabled-note")).not.toBeInTheDocument();
  });

  it("admin completed order with consent can send review request", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));
    vi.mocked(adminApi.listAdminOrders).mockResolvedValue({
      data: [
        {
          id: "order-completed-consent",
          reference: "ORD-001",
          status: "completed",
          service_name: "Build Telegram Bot",
          client_name: "Client Demo",
          client_email: "client@example.com",
          client_phone: null,
          created_at: "2026-06-20T10:00:00Z",
          updated_at: "2026-06-20T12:00:00Z",
          has_review: false,
          can_review: true,
          follow_up_email_consent: true,
          review_request_email_sent_at: null,
        },
      ],
      meta: emptyListMeta,
    });
    vi.mocked(adminApi.sendReviewRequestEmail).mockResolvedValue({
      sent: true,
      dry_run: false,
      message: "Review request sent.",
      message_code: "EMAIL_SENT",
    });

    renderRoute(
      <AdminBusinessProvider businesses={mockOwnerUser.businesses}>
        <AdminOrdersPage />
      </AdminBusinessProvider>,
      { route: "/admin/orders", path: "/admin/orders" },
    );

    await user.click(await screen.findByTestId("send-review-request-button"));
    await waitFor(() => {
      expect(adminApi.sendReviewRequestEmail).toHaveBeenCalledWith(BUSINESS_ID, {
        order_id: "order-completed-consent",
      });
    });
    expect(await screen.findByTestId("send-review-request-success")).toHaveTextContent(
      "Review request sent.",
    );
  });

  it("admin completed order without consent shows note", async () => {
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));
    vi.mocked(adminApi.listAdminOrders).mockResolvedValue({
      data: [
        {
          id: "order-completed-no-consent",
          reference: "ORD-002",
          status: "completed",
          service_name: "Build Telegram Bot",
          client_name: "Client Demo",
          client_email: "client@example.com",
          client_phone: null,
          created_at: "2026-06-20T10:00:00Z",
          updated_at: "2026-06-20T12:00:00Z",
          has_review: false,
          can_review: true,
          follow_up_email_consent: false,
          review_request_email_sent_at: null,
        },
      ],
      meta: emptyListMeta,
    });

    renderRoute(
      <AdminBusinessProvider businesses={mockOwnerUser.businesses}>
        <AdminOrdersPage />
      </AdminBusinessProvider>,
      { route: "/admin/orders", path: "/admin/orders" },
    );

    expect(await screen.findByTestId("send-review-request-disabled-note")).toHaveTextContent(
      "Client did not agree to follow-up emails.",
    );
  });

  it("shows friendly API error when send fails", async () => {
    const user = userEvent.setup();
    vi.mocked(useAuth).mockReturnValue(mockAuthenticatedAuth(mockOwnerUser));
    vi.mocked(adminApi.listAdminBookings).mockResolvedValue({
      data: [
        {
          id: "booking-completed-consent",
          reference: "BKG-001",
          status: "completed",
          starts_at: "2026-06-20T10:00:00Z",
          ends_at: "2026-06-20T11:00:00Z",
          service_name: "Arabic Lesson",
          client_name: "Client Demo",
          client_email: "client@example.com",
          client_phone: null,
          has_review: false,
          can_review: true,
          follow_up_email_consent: true,
          review_request_email_sent_at: null,
        },
      ],
      meta: emptyListMeta,
    });
    vi.mocked(adminApi.sendReviewRequestEmail).mockRejectedValue(
      new ApiClientError(400, "VALIDATION_ERROR", "This client did not agree to follow-up emails."),
    );

    renderRoute(
      <AdminBusinessProvider businesses={mockOwnerUser.businesses}>
        <AdminBookingsPage />
      </AdminBusinessProvider>,
      { route: "/admin/bookings", path: "/admin/bookings" },
    );

    await user.click(await screen.findByTestId("admin-booking-actions-menu"));
    expect(await screen.findByTestId("admin-booking-actions-menu-panel")).toBeInTheDocument();
    await user.click(await screen.findByTestId("send-review-request-button"));
    expect(
      await screen.findByText("This client did not agree to follow-up emails."),
    ).toBeInTheDocument();
  });
});
