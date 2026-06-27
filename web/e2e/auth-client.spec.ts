import { test, expect } from "@playwright/test";
import { DEMO, USERS, loginAs } from "./helpers";

test.describe("client auth and /me pages", () => {
  test("E. client login sees linked bookings and orders", async ({ page }) => {
    await loginAs(page, USERS.client.email, USERS.client.password);
    await page.goto("/me/bookings");
    await expect(page.getByRole("heading", { name: "My bookings" })).toBeVisible();
    await expect(page.getByText(DEMO.bookingService)).toBeVisible();

    await page.goto("/me/orders");
    await expect(page.getByRole("heading", { name: "My orders" })).toBeVisible();
    await expect(page.getByText(DEMO.orderService)).toBeVisible();
  });
});
