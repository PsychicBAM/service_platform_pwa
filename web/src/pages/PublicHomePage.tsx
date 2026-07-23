import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicBusiness, listPublicReviews, listPublicServices } from "@/api/publicApi";
import { ProMiniSiteLayout } from "@/components/public/ProMiniSiteLayout";
import { StandardPublicBusinessHome } from "@/components/public/StandardPublicBusinessHome";
import { PublicServiceTaxFromBusiness } from "@/components/PublicServiceTaxProvider";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { getApiErrorMessage, isNotFoundError } from "@/utils/errors";

function BusinessHomeContent({ slug }: { slug: string }) {
  const businessQuery = useQuery({
    queryKey: ["public-business", slug],
    queryFn: () => getPublicBusiness(slug),
  });

  const isMiniSite = businessQuery.data?.public_page_variant === "mini_site";
  const isServiceMiniSite = isMiniSite && businessQuery.data?.miniSiteConfig?.theme?.template === "service";

  const servicesQuery = useQuery({
    queryKey: ["public-services", slug],
    queryFn: () => listPublicServices(slug),
    enabled: isMiniSite,
  });
  const reviewsQuery = useQuery({
    queryKey: ["public-reviews", slug],
    queryFn: () => listPublicReviews(slug),
    enabled: isServiceMiniSite,
  });

  const { data, isLoading, isError, error } = businessQuery;

  if (isLoading || (isMiniSite && servicesQuery.isLoading) || (isServiceMiniSite && reviewsQuery.isLoading)) {
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
      <PublicServiceTaxFromBusiness business={data}>
        <ProMiniSiteLayout
          business={data}
          publicSlug={slug}
          services={servicesQuery.data ?? []}
          config={data.miniSiteConfig}
          reviews={reviewsQuery.data?.reviews}
          reviewSummary={reviewsQuery.data?.summary ?? null}
        />
      </PublicServiceTaxFromBusiness>
    );
  }

  return (
    <PublicServiceTaxFromBusiness business={data}>
      <StandardPublicBusinessHome business={data} slug={slug} />
    </PublicServiceTaxFromBusiness>
  );
}

export function PublicHomePage() {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) {
    return null;
  }

  return <BusinessHomeContent slug={slug} />;
}
