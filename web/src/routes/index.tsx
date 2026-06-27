import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AdminGuard } from "@/components/AdminGuard";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Layout } from "@/components/Layout";
import { AdminBookingsPage } from "@/pages/admin/AdminBookingsPage";
import { AdminClientsPage } from "@/pages/admin/AdminClientsPage";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminOrdersPage } from "@/pages/admin/AdminOrdersPage";
import { AdminSchedulePage } from "@/pages/admin/AdminSchedulePage";
import { AdminServicesPage } from "@/pages/admin/AdminServicesPage";
import { AdminSettingsPage } from "@/pages/admin/AdminSettingsPage";
import { BookingPage } from "@/pages/BookingPage";
import { LoginPage } from "@/pages/LoginPage";
import { MyBookingsPage } from "@/pages/MyBookingsPage";
import { MyOrderDetailPage } from "@/pages/MyOrderDetailPage";
import { MyOrdersPage } from "@/pages/MyOrdersPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { OrderRequestPage } from "@/pages/OrderRequestPage";
import { PublicHomePage } from "@/pages/PublicHomePage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ServiceDetailPage } from "@/pages/ServiceDetailPage";
import { ServicesPage } from "@/pages/ServicesPage";

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
      { path: "register", element: <RegisterPage /> },
      { path: "me/bookings", element: <MyBookingsPage /> },
      { path: "me/orders", element: <MyOrdersPage /> },
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
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
