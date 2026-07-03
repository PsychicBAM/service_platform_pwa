#!/usr/bin/env node
/**
 * Static smoke check: required route entries and page modules exist.
 * No browser automation — run after `npm run build` or during CI prep.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(__dirname, "..");
const routesFile = join(webRoot, "src", "routes", "index.tsx");

const REQUIRED_ROUTE_STRINGS = [
  'path: "/"',
  'path: "b/:slug"',
  'path: "b/:slug/services"',
  'path: "b/:slug/services/:serviceId"',
  'path: "b/:slug/services/:serviceId/request"',
  'path: "b/:slug/services/:serviceId/book"',
  'path: "login"',
  'path: "register"',
  'path: "verify-email"',
  'path: "check-email"',
  'path: "billing/success"',
  'path: "billing/cancel"',
  'path: "forgot-password"',
  'path: "reset-password"',
  'path: "me/bookings"',
  'path: "me/orders"',
  'path: "me/claim"',
  'path: "me/orders/:orderId"',
  'path: "legal/terms"',
  'path: "legal/privacy"',
  'path: "legal/consent"',
  'path: "legal/cookies"',
  'path: "/admin"',
  'path: "services"',
  'path: "bookings"',
  'path: "orders"',
  'path: "clients"',
  'path: "schedule"',
  'path: "legal-consents"',
  'path: "settings"',
  'path: "/superadmin"',
  'path: "businesses"',
  'path: "audit-logs"',
];

const REQUIRED_PAGE_FILES = [
  "src/pages/PublicHomePage.tsx",
  "src/pages/ServicesPage.tsx",
  "src/pages/ServiceDetailPage.tsx",
  "src/pages/BookingPage.tsx",
  "src/pages/OrderRequestPage.tsx",
  "src/pages/LoginPage.tsx",
  "src/pages/ForgotPasswordPage.tsx",
  "src/pages/ResetPasswordPage.tsx",
  "src/pages/VerifyEmailPage.tsx",
  "src/pages/CheckEmailPage.tsx",
  "src/pages/BillingSuccessPage.tsx",
  "src/pages/BillingCancelPage.tsx",
  "src/pages/MyBookingsPage.tsx",
  "src/pages/MyOrdersPage.tsx",
  "src/pages/ClaimGuestPage.tsx",
  "src/pages/MyOrderDetailPage.tsx",
  "src/pages/legal/TermsPage.tsx",
  "src/pages/legal/PrivacyPage.tsx",
  "src/pages/legal/ConsentPage.tsx",
  "src/pages/legal/CookiesPage.tsx",
  "src/pages/admin/AdminDashboardPage.tsx",
  "src/pages/admin/AdminServicesPage.tsx",
  "src/pages/admin/AdminBookingsPage.tsx",
  "src/pages/admin/AdminOrdersPage.tsx",
  "src/pages/admin/AdminClientsPage.tsx",
  "src/pages/admin/AdminSchedulePage.tsx",
  "src/pages/admin/AdminLegalConsentsPage.tsx",
  "src/pages/admin/AdminSettingsPage.tsx",
  "src/pages/superadmin/SuperadminDashboardPage.tsx",
  "src/pages/superadmin/SuperadminBusinessesPage.tsx",
  "src/pages/superadmin/SuperadminAuditLogsPage.tsx",
  "src/components/AdminGuard.tsx",
  "src/components/SuperadminGuard.tsx",
];

const REQUIRED_API_FILES = [
  "src/api/publicApi.ts",
  "src/api/authApi.ts",
  "src/api/meApi.ts",
  "src/api/adminApi.ts",
  "src/api/superadminApi.ts",
];

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`OK: ${message}`);
}

if (!existsSync(routesFile)) {
  fail(`Missing routes file: ${routesFile}`);
  process.exit(1);
}

const routesSource = readFileSync(routesFile, "utf8");

for (const needle of REQUIRED_ROUTE_STRINGS) {
  if (!routesSource.includes(needle)) {
    fail(`Route config missing expected fragment: ${needle}`);
  } else {
    pass(`Route fragment present: ${needle}`);
  }
}

for (const relativePath of [...REQUIRED_PAGE_FILES, ...REQUIRED_API_FILES]) {
  const absolutePath = join(webRoot, relativePath);
  if (!existsSync(absolutePath)) {
    fail(`Missing file: ${relativePath}`);
  } else {
    pass(`File exists: ${relativePath}`);
  }
}

if (process.exitCode === 1) {
  console.error("\nFrontend route smoke check failed.");
  process.exit(1);
}

console.log("\nFrontend route smoke check passed.");
