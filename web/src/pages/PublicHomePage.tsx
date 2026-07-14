import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicBusiness, listPublicServices } from "@/api/publicApi";
import { ProMiniSiteLayout } from "@/components/public/ProMiniSiteLayout";
import { StandardPublicBusinessHome } from "@/components/public/StandardPublicBusinessHome";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { getApiErrorMessage, isNotFoundError } from "@/utils/errors";

function BusinessHomeContent({ slug }: { slug: string }) {
  const businessQuery = useQuery({
    queryKey: ["public-business", slug],
    queryFn: () => getPublicBusiness(slug),
  });

  const isMiniSite = businessQuery.data?.public_page_variant === "mini_site";

  const servicesQuery = useQuery({
    queryKey: ["public-services", slug],
    queryFn: () => listPublicServices(slug),
    enabled: isMiniSite,
  });

  const { data, isLoading, isError, error } = businessQuery;

  if (isLoading || (isMiniSite && servicesQuery.isLoading)) {
    return <LoadingState message="Loading business…" />;
  }

  if (isError) {
    return (
      <ErrorState
        title={isNotFoundError(error) ? "Business not found" : "Could not load business"}
        message={getApiErrorMessage(error, "Unable to load business")}
      />
    );
  }

  if (!data) {
    return <ErrorState title="Could not load business" message="No data returned." />;
  }

  if (isMiniSite) {
    if (servicesQuery.isError) {
      return (
        <ErrorState
          title="Could not load services"
          message={getApiErrorMessage(servicesQuery.error, "Unable to load services")}
        />
      );
    }

    return (
      <ProMiniSiteLayout
        business={data}
        publicSlug={slug}
        services={servicesQuery.data ?? []}
        config={data.miniSiteConfig}
      />
    );
  }

  return <StandardPublicBusinessHome business={data} slug={slug} />;
}

export function PublicHomePage() {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) {
    return null;
  }

  return <BusinessHomeContent slug={slug} />;
}
