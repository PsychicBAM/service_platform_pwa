import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe, logout as authLogout } from "@/api/authApi";
import { ApiClientError } from "@/api/client";
import { clearAccessToken, hasAccessToken } from "@/utils/authStorage";
export function useAuth() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const tokenPresent = hasAccessToken();

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getMe,
    enabled: tokenPresent,
    retry: false,
  });

  useEffect(() => {
    if (meQuery.error instanceof ApiClientError && meQuery.error.status === 401) {
      clearAccessToken();
      queryClient.removeQueries({ queryKey: ["auth"] });
    }
  }, [meQuery.error, queryClient]);

  const logout = () => {
    authLogout();
    queryClient.removeQueries({ queryKey: ["auth"] });
    queryClient.removeQueries({ queryKey: ["my-bookings"] });
    queryClient.removeQueries({ queryKey: ["my-orders"] });
    queryClient.removeQueries({ queryKey: ["my-order"] });
    navigate("/login");
  };

  return {
    isAuthenticated: tokenPresent,
    isLoadingUser: tokenPresent && meQuery.isLoading,
    user: meQuery.data ?? null,
    meQuery,
    logout,
  };
}

// TODO: refresh token — call /auth/refresh when access token expires.
