import { formatPlanLabel } from "@/utils/planManagement";

export function PlanRequestBadge({
  activePlan,
  intent,
}: {
  activePlan: string;
  intent?: string | null;
}) {
  if (!intent || intent === activePlan) {
    return null;
  }
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
      Plan request: {formatPlanLabel(intent)}
    </span>
  );
}
