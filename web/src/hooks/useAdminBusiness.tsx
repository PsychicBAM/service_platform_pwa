import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { MeBusinessItem } from "@/types/api";
import { getStoredAdminBusinessId, setStoredAdminBusinessId } from "@/utils/adminStorage";

type AdminBusinessContextValue = {
  businesses: MeBusinessItem[];
  businessId: string | null;
  businessName: string | null;
  businessSlug: string | null;
  hasBusinessAccess: boolean;
};

const AdminBusinessContext = createContext<AdminBusinessContextValue | null>(null);

export function AdminBusinessProvider({
  businesses,
  children,
}: {
  businesses: MeBusinessItem[];
  children: ReactNode;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const stored = getStoredAdminBusinessId();
    if (stored && businesses.some((item) => item.id === stored)) {
      return stored;
    }
    return businesses[0]?.id ?? null;
  });

  useEffect(() => {
    if (businesses.length === 0) {
      return;
    }
    const valid = selectedId && businesses.some((item) => item.id === selectedId);
    if (!valid) {
      const firstId = businesses[0].id;
      setSelectedId(firstId);
      setStoredAdminBusinessId(firstId);
    }
  }, [businesses, selectedId]);

  useEffect(() => {
    if (selectedId) {
      setStoredAdminBusinessId(selectedId);
    }
  }, [selectedId]);

  const selected = useMemo(
    () => businesses.find((item) => item.id === selectedId) ?? businesses[0] ?? null,
    [businesses, selectedId],
  );

  const value = useMemo(
    () => ({
      businesses,
      businessId: selected?.id ?? null,
      businessName: selected?.name ?? null,
      businessSlug: selected?.slug ?? null,
      hasBusinessAccess: businesses.length > 0,
    }),
    [businesses, selected],
  );

  return (
    <AdminBusinessContext.Provider value={value}>{children}</AdminBusinessContext.Provider>
  );
}

export function useAdminBusiness(): AdminBusinessContextValue {
  const context = useContext(AdminBusinessContext);
  if (!context) {
    throw new Error("useAdminBusiness must be used within AdminBusinessProvider");
  }
  return context;
}
