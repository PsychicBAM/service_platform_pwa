import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MiniSiteVideoEmbed } from "@/components/public/MiniSiteVideoEmbed";
import type { MiniSiteVideoMedia } from "@/lib/miniSiteVideo";

const youtubeMedia: MiniSiteVideoMedia = {
  kind: "video",
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  provider: "youtube",
  embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  title: "Intro",
};

const vimeoMedia: MiniSiteVideoMedia = {
  kind: "video",
  url: "https://vimeo.com/123456789",
  provider: "vimeo",
  embedUrl: "https://player.vimeo.com/video/123456789",
  title: "Showreel",
};

describe("MiniSiteVideoEmbed", () => {
  it("renders a safe iframe for valid YouTube embed URLs", () => {
    render(<MiniSiteVideoEmbed media={youtubeMedia} testId="video-embed" />);

    const embed = screen.getByTestId("video-embed");
    const iframe = screen.getByTitle("Intro");
    expect(embed).toContainElement(iframe);
    expect(iframe).toHaveAttribute("src", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    expect(iframe).toHaveAttribute("loading", "lazy");
    expect(iframe).toHaveAttribute("referrerPolicy", "strict-origin-when-cross-origin");
  });

  it("renders a safe iframe for valid Vimeo embed URLs", () => {
    render(<MiniSiteVideoEmbed media={vimeoMedia} testId="video-embed" />);

    expect(screen.getByTitle("Showreel")).toHaveAttribute(
      "src",
      "https://player.vimeo.com/video/123456789",
    );
  });

  it("renders nothing for unsupported embed URLs", () => {
    render(
      <MiniSiteVideoEmbed
        media={{
          ...youtubeMedia,
          embedUrl: "https://evil.com/embed/1",
        }}
        testId="video-embed"
      />,
    );

    expect(screen.queryByTestId("video-embed")).not.toBeInTheDocument();
  });
});
