import { test, expect } from "@playwright/test";
import { DEMO } from "./helpers";

test.describe("public smoke flows", () => {
  test("A. public business home loads", async ({ page }) => {
    await page.goto(`/b/${DEMO.slug}`);
    await expect(page.getByRole("heading", { name: DEMO.businessName })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("B. services page lists booking and order services", async ({ page }) => {
    await page.goto(`/b/${DEMO.slug}/services`);
    await expect(page.getByRole("heading", { name: "Services" })).toBeVisible();
    await expect(page.getByRole("heading", { name: DEMO.bookingService })).toBeVisible();
    await expect(page.getByRole("heading", { name: DEMO.orderService })).toBeVisible();
  });

  test("C. order request form validates empty submit", async ({ page }) => {
    await page.goto(`/b/${DEMO.slug}/services`);
    await page.getByRole("link", { name: "View & request" }).click();
    await page.getByRole("link", { name: "Submit request" }).click();
    await page.getByRole("button", { name: "Submit request" }).click();
    await expect(page.getByText("Full name is required.")).toBeVisible();
    await expect(page.getByText("Project details are required.")).toBeVisible();
  });

  test("D. booking flow shows date selector and service summary", async ({ page }) => {
    await page.goto(`/b/${DEMO.slug}/services`);
    await page.getByRole("link", { name: "View & book" }).click();
    await page.getByRole("link", { name: /book appointment/i }).click();
    await expect(page.getByRole("heading", { level: 1, name: DEMO.bookingService })).toBeVisible();
    await expect(page.getByText("Choose a date")).toBeVisible();
  });

  test("E. platform home shows pricing section", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /choose the right plan/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Business", exact: true })).toBeVisible();
    await expect(page.getByText("Recommended")).toBeVisible();
    await expect(page.getByText(/payments and plan upgrades are coming later/i)).toBeVisible();
  });
});
