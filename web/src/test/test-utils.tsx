import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import { MemoryRouter, Route, Routes, type MemoryRouterProps } from "react-router-dom";
import type { ReactElement, ReactNode } from "react";
import type { MeResponse } from "@/types/api";
import type { useAuth } from "@/hooks/useAuth";
import { vi } from "vitest";

type AuthHookReturn = ReturnType<typeof useAuth>;

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

type RenderRouteOptions = {
  route?: string;
  path?: string;
  queryClient?: QueryClient;
  routerProps?: MemoryRouterProps;
} & Omit<RenderOptions, "wrapper">;

export function renderRoute(
  ui: ReactElement,
  {
    route = "/",
    path = "*",
    queryClient = createTestQueryClient(),
    routerProps,
    ...renderOptions
  }: RenderRouteOptions = {},
) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]} {...routerProps}>
          <Routes>
            <Route path={path} element={children} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  return {
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

export function mockAuthQuery(
  user: MeResponse | null,
  isLoading = false,
): UseQueryResult<MeResponse, Error> {
  return {
    isLoading,
    isError: false,
    error: null,
    data: user ?? undefined,
    isFetching: false,
    isSuccess: Boolean(user),
    status: isLoading ? "pending" : user ? "success" : "success",
    refetch: vi.fn(),
    remove: vi.fn(),
  } as unknown as UseQueryResult<MeResponse, Error>;
}

export function mockUnauthenticatedAuth(): AuthHookReturn {
  return {
    isAuthenticated: false,
    isLoadingUser: false,
    user: null,
    meQuery: mockAuthQuery(null),
    logout: vi.fn(),
  };
}

export function mockAuthenticatedAuth(user: MeResponse, isLoadingUser = false): AuthHookReturn {
  return {
    isAuthenticated: true,
    isLoadingUser,
    user: isLoadingUser ? null : user,
    meQuery: mockAuthQuery(isLoadingUser ? null : user, isLoadingUser),
    logout: vi.fn(),
  };
}
