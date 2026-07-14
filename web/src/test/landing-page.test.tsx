import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { PlatformLandingPage } from "@/pages/PlatformLandingPage";
import * as publicApi from "@/api/publicApi";
import { renderRoute } from "@/test/test-utils";

vi.mock("@/api/publicApi");

describe("platform landing page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(publicApi.listPublicBusinesses).mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 5, total: 0 },
    });
  });

  it("renders homepage hero and marketplace links", async () => {
    renderRoute(<PlatformLandingPage />, { route: "/", path: "/" });

    expect(await screen.findByTestId("homepage-hero-heading")).toBeInTheDocument();
    expect(screen.getByTestId("homepage-browse-businesses")).toHaveAttribute("href", "/businesses");
  });
});
