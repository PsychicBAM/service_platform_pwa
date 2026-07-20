import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiClientError } from "@/api/client";
import * as businessLogoImageApi from "@/api/businessLogoImageApi";
import { AdminBusinessLogoUpload } from "@/components/admin/AdminBusinessLogoUpload";
import { BUSINESS_ID } from "@/test/mock-fixtures";
import { renderRoute } from "@/test/test-utils";

vi.mock("@/api/businessLogoImageApi");

const LOGO_URL = "/uploads/businesses/test/logo/logo.webp";

describe("AdminBusinessLogoUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows upload UI without logo URL text input", () => {
    renderRoute(
      <AdminBusinessLogoUpload
        businessId={BUSINESS_ID}
        logoUrl=""
        onLogoUrlChange={vi.fn()}
      />,
      { route: "/admin/settings", path: "/admin/settings" },
    );

    expect(screen.getByTestId("admin-business-logo-upload")).toBeInTheDocument();
    expect(screen.getByTestId("admin-business-logo-avatar")).toBeInTheDocument();
    expect(screen.getByTestId("admin-business-logo-placeholder")).toBeInTheDocument();
    expect(screen.getByTestId("admin-business-logo-upload-button")).toHaveTextContent("Upload logo");
    expect(screen.getByTestId("admin-business-logo-hint")).toHaveTextContent(/marketplace cover/i);
    expect(screen.getByTestId("admin-business-logo-hint")).toHaveTextContent(/JPG, PNG, or WebP/i);
    expect(screen.queryByLabelText(/logo image url/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/https/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    const input = screen.getByTestId("admin-business-logo-file-input") as HTMLInputElement;
    expect(input).toHaveAttribute("type", "file");
    expect(input.accept).toContain("image/jpeg");
    expect(input.accept).toContain("image/png");
    expect(input.accept).toContain("image/webp");
  });

  it("shows change and remove when logo exists", () => {
    renderRoute(
      <AdminBusinessLogoUpload
        businessId={BUSINESS_ID}
        logoUrl={LOGO_URL}
        onLogoUrlChange={vi.fn()}
      />,
      { route: "/admin/settings", path: "/admin/settings" },
    );

    expect(screen.getByTestId("admin-business-logo-preview")).toHaveAttribute("src", LOGO_URL);
    expect(screen.getByTestId("admin-business-logo-upload-button")).toHaveTextContent("Change logo");
    expect(screen.getByTestId("admin-business-logo-remove")).toHaveTextContent("Remove logo");
    expect(screen.queryByLabelText(/logo image url/i)).not.toBeInTheDocument();
  });

  it("successful upload updates preview via callback and shows success", async () => {
    const onLogoUrlChange = vi.fn();
    vi.mocked(businessLogoImageApi.uploadBusinessLogoImage).mockResolvedValue({
      logo_url: LOGO_URL,
    });
    const user = userEvent.setup();

    renderRoute(
      <AdminBusinessLogoUpload
        businessId={BUSINESS_ID}
        logoUrl=""
        onLogoUrlChange={onLogoUrlChange}
      />,
      { route: "/admin/settings", path: "/admin/settings" },
    );

    const file = new File(["logo"], "logo.png", { type: "image/png" });
    await user.upload(screen.getByTestId("admin-business-logo-file-input"), file);

    await waitFor(() => {
      expect(businessLogoImageApi.uploadBusinessLogoImage).toHaveBeenCalledWith(BUSINESS_ID, file);
      expect(onLogoUrlChange).toHaveBeenCalledWith(LOGO_URL);
    });
    expect(await screen.findByTestId("admin-business-logo-success")).toHaveTextContent(
      "Logo uploaded.",
    );
    expect(screen.queryByTestId("admin-business-logo-error")).not.toBeInTheDocument();
  });

  it("upload error shows error and does not update logo", async () => {
    const onLogoUrlChange = vi.fn();
    vi.mocked(businessLogoImageApi.uploadBusinessLogoImage).mockRejectedValue(
      new ApiClientError(400, "VALIDATION_ERROR", "Only JPEG, PNG, and WebP images are allowed."),
    );
    const user = userEvent.setup();

    renderRoute(
      <AdminBusinessLogoUpload
        businessId={BUSINESS_ID}
        logoUrl=""
        onLogoUrlChange={onLogoUrlChange}
      />,
      { route: "/admin/settings", path: "/admin/settings" },
    );

    const file = new File(["logo"], "logo.png", { type: "image/png" });
    await user.upload(screen.getByTestId("admin-business-logo-file-input"), file);

    expect(await screen.findByTestId("admin-business-logo-error")).toHaveTextContent(
      "Only JPEG, PNG, and WebP images are allowed.",
    );
    expect(onLogoUrlChange).not.toHaveBeenCalled();
    expect(screen.queryByTestId("admin-business-logo-success")).not.toBeInTheDocument();
  });

  it("remove logo clears via callback after backend confirms", async () => {
    const onLogoUrlChange = vi.fn();
    vi.mocked(businessLogoImageApi.removeBusinessLogoImage).mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderRoute(
      <AdminBusinessLogoUpload
        businessId={BUSINESS_ID}
        logoUrl={LOGO_URL}
        onLogoUrlChange={onLogoUrlChange}
      />,
      { route: "/admin/settings", path: "/admin/settings" },
    );

    await user.click(screen.getByTestId("admin-business-logo-remove"));

    await waitFor(() => {
      expect(businessLogoImageApi.removeBusinessLogoImage).toHaveBeenCalledWith(BUSINESS_ID);
      expect(onLogoUrlChange).toHaveBeenCalledWith("");
    });
    expect(await screen.findByTestId("admin-business-logo-success")).toHaveTextContent(
      "Logo removed.",
    );
  });
});
