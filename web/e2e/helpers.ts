import { expect, type Page } from "@playwright/test";

export const DEMO = {
  slug: "demo-business",
  businessName: "Demo Service Business",
  bookingService: "Arabic Lesson",
  orderService: "Build Telegram Bot",
} as const;

export const USERS = {
  client: { email: "client@example.com", password: "ChangeMe123!" },
  owner: { email: "owner@example.com", password: "ChangeMe123!" },
  superadmin: { email: "superadmin@example.com", password: "ChangeMe123!" },
} as const;

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "My bookings" })).toBeVisible({
    timeout: 15_000,
  });
}
