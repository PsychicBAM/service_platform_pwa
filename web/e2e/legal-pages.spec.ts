import { test, expect } from "@playwright/test";

const LEGAL_PAGES = [
  { path: "/legal/terms", heading: /terms of service \(draft\)/i },
  { path: "/legal/privacy", heading: /privacy policy \(draft\)/i },
  { path: "/legal/consent", heading: /personal data processing consent \(draft\)/i },
  { path: "/legal/cookies", heading: /cookie policy \(draft\)/i },
] as const;

test.describe("legal placeholder pages", () => {
  for (const { path, heading } of LEGAL_PAGES) {
    test(`${path} loads draft placeholder`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
      await expect(page.getByText(/draft placeholder — not legal advice/i)).toBeVisible();
      await expect(page.getByText(/must be reviewed before public launch/i)).toBeVisible();
    });
  }
});
