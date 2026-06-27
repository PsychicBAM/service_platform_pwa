import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { LoginPage } from "@/pages/LoginPage";
import { MyBookingsPage } from "@/pages/MyBookingsPage";
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
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
      { path: "me/bookings", element: <MyBookingsPage /> },
      { path: "me/orders", element: <MyOrdersPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
