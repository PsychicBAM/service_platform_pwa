import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AdminGuard } from "@/components/AdminGuard";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SuperadminGuard } from "@/components/SuperadminGuard";
import { SuperadminLayout } from "@/components/superadmin/SuperadminLayout";
import { Layout } from "@/components/Layout";
import { AdminAnalyticsPage } from "@/pages/admin/AdminAnalyticsPage";
import { AdminBookingsPage } from "@/pages/admin/AdminBookingsPage";
import { AdminClientsPage } from "@/pages/admin/AdminClientsPage";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminLegalConsentsPage } from "@/pages/admin/AdminLegalConsentsPage";
import { AdminOrdersPage } from "@/pages/admin/AdminOrdersPage";
import { AdminReviewsPage } from "@/pages/admin/AdminReviewsPage";
import { AdminSchedulePage } from "@/pages/admin/AdminSchedulePage";
import { AdminServicesPage } from "@/pages/admin/AdminServicesPage";
import { AdminSettingsPage } from "@/pages/admin/AdminSettingsPage";
import { BillingCancelPage } from "@/pages/BillingCancelPage";
import { BillingSuccessPage } from "@/pages/BillingSuccessPage";
import { BookingPage } from "@/pages/BookingPage";
import { CheckEmailPage } from "@/pages/CheckEmailPage";
import { ClaimGuestPage } from "@/pages/ClaimGuestPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { LoginPage } from "@/pages/LoginPage";
import { MeAccountPage } from "@/pages/MeAccountPage";
import { ClientRegisterPage } from "@/pages/ClientRegisterPage";
import { MyBookingsPage } from "@/pages/MyBookingsPage";
import { MyOrderDetailPage } from "@/pages/MyOrderDetailPage";
import { MyOrdersPage } from "@/pages/MyOrdersPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { OrderRequestPage } from "@/pages/OrderRequestPage";
import { PublicHomePage } from "@/pages/PublicHomePage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ReviewRequestPage } from "@/pages/ReviewRequestPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { ServiceDetailPage } from "@/pages/ServiceDetailPage";
import { ServicesPage } from "@/pages/ServicesPage";
import { VerifyEmailPage } from "@/pages/VerifyEmailPage";
import { SuperadminAuditLogsPage } from "@/pages/superadmin/SuperadminAuditLogsPage";
import { SuperadminBusinessesPage } from "@/pages/superadmin/SuperadminBusinessesPage";
import { SuperadminLegalConsentsPage } from "@/pages/superadmin/SuperadminLegalConsentsPage";
import { SuperadminDashboardPage } from "@/pages/superadmin/SuperadminDashboardPage";
import { ConsentPage } from "@/pages/legal/ConsentPage";
import { CookiesPage } from "@/pages/legal/CookiesPage";
import { PrivacyPage } from "@/pages/legal/PrivacyPage";
import { TermsPage } from "@/pages/legal/TermsPage";
import { MarketplaceShell } from "@/components/marketplace/MarketplaceShell";
import { LandingShell } from "@/components/landing/LandingShell";
import { BusinessDirectoryPage } from "@/pages/BusinessDirectoryPage";
import { PlatformLandingPage } from "@/pages/PlatformLandingPage";
import { PricingPage } from "@/pages/PricingPage";

export const routes = [
  {
    path: "/",
    element: <LandingShell />,
    children: [{ index: true, element: <PlatformLandingPage /> }],
  },
  {
    path: "/pricing",
    element: <LandingShell />,
    children: [{ index: true, element: <PricingPage /> }],
  },
  {
    path: "/businesses",
    element: <MarketplaceShell />,
    children: [{ index: true, element: <BusinessDirectoryPage /> }],
  },
  {
    path: "/",
    element: <Layout />,
    children: [
      { path: "b/:slug", element: <PublicHomePage /> },
      { path: "b/:slug/services", element: <ServicesPage /> },
      { path: "b/:slug/services/:serviceId", element: <ServiceDetailPage /> },
      { path: "b/:slug/services/:serviceId/request", element: <OrderRequestPage /> },
      { path: "b/:slug/services/:serviceId/book", element: <BookingPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "client/register", element: <ClientRegisterPage /> },
      { path: "forgot-password", element: <ForgotPasswordPage /> },
      { path: "reset-password", element: <ResetPasswordPage /> },
      { path: "review/:token", element: <ReviewRequestPage /> },
      { path: "register", element: <RegisterPage /> },
      { path: "verify-email", element: <VerifyEmailPage /> },
      { path: "check-email", element: <CheckEmailPage /> },
      { path: "billing/success", element: <BillingSuccessPage /> },
      { path: "billing/cancel", element: <BillingCancelPage /> },
      { path: "me", element: <MeAccountPage /> },
      { path: "me/bookings", element: <MyBookingsPage /> },
      { path: "me/orders", element: <MyOrdersPage /> },
      { path: "me/claim", element: <ClaimGuestPage /> },
      { path: "me/orders/:orderId", element: <MyOrderDetailPage /> },
      { path: "legal/terms", element: <TermsPage /> },
      { path: "legal/privacy", element: <PrivacyPage /> },
      { path: "legal/consent", element: <ConsentPage /> },
      { path: "legal/cookies", element: <CookiesPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
  {
    path: "/admin",
    element: <AdminGuard />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: "analytics", element: <AdminAnalyticsPage /> },
          { path: "services", element: <AdminServicesPage /> },
          { path: "bookings", element: <AdminBookingsPage /> },
          { path: "orders", element: <AdminOrdersPage /> },
          { path: "reviews", element: <AdminReviewsPage /> },
          { path: "clients", element: <AdminClientsPage /> },
          { path: "schedule", element: <AdminSchedulePage /> },
          { path: "legal-consents", element: <AdminLegalConsentsPage /> },
          { path: "settings", element: <AdminSettingsPage /> },
        ],
      },
    ],
  },
  {
    path: "/superadmin",
    element: <SuperadminGuard />,
    children: [
      {
        element: <SuperadminLayout />,
        children: [
          { index: true, element: <SuperadminDashboardPage /> },
          { path: "businesses", element: <SuperadminBusinessesPage /> },
          { path: "audit-logs", element: <SuperadminAuditLogsPage /> },
          { path: "legal-consents", element: <SuperadminLegalConsentsPage /> },
        ],
      },
    ],
  },
] ;

export const router = createBrowserRouter(routes);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
