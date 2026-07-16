import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as authApi from "@/api/authApi";
import * as publicApi from "@/api/publicApi";
import { RegisterPage } from "@/pages/RegisterPage";
import { BookingPage } from "@/pages/BookingPage";
import { OrderRequestPage } from "@/pages/OrderRequestPage";
import {
  LEGAL_CONSENT_ERROR_MESSAGE,
  LegalConsentCheckbox,
} from "@/components/LegalConsentCheckbox";
import {
  BOOKING_SERVICE_ID,
  DEMO_SLUG,
  ORDER_SERVICE_ID,
  mockBookingService,
  mockOrderService,
} from "@/test/mock-fixtures";
import { renderRoute } from "@/test/test-utils";
import { generateBookingDates } from "@/utils/format";

vi.mock("@/api/authApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/authApi")>();
  return {
    ...actual,
    register: vi.fn(),
  };
});

vi.mock("@/api/publicApi");

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function getConsentCheckbox() {
  return screen.getByRole("checkbox", { name: /acknowledge the draft privacy policy/i });
}

async function acceptLegalConsent(user: ReturnType<typeof userEvent.setup>) {
  await user.click(getConsentCheckbox());
}

async function fillRegisterForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/full name/i), "New Owner");
  await user.type(screen.getByLabelText(/^email$/i), "owner@new.com");
  await user.type(screen.getByLabelText(/password/i), "ChangeMe123!");
  await user.type(screen.getByLabelText(/business name/i), "New Biz");
  await user.type(screen.getByLabelText(/business slug/i), "new-biz");
}

describe("LegalConsentCheckbox", () => {
  it("renders legal links and draft notice", () => {
    const onChange = vi.fn();
    renderRoute(
      <LegalConsentCheckbox id="test-consent" checked={false} onChange={onChange} />,
      { route: "/", path: "/" },
    );

    expect(getConsentCheckbox()).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
      "href",
      "/legal/privacy",
    );
    expect(screen.getByRole("link", { name: "Personal Data Consent" })).toHaveAttribute(
      "href",
      "/legal/consent",
    );
    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/legal/terms");
    expect(
      screen.getByText(/draft legal pages — final text pending review before public launch/i),
    ).toBeInTheDocument();
  });
});

describe("registration consent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows consent checkbox and legal links", () => {
    renderRoute(<RegisterPage />, { route: "/register", path: "/register" });

    expect(getConsentCheckbox()).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
      "href",
      "/legal/privacy",
    );
    expect(screen.getByRole("link", { name: "Personal Data Consent" })).toHaveAttribute(
      "href",
      "/legal/consent",
    );
  });

  it("blocks submit without consent and does not call API", async () => {
    const user = userEvent.setup();
    renderRoute(<RegisterPage />, { route: "/register", path: "/register" });

    await fillRegisterForm(user);
    await user.click(screen.getByRole("button", { name: /create business account/i }));

    expect(await screen.findByText(LEGAL_CONSENT_ERROR_MESSAGE)).toBeInTheDocument();
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it("submits when consent is checked", async () => {
    const user = userEvent.setup();
    vi.mocked(authApi.register).mockResolvedValue({
      user: {
        id: "user-1",
        email: "owner@new.com",
        full_name: "New Owner",
        role: "business_admin",
      },
      business: { id: "biz-1", name: "New Biz", slug: "new-biz" },
      tokens: {
        access_token: "access",
        refresh_token: "refresh",
        token_type: "bearer",
        expires_in: 3600,
      },
    });

    renderRoute(<RegisterPage />, { route: "/register", path: "/register" });

    await fillRegisterForm(user);
    await acceptLegalConsent(user);
    await user.click(screen.getByRole("button", { name: /create business account/i }));

    await waitFor(() => {
      expect(authApi.register).toHaveBeenCalledWith(
        expect.objectContaining({ legal_consent_accepted: true }),
      );
    });
    expect(mockNavigate).toHaveBeenCalledWith("/check-email");
  });
});

describe("order request consent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(publicApi.getPublicService).mockResolvedValue(mockOrderService);
  });

  it("shows consent checkbox and legal links", async () => {
    renderRoute(<OrderRequestPage />, {
      route: `/b/${DEMO_SLUG}/services/${ORDER_SERVICE_ID}/request`,
      path: "/b/:slug/services/:serviceId/request",
    });

    expect(await screen.findByRole("heading", { level: 1, name: mockOrderService.name })).toBeInTheDocument();
    expect(getConsentCheckbox()).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
      "href",
      "/legal/privacy",
    );
  });

  it("blocks submit without consent", async () => {
    const user = userEvent.setup();
    renderRoute(<OrderRequestPage />, {
      route: `/b/${DEMO_SLUG}/services/${ORDER_SERVICE_ID}/request`,
      path: "/b/:slug/services/:serviceId/request",
    });

    await screen.findByRole("heading", { level: 1, name: mockOrderService.name });
    await user.type(screen.getByLabelText(/full name/i), "Test Client");
    await user.type(screen.getByLabelText(/^email$/i), "client@example.com");
    await user.type(screen.getByLabelText(/what do you need/i), "Need a bot");
    await user.click(screen.getByRole("button", { name: "Send request" }));

    expect(await screen.findByText(LEGAL_CONSENT_ERROR_MESSAGE)).toBeInTheDocument();
    expect(publicApi.createPublicOrder).not.toHaveBeenCalled();
  });

  it("creates order when consent is checked", async () => {
    const user = userEvent.setup();
    vi.mocked(publicApi.createPublicOrder).mockResolvedValue({
      id: "order-1",
      reference: "ORD-TEST-001",
      status: "submitted",
      service: { id: ORDER_SERVICE_ID, name: mockOrderService.name, type: "order" },
      client: {
        id: "client-1",
        full_name: "Test Client",
        email: "client@example.com",
        phone: null,
      },
      form_data: { details: "Need a bot" },
      created_at: "2026-07-03T10:00:00Z",
      payment_required: false,
      payment: null,
    });

    renderRoute(<OrderRequestPage />, {
      route: `/b/${DEMO_SLUG}/services/${ORDER_SERVICE_ID}/request`,
      path: "/b/:slug/services/:serviceId/request",
    });

    await screen.findByRole("heading", { level: 1, name: mockOrderService.name });
    await user.type(screen.getByLabelText(/full name/i), "Test Client");
    await user.type(screen.getByLabelText(/^email$/i), "client@example.com");
    await user.type(screen.getByLabelText(/what do you need/i), "Need a bot");
    await acceptLegalConsent(user);
    await user.click(screen.getByRole("button", { name: "Send request" }));

    await waitFor(() => {
      expect(publicApi.createPublicOrder).toHaveBeenCalledWith(
        DEMO_SLUG,
        expect.objectContaining({ legal_consent_accepted: true }),
      );
    });
    expect(await screen.findByText("Thank you!")).toBeInTheDocument();
  });
});

describe("booking consent", () => {
  const defaultDate = generateBookingDates(1)[0]!.date;
  const slotStartsAt = `${defaultDate}T10:00:00`;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(publicApi.getPublicService).mockResolvedValue(mockBookingService);
    vi.mocked(publicApi.getAvailability).mockResolvedValue({
      date: defaultDate,
      service_id: BOOKING_SERVICE_ID,
      slots: [{ starts_at: slotStartsAt, ends_at: `${defaultDate}T11:00:00` }],
    });
  });

  async function selectFirstSlot(user: ReturnType<typeof userEvent.setup>) {
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /10:00/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /10:00/i }));
  }

  it("shows consent checkbox after slot selection", async () => {
    const user = userEvent.setup();
    renderRoute(<BookingPage />, {
      route: `/b/${DEMO_SLUG}/services/${BOOKING_SERVICE_ID}/book`,
      path: "/b/:slug/services/:serviceId/book",
    });

    expect(await screen.findByRole("heading", { level: 1, name: mockBookingService.name })).toBeInTheDocument();
    await selectFirstSlot(user);

    expect(getConsentCheckbox()).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Personal Data Consent" })).toHaveAttribute(
      "href",
      "/legal/consent",
    );
  });

  it("blocks submit without consent", async () => {
    const user = userEvent.setup();
    renderRoute(<BookingPage />, {
      route: `/b/${DEMO_SLUG}/services/${BOOKING_SERVICE_ID}/book`,
      path: "/b/:slug/services/:serviceId/book",
    });

    await screen.findByRole("heading", { level: 1, name: mockBookingService.name });
    await selectFirstSlot(user);
    await user.type(screen.getByLabelText(/full name/i), "Test Client");
    await user.type(screen.getByLabelText(/^email$/i), "client@example.com");
    await user.click(screen.getByRole("button", { name: "Confirm booking" }));

    expect(await screen.findByText(LEGAL_CONSENT_ERROR_MESSAGE)).toBeInTheDocument();
    expect(publicApi.createPublicBooking).not.toHaveBeenCalled();
  });

  it("creates booking when consent is checked", async () => {
    const user = userEvent.setup();
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
    await user.click(screen.getByRole("button", { name: "Confirm booking" }));

    await waitFor(() => {
      expect(publicApi.createPublicBooking).toHaveBeenCalledWith(
        DEMO_SLUG,
        expect.objectContaining({ legal_consent_accepted: true }),
      );
    });
    expect(await screen.findByText("Booking received")).toBeInTheDocument();
  });
});
