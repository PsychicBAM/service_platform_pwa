import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminServiceImageSection } from "@/components/admin/AdminServiceImageSection";
import { ServiceCard } from "@/components/ServiceCard";
import { ServiceDetailPage } from "@/pages/ServiceDetailPage";
import * as serviceImageApi from "@/api/serviceImageApi";
import * as publicApi from "@/api/publicApi";
import { CleanServicesSection } from "@/components/public/CleanProMiniSiteSections";
import {
  resolveServiceImageCardUrl,
  resolveServiceImagePreviewUrl,
  resolveServiceImageUrl,
} from "@/lib/serviceImage";
import type { PublicService } from "@/types/api";
import { DEMO_SLUG, mockBookingService, BOOKING_SERVICE_ID } from "@/test/mock-fixtures";
import { renderRoute } from "@/test/test-utils";

vi.mock("@/api/serviceImageApi", () => ({
  uploadServiceImage: vi.fn(),
  removeServiceImage: vi.fn(),
}));

vi.mock("@/api/publicApi", () => ({
  getPublicService: vi.fn(),
}));

const mockImage = {
  kind: "image" as const,
  url: "/uploads/services/biz-1/svc-1/abc.webp",
  thumbnailUrl: "/uploads/services/biz-1/svc-1/abc_thumb.webp",
  alt: "",
  filename: "photo.jpg",
  contentType: "image/webp",
  size: 1200,
  originalSize: 4500,
  width: 1200,
  height: 800,
};

describe("serviceImage URL helpers", () => {
  it("keeps upload paths root-relative for nginx and vite proxy", () => {
    expect(resolveServiceImageUrl("/uploads/services/biz/svc/file.webp")).toBe(
      "/uploads/services/biz/svc/file.webp",
    );
    expect(resolveServiceImagePreviewUrl(mockImage)).toBe(
      "/uploads/services/biz-1/svc-1/abc_thumb.webp",
    );
    expect(resolveServiceImageCardUrl(mockImage)).toBe(
      "/uploads/services/biz-1/svc-1/abc.webp",
    );
  });
});

describe("AdminServiceImageSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows choosing a pending image while creating a service", () => {
    renderRoute(
      <AdminServiceImageSection
        businessId="biz-1"
        image={null}
        pendingFile={null}
        onPendingFileChange={() => undefined}
        onImageChange={() => undefined}
      />,
    );

    expect(screen.getByText("Service image")).toBeInTheDocument();
    expect(screen.getByText("JPG, PNG, or WebP up to 12 MB.")).toBeInTheDocument();
    expect(screen.getByTestId("admin-service-image-upload")).toHaveTextContent("Choose image");
    expect(screen.getByTestId("admin-service-image-create-note")).toHaveTextContent(
      "The image uploads automatically after you create the service.",
    );
  });

  it("shows compact status and upload/remove controls for saved service", () => {
    renderRoute(
      <AdminServiceImageSection
        businessId="biz-1"
        serviceId="svc-1"
        image={mockImage}
        onImageChange={() => undefined}
      />,
    );

    expect(screen.getByTestId("admin-service-image-status")).toHaveTextContent("photo.jpg");
    expect(screen.getByTestId("admin-service-image-upload")).toHaveTextContent("Replace");
    expect(screen.getByTestId("admin-service-image-remove")).toBeInTheDocument();
    expect(screen.getByTestId("admin-service-image-thumb")).toHaveAttribute(
      "src",
      "/uploads/services/biz-1/svc-1/abc_thumb.webp",
    );
  });

  it("stores pending file selection in create mode", async () => {
    const user = userEvent.setup();
    const onPendingFileChange = vi.fn();

    renderRoute(
      <AdminServiceImageSection
        businessId="biz-1"
        image={null}
        pendingFile={null}
        onPendingFileChange={onPendingFileChange}
        onImageChange={() => undefined}
      />,
    );

    const file = new File(["image"], "photo.jpg", { type: "image/jpeg" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    expect(onPendingFileChange).toHaveBeenCalledWith(file);
    expect(serviceImageApi.uploadServiceImage).not.toHaveBeenCalled();
  });

  it("upload success updates service image UI via callback", async () => {
    const user = userEvent.setup();
    const onImageChange = vi.fn();
    vi.mocked(serviceImageApi.uploadServiceImage).mockResolvedValue({
      service_id: "svc-1",
      image: mockImage,
    });

    renderRoute(
      <AdminServiceImageSection
        businessId="biz-1"
        serviceId="svc-1"
        image={null}
        onImageChange={onImageChange}
      />,
    );

    const file = new File(["image"], "photo.jpg", { type: "image/jpeg" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    expect(serviceImageApi.uploadServiceImage).toHaveBeenCalledWith("biz-1", "svc-1", file);
    expect(onImageChange).toHaveBeenCalledWith(mockImage);
  });

  it("remove clears service image UI via callback", async () => {
    const user = userEvent.setup();
    const onImageChange = vi.fn();
    vi.mocked(serviceImageApi.removeServiceImage).mockResolvedValue(undefined);

    renderRoute(
      <AdminServiceImageSection
        businessId="biz-1"
        serviceId="svc-1"
        image={mockImage}
        onImageChange={onImageChange}
      />,
    );

    await user.click(screen.getByTestId("admin-service-image-remove"));

    expect(serviceImageApi.removeServiceImage).toHaveBeenCalledWith("biz-1", "svc-1");
    expect(onImageChange).toHaveBeenCalledWith(null);
  });
});

describe("public service image rendering", () => {
  const serviceWithImage: PublicService = {
    ...mockBookingService,
    image: mockImage,
  };

  it("renders service image on standard public service card", () => {
    renderRoute(<ServiceCard slug={DEMO_SLUG} service={serviceWithImage} />);

    expect(screen.getByTestId("service-card-image-area")).toBeInTheDocument();
    const image = screen.getByTestId("service-card-image");
    expect(image).toHaveAttribute("src", "/uploads/services/biz-1/svc-1/abc.webp");
    expect(screen.getByRole("heading", { name: serviceWithImage.name })).toBeInTheDocument();
    expect(screen.getByTestId("service-card-cta")).toBeInTheDocument();
  });

  it("renders service image on public service detail page", async () => {
    vi.mocked(publicApi.getPublicService).mockResolvedValue(serviceWithImage);

    renderRoute(<ServiceDetailPage />, {
      route: `/b/${DEMO_SLUG}/services/${BOOKING_SERVICE_ID}`,
      path: "/b/:slug/services/:serviceId",
    });

    expect(await screen.findByTestId("service-detail-image")).toHaveAttribute(
      "src",
      "/uploads/services/biz-1/svc-1/abc.webp",
    );
  });
});

describe("CleanServicesSection per-service images", () => {
  const serviceWithoutImage: PublicService = {
    id: "svc-no-image",
    name: "Standard Clean",
    description: "Regular cleaning.",
    type: "booking",
    duration_minutes: 30,
    price_cents: 3000,
    currency: "USD",
    price_type: "fixed",
    require_payment: false,
    sort_order: 2,
    image: null,
  };

  const cleanTheme = {
    primaryColor: "#2563eb",
    accentColor: "#0ea5e9",
    backgroundStyle: "light" as const,
  };

  it("renders per-service images on service cards", () => {
    renderRoute(
      <CleanServicesSection
        title="Our services"
        badgeText={null}
        services={[
          {
            ...mockBookingService,
            image: mockImage,
          },
          serviceWithoutImage,
        ]}
        publicSlug="demo-business"
        theme={cleanTheme}
        isDark={false}
      />,
    );

    expect(screen.getByTestId("service-card-image-area")).toBeInTheDocument();
    expect(screen.getByTestId("service-card-image")).toHaveAttribute(
      "src",
      "/uploads/services/biz-1/svc-1/abc.webp",
    );
    expect(screen.getAllByTestId("service-card")).toHaveLength(2);
  });

  it("does not render shared servicesImage as a fake service card", () => {
    renderRoute(
      <CleanServicesSection
        title="Our services"
        badgeText={null}
        services={[serviceWithoutImage]}
        publicSlug="demo-business"
        theme={cleanTheme}
        isDark={false}
        templateImages={{
          servicesImage: {
            kind: "image",
            url: "/uploads/mini_site/biz-1/shared.webp",
            thumbnailUrl: "/uploads/mini_site/biz-1/shared_thumb.webp",
            alt: "Shared accent",
            filename: "shared.webp",
            contentType: "image/webp",
            size: 1000,
            originalSize: 2000,
            width: 1200,
            height: 800,
          },
        }}
      />,
    );

    expect(screen.getByTestId("pro-mini-site-template-servicesImage")).toBeInTheDocument();
    expect(screen.getAllByTestId("service-card")).toHaveLength(1);
    expect(screen.queryByTestId("service-card-image")).not.toBeInTheDocument();
  });
});
