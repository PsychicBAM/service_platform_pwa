import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AdminGuard } from "@/components/AdminGuard";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { SuperadminGuard } from "@/components/SuperadminGuard";
import { SuperadminLayout } from "@/components/superadmin/SuperadminLayout";
import { Layout } from "@/components/Layout";
import { AdminBookingsPage } from "@/pages/admin/AdminBookingsPage";
import { AdminClientsPage } from "@/pages/admin/AdminClientsPage";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminOrdersPage } from "@/pages/admin/AdminOrdersPage";
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
import { MyBookingsPage } from "@/pages/MyBookingsPage";
import { MyOrderDetailPage } from "@/pages/MyOrderDetailPage";
import { MyOrdersPage } from "@/pages/MyOrdersPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { OrderRequestPage } from "@/pages/OrderRequestPage";
import { PublicHomePage } from "@/pages/PublicHomePage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { ServiceDetailPage } from "@/pages/ServiceDetailPage";
import { ServicesPage } from "@/pages/ServicesPage";
import { VerifyEmailPage } from "@/pages/VerifyEmailPage";
import { SuperadminAuditLogsPage } from "@/pages/superadmin/SuperadminAuditLogsPage";
import { SuperadminBusinessesPage } from "@/pages/superadmin/SuperadminBusinessesPage";
import { SuperadminDashboardPage } from "@/pages/superadmin/SuperadminDashboardPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <PublicHomePage /> },
      { path: "b/:slug", element: <PublicHomePage /> },
      { path: "b/:slug/services", element: <ServicesPage /> },
      { path: "b/:slug/services/:serviceId", element: <ServiceDetailPage /> },
      { path: "b/:slug/services/:serviceId/request", element: <OrderRequestPage /> },
      { path: "b/:slug/services/:serviceId/book", element: <BookingPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "forgot-password", element: <ForgotPasswordPage /> },
      { path: "reset-password", element: <ResetPasswordPage /> },
      { path: "register", element: <RegisterPage /> },
      { path: "verify-email", element: <VerifyEmailPage /> },
      { path: "check-email", element: <CheckEmailPage /> },
      { path: "billing/success", element: <BillingSuccessPage /> },
      { path: "billing/cancel", element: <BillingCancelPage /> },
      { path: "me/bookings", element: <MyBookingsPage /> },
      { path: "me/orders", element: <MyOrdersPage /> },
      { path: "me/claim", element: <ClaimGuestPage /> },
      { path: "me/orders/:orderId", element: <MyOrderDetailPage /> },
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
          { path: "services", element: <AdminServicesPage /> },
          { path: "bookings", element: <AdminBookingsPage /> },
          { path: "orders", element: <AdminOrdersPage /> },
          { path: "clients", element: <AdminClientsPage /> },
          { path: "schedule", element: <AdminSchedulePage /> },
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
        ],
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
