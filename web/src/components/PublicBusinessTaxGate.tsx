import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicBusiness } from "@/api/publicApi";
import { PublicServiceTaxFromBusiness } from "@/components/PublicServiceTaxProvider";

/** Loads public business tax settings and provides them to PriceLabel. */
export function PublicBusinessTaxGate({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const businessQuery = useQuery({
    queryKey: ["public-business", slug],
    queryFn: () => getPublicBusiness(slug),
    enabled: Boolean(slug),
  });

  return (
    <PublicServiceTaxFromBusiness business={businessQuery.data ?? null}>
      {children}
    </PublicServiceTaxFromBusiness>
  );
}
