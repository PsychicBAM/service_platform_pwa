import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createUnavailableTime,
  createWorkingBreak,
  deleteUnavailableTime,
  deleteWorkingBreak,
  getSchedule,
  listAdminBookings,
  listAdminServices,
  replaceWorkingHours,
  updateUnavailableTime,
  updateWorkingBreak,
} from "@/api/adminApi";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { AdminAnalyticsKpiCard } from "@/components/admin/analytics/AdminAnalyticsKpiCard";
import { AdminScheduleCalendarGrid } from "@/components/admin/schedule/AdminScheduleCalendarGrid";
import {
  AdminSchedulePanel,
  type SchedulePanelForm,
} from "@/components/admin/schedule/AdminSchedulePanel";
import { AdminScheduleServiceFilter } from "@/components/admin/schedule/AdminScheduleServiceFilter";
import {
  DAY_NAMES,
  addDays,
  buildWeekEvents,
  computeScheduleKpis,
  formatMonthLabel,
  formatWeekRangeLabel,
  monthCells,
  parseDayKey,
  startOfWeek,
  toDayKey,
  type ScheduleEvent,
  type ScheduleEventKind,
  type ScheduleViewTab,
} from "@/components/admin/schedule/scheduleHelpers";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { useAdminBusiness } from "@/hooks/useAdminBusiness";
import { useAdminSectionFocus } from "@/hooks/useAdminSectionFocus";
import { ADMIN_ONBOARDING_FOCUS } from "@/lib/adminFocus";
import type { WorkingHourUpdate } from "@/types/api";
import { getAdminScheduleErrorMessage } from "@/utils/errors";
import { datetimeLocalToIso, isoToDatetimeLocal, toTimeInputValue } from "@/utils/format";

function IconHours() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" strokeLinecap="round" />
    </svg>
  );
}

function IconSlots() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 7.5V12l3 2" strokeLinecap="round" />
    </svg>
  );
}

function IconBooked() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3Z" />
      <path d="M3.5 19a4.5 4.5 0 0 1 9 0M11.5 19a4.5 4.5 0 0 1 9 0" strokeLinecap="round" />
    </svg>
  );
}

function IconUtil() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M5 19a9 9 0 1 1 14 0" strokeLinecap="round" />
      <path d="M12 13v-3l3 1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconBlocked() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8.25" />
      <path d="m7.5 7.5 9 9" strokeLinecap="round" />
    </svg>
  );
}

function emptyPanelForm(date = new Date()): SchedulePanelForm {
  return {
    type: "available",
    date: toDayKey(date),
    startTime: "09:00",
    endTime: "17:00",
    breakRepeat: "weekday",
    notes: "",
  };
}

type PendingDelete =
  | { kind: "break"; id: string; label: string }
  | { kind: "unavailable"; id: string; label: string };

export function AdminSchedulePage() {
  const { businessId } = useAdminBusiness();
  const queryClient = useQueryClient();
  const workingHoursFocus = useAdminSectionFocus(ADMIN_ONBOARDING_FOCUS.workingHours);

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const [activeTab, setActiveTab] = useState<ScheduleViewTab>("week");
  const [serviceSearch, setServiceSearch] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [servicesInitialized, setServicesInitialized] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [visibleKinds, setVisibleKinds] = useState<Set<ScheduleEventKind>>(
    () => new Set(["available", "booked", "service", "blocked", "exception"]),
  );
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelForm, setPanelForm] = useState<SchedulePanelForm>(() => emptyPanelForm());
  const [panelError, setPanelError] = useState<string | null>(null);
  const [panelTitle, setPanelTitle] = useState<string | undefined>(undefined);
  const [panelStatusHint, setPanelStatusHint] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [editingBreakId, setEditingBreakId] = useState<string | null>(null);
  const [editingUnavailableId, setEditingUnavailableId] = useState<string | null>(null);
  const [editingAvailableBlock, setEditingAvailableBlock] = useState(false);

  const scheduleQuery = useQuery({
    queryKey: ["admin-schedule", businessId],
    queryFn: () => getSchedule(businessId!),
    enabled: Boolean(businessId),
  });

  const servicesQuery = useQuery({
    queryKey: ["admin-services", businessId],
    queryFn: () => listAdminServices(businessId!),
    enabled: Boolean(businessId),
  });

  const bookingsQuery = useQuery({
    queryKey: ["admin-bookings", businessId, "schedule"],
    queryFn: () => listAdminBookings(businessId!),
    enabled: Boolean(businessId),
  });

  const services = servicesQuery.data?.data ?? [];
  const bookings = bookingsQuery.data?.data ?? [];
  const schedule = scheduleQuery.data;

  useEffect(() => {
    if (servicesInitialized || services.length === 0) return;
    setSelectedServiceIds(new Set(services.map((service) => service.id)));
    setServicesInitialized(true);
  }, [services, servicesInitialized]);

  useEffect(() => {
    if (workingHoursFocus.matched) {
      setPanelOpen(true);
      setPanelForm(emptyPanelForm());
      setPanelTitle(undefined);
      setPanelStatusHint(null);
      setEditingBreakId(null);
      setEditingUnavailableId(null);
      setEditingAvailableBlock(false);
    }
  }, [workingHoursFocus.matched]);

  const selectedServiceNames = useMemo(() => {
    const names = new Set<string>();
    for (const service of services) {
      if (selectedServiceIds.has(service.id)) {
        names.add(service.name);
      }
    }
    return names;
  }, [selectedServiceIds, services]);

  const weekEvents = useMemo(() => {
    if (!schedule) return [];
    return buildWeekEvents({
      weekStart,
      schedule,
      bookings,
      selectedServiceNames,
    });
  }, [bookings, schedule, selectedServiceNames, weekStart]);

  const previousWeekEvents = useMemo(() => {
    if (!schedule) return [];
    return buildWeekEvents({
      weekStart: addDays(weekStart, -7),
      schedule,
      bookings,
      selectedServiceNames,
    });
  }, [bookings, schedule, selectedServiceNames, weekStart]);

  const kpis = useMemo(
    () =>
      computeScheduleKpis({
        weekStart,
        events: weekEvents,
        previousEvents: previousWeekEvents,
      }),
    [previousWeekEvents, weekEvents, weekStart],
  );

  const invalidateSchedule = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-schedule", businessId] });
  };

  const hoursMutation = useMutation({
    mutationFn: (payload: WorkingHourUpdate[]) =>
      replaceWorkingHours(businessId!, { working_hours: payload }),
    onSuccess: invalidateSchedule,
  });

  const createBreakMutation = useMutation({
    mutationFn: (payload: {
      label?: string | null;
      day_of_week?: number | null;
      starts_at: string;
      ends_at: string;
    }) => createWorkingBreak(businessId!, payload),
    onSuccess: invalidateSchedule,
  });

  const updateBreakMutation = useMutation({
    mutationFn: ({
      breakId,
      payload,
    }: {
      breakId: string;
      payload: {
        label?: string | null;
        day_of_week?: number | null;
        starts_at?: string;
        ends_at?: string;
      };
    }) => updateWorkingBreak(businessId!, breakId, payload),
    onSuccess: invalidateSchedule,
  });

  const deleteBreakMutation = useMutation({
    mutationFn: (breakId: string) => deleteWorkingBreak(businessId!, breakId),
    onSuccess: invalidateSchedule,
  });

  const createUnavailableMutation = useMutation({
    mutationFn: (payload: {
      starts_at: string;
      ends_at: string;
      reason?: string | null;
    }) => createUnavailableTime(businessId!, payload),
    onSuccess: invalidateSchedule,
  });

  const updateUnavailableMutation = useMutation({
    mutationFn: ({
      blockId,
      payload,
    }: {
      blockId: string;
      payload: {
        starts_at?: string;
        ends_at?: string;
        reason?: string | null;
      };
    }) => updateUnavailableTime(businessId!, blockId, payload),
    onSuccess: invalidateSchedule,
  });

  const deleteUnavailableMutation = useMutation({
    mutationFn: (blockId: string) => deleteUnavailableTime(businessId!, blockId),
    onSuccess: invalidateSchedule,
  });

  const acting =
    hoursMutation.isPending ||
    createBreakMutation.isPending ||
    updateBreakMutation.isPending ||
    deleteBreakMutation.isPending ||
    createUnavailableMutation.isPending ||
    updateUnavailableMutation.isPending ||
    deleteUnavailableMutation.isPending;

  function goToday() {
    const today = new Date();
    setWeekStart(startOfWeek(today));
    setMonthAnchor(today);
  }

  function goPrev() {
    if (activeTab === "month") {
      setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() - 1, 1));
    } else {
      setWeekStart(addDays(weekStart, -7));
    }
  }

  function goNext() {
    if (activeTab === "month") {
      setMonthAnchor(new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1));
    } else {
      setWeekStart(addDays(weekStart, 7));
    }
  }

  function openCreatePanel() {
    setPanelOpen(true);
    setPanelForm(emptyPanelForm(weekStart));
    setPanelError(null);
    setPanelTitle(undefined);
    setPanelStatusHint(null);
    setEditingBreakId(null);
    setEditingUnavailableId(null);
    setEditingAvailableBlock(false);
    setSuccessMessage(null);
    setActionError(null);
  }

  function closePanel() {
    setPanelOpen(false);
    setPanelError(null);
    setPanelTitle(undefined);
    setPanelStatusHint(null);
    setEditingBreakId(null);
    setEditingUnavailableId(null);
    setEditingAvailableBlock(false);
  }

  /** Open the right panel for a weekly working-hours weekday card. */
  function openWeekdayFromCard(dayOfWeek: number) {
    if (!schedule) return;
    const dayDate = addDays(weekStart, dayOfWeek);
    const hour = schedule.working_hours.find((row) => row.day_of_week === dayOfWeek);
    const isOpen = Boolean(hour?.is_open);

    setEditingBreakId(null);
    setEditingUnavailableId(null);
    setPanelError(null);
    setSuccessMessage(null);
    setActionError(null);

    if (isOpen && hour) {
      setEditingAvailableBlock(true);
      setPanelTitle("Edit schedule");
      setPanelStatusHint(null);
      setPanelForm({
        type: "available",
        date: toDayKey(dayDate),
        startTime: toTimeInputValue(hour.opens_at as unknown as string),
        endTime: toTimeInputValue(hour.closes_at as unknown as string),
        breakRepeat: "weekday",
        notes: "",
      });
    } else {
      setEditingAvailableBlock(false);
      setPanelTitle("Add working hours");
      setPanelStatusHint(
        "This day is currently closed. Add working hours to make it bookable.",
      );
      setPanelForm({
        type: "available",
        date: toDayKey(dayDate),
        startTime: "09:00",
        endTime: "18:00",
        breakRepeat: "weekday",
        notes: "",
      });
    }
    setPanelOpen(true);
  }

  function buildWorkingHoursPayload(
    dayOfWeek: number,
    dayUpdate: { is_open: boolean; opens_at?: string | null; closes_at?: string | null },
  ): WorkingHourUpdate[] {
    if (!schedule) return [];
    return DAY_NAMES.map((_, index) => {
      const existing = schedule.working_hours.find((row) => row.day_of_week === index);
      if (index === dayOfWeek) {
        return {
          day_of_week: index,
          is_open: dayUpdate.is_open,
          opens_at: dayUpdate.is_open ? (dayUpdate.opens_at ?? null) : null,
          closes_at: dayUpdate.is_open ? (dayUpdate.closes_at ?? null) : null,
        };
      }
      return {
        day_of_week: index,
        is_open: existing?.is_open ?? false,
        opens_at: existing?.is_open
          ? toTimeInputValue(existing.opens_at as unknown as string)
          : null,
        closes_at: existing?.is_open
          ? toTimeInputValue(existing.closes_at as unknown as string)
          : null,
      };
    });
  }

  /** When converting Break/Blocked → Available, remove the old override so it no longer hides hours. */
  async function cleanupEditedOverride() {
    if (editingBreakId) {
      await deleteBreakMutation.mutateAsync(editingBreakId);
    }
    if (editingUnavailableId) {
      await deleteUnavailableMutation.mutateAsync(editingUnavailableId);
    }
  }

  async function closeWeekdayForDate(dateKey: string) {
    if (!schedule) return;
    const dayOfWeek = parseDayKey(dateKey).getDay();
    const payload = buildWorkingHoursPayload(dayOfWeek, { is_open: false });
    await hoursMutation.mutateAsync(payload);
  }

  async function handlePanelSubmit() {
    setPanelError(null);
    setActionError(null);
    if (!schedule) return;

    const day = parseDayKey(panelForm.date);
    const dayOfWeek = day.getDay();

    try {
      if (panelForm.type === "closed") {
        if (!panelForm.date) {
          setPanelError("Date is required.");
          return;
        }
        await closeWeekdayForDate(panelForm.date);
        // Closing the weekday should also clear a break/block being edited for that day.
        await cleanupEditedOverride();
        setSuccessMessage(`${DAY_NAMES[dayOfWeek]} is now closed (no working hours).`);
        closePanel();
        return;
      }

      if (!panelForm.date || !panelForm.startTime || !panelForm.endTime) {
        setPanelError("Date, start time, and end time are required.");
        return;
      }
      if (panelForm.startTime >= panelForm.endTime) {
        setPanelError("Start time must be before end time.");
        return;
      }

      if (panelForm.type === "available") {
        const payload = buildWorkingHoursPayload(dayOfWeek, {
          is_open: true,
          opens_at: panelForm.startTime,
          closes_at: panelForm.endTime,
        });
        await hoursMutation.mutateAsync(payload);
        // Break/Blocked → Available: delete the old override so availability is visible again.
        await cleanupEditedOverride();
        setSuccessMessage(
          editingBreakId || editingUnavailableId
            ? "Availability restored and the previous break/block was removed."
            : "Working hours updated for that weekday.",
        );
        closePanel();
        return;
      }

      if (panelForm.type === "break") {
        const payload = {
          label: panelForm.notes.trim() || null,
          day_of_week: panelForm.breakRepeat === "everyday" ? null : dayOfWeek,
          starts_at: panelForm.startTime,
          ends_at: panelForm.endTime,
        };
        if (editingBreakId) {
          await updateBreakMutation.mutateAsync({ breakId: editingBreakId, payload });
          setSuccessMessage("Break updated.");
        } else {
          // If user switched from Blocked → Break while editing a block, remove the block first.
          if (editingUnavailableId) {
            await deleteUnavailableMutation.mutateAsync(editingUnavailableId);
          }
          await createBreakMutation.mutateAsync(payload);
          setSuccessMessage("Break added.");
        }
        closePanel();
        return;
      }

      // Blocked
      const startsLocal = `${panelForm.date}T${panelForm.startTime}`;
      const endsLocal = `${panelForm.date}T${panelForm.endTime}`;
      const payload = {
        starts_at: datetimeLocalToIso(startsLocal),
        ends_at: datetimeLocalToIso(endsLocal),
        reason: panelForm.notes.trim() || null,
      };
      if (editingUnavailableId) {
        await updateUnavailableMutation.mutateAsync({
          blockId: editingUnavailableId,
          payload,
        });
        setSuccessMessage("Blocked time updated.");
      } else {
        // If user switched from Break → Blocked while editing a break, remove the break first.
        if (editingBreakId) {
          await deleteBreakMutation.mutateAsync(editingBreakId);
        }
        await createUnavailableMutation.mutateAsync(payload);
        setSuccessMessage("Blocked time added.");
      }
      closePanel();
    } catch (error) {
      setPanelError(getAdminScheduleErrorMessage(error, "Could not save schedule entry."));
    }
  }

  async function handleCloseWeekdayFromPanel() {
    setPanelError(null);
    if (!panelForm.date) {
      setPanelError("Date is required.");
      return;
    }
    try {
      const dayOfWeek = parseDayKey(panelForm.date).getDay();
      await closeWeekdayForDate(panelForm.date);
      setSuccessMessage(`${DAY_NAMES[dayOfWeek]} is now closed (no working hours).`);
      closePanel();
    } catch (error) {
      setPanelError(getAdminScheduleErrorMessage(error, "Could not close this weekday."));
    }
  }

  function handleSelectEvent(event: ScheduleEvent) {
    setPanelTitle(undefined);
    setPanelStatusHint(null);
    if (event.kind === "exception" && event.metaId) {
      const item = schedule?.breaks.find((row) => row.id === event.metaId);
      if (!item) return;
      setEditingBreakId(item.id);
      setEditingUnavailableId(null);
      setEditingAvailableBlock(false);
      setPanelForm({
        type: "break",
        date: event.dayKey,
        startTime: toTimeInputValue(item.starts_at as unknown as string),
        endTime: toTimeInputValue(item.ends_at as unknown as string),
        breakRepeat: item.day_of_week == null ? "everyday" : "weekday",
        notes: item.label ?? "",
      });
      setPanelOpen(true);
      return;
    }
    if (event.kind === "blocked" && event.metaId) {
      const item = schedule?.unavailable_times.find((row) => row.id === event.metaId);
      if (!item) return;
      setEditingUnavailableId(item.id);
      setEditingBreakId(null);
      setEditingAvailableBlock(false);
      setPanelForm({
        type: "blocked",
        date: toDayKey(new Date(item.starts_at)),
        startTime: isoToDatetimeLocal(item.starts_at).slice(11, 16),
        endTime: isoToDatetimeLocal(item.ends_at).slice(11, 16),
        breakRepeat: "weekday",
        notes: item.reason ?? "",
      });
      setPanelOpen(true);
      return;
    }
    if (event.kind === "available") {
      setEditingBreakId(null);
      setEditingUnavailableId(null);
      setEditingAvailableBlock(true);
      setPanelForm({
        type: "available",
        date: event.dayKey,
        startTime: minutesToClock(event.startMinutes),
        endTime: minutesToClock(event.endMinutes),
        breakRepeat: "weekday",
        notes: "",
      });
      setPanelOpen(true);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      if (pendingDelete.kind === "break") {
        await deleteBreakMutation.mutateAsync(pendingDelete.id);
        setSuccessMessage("Break deleted.");
      } else {
        await deleteUnavailableMutation.mutateAsync(pendingDelete.id);
        setSuccessMessage("Blocked time deleted.");
      }
      setPendingDelete(null);
      if (
        (pendingDelete.kind === "break" && editingBreakId === pendingDelete.id) ||
        (pendingDelete.kind === "unavailable" && editingUnavailableId === pendingDelete.id)
      ) {
        closePanel();
      }
    } catch (error) {
      setPendingDelete(null);
      setActionError(getAdminScheduleErrorMessage(error, "Could not delete schedule entry."));
    }
  }

  const weekDayList = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  const listEvents = useMemo(() => {
    if (activeTab === "exceptions") {
      return weekEvents.filter((event) => event.kind === "blocked" || event.kind === "exception");
    }
    return weekEvents.filter((event) => visibleKinds.has(event.kind));
  }, [activeTab, visibleKinds, weekEvents]);

  const rangeLabel =
    activeTab === "month" ? formatMonthLabel(monthAnchor) : formatWeekRangeLabel(weekStart);

  const calendarNav = (
    <div className="flex w-full flex-wrap items-center gap-2">
      <div
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 text-sm font-medium text-gray-700"
        data-testid="admin-schedule-date-range"
      >
        <span aria-hidden="true">📅</span>
        {rangeLabel}
      </div>
      <button
        type="button"
        onClick={goToday}
        className="inline-flex h-9 items-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 outline-none hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
        data-testid="admin-schedule-today"
      >
        Today
      </button>
      <button
        type="button"
        onClick={goPrev}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 outline-none hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
        data-testid="admin-schedule-prev"
        aria-label="Previous"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={goNext}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 outline-none hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
        data-testid="admin-schedule-next"
        aria-label="Next"
      >
        ›
      </button>
    </div>
  );

  const loading = scheduleQuery.isLoading || servicesQuery.isLoading || bookingsQuery.isLoading;
  const loadError = scheduleQuery.isError
    ? getAdminScheduleErrorMessage(scheduleQuery.error, "Unable to load schedule")
    : null;

  return (
    <section className="w-full space-y-6 sm:space-y-7" data-testid="admin-schedule-page">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Schedule</h2>
          <p className="mt-1 text-sm text-gray-500">Manage your availability and working hours.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((value) => !value)}
            className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 ${
              showFilters
                ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
            data-testid="admin-schedule-filters"
          >
            <span aria-hidden="true">⚙</span>
            Filters
          </button>
          <button
            type="button"
            onClick={openCreatePanel}
            className="inline-flex h-11 items-center rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white shadow-sm outline-none hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
            data-testid="admin-schedule-add"
          >
            + Add schedule
          </button>
        </div>
      </div>

      {successMessage ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {successMessage}
        </p>
      ) : null}
      {actionError ? <ErrorState title="Schedule update failed" message={actionError} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <AdminAnalyticsKpiCard
          testId="admin-schedule-kpi-total-hours"
          label="Total Hours"
          value={kpis.totalHours}
          trend={kpis.trends.totalHours}
          icon={<IconHours />}
          iconTone="bg-emerald-100 text-emerald-700"
        />
        <AdminAnalyticsKpiCard
          testId="admin-schedule-kpi-available-slots"
          label="Available Slots"
          value={kpis.availableSlots}
          trend={kpis.trends.availableSlots}
          icon={<IconSlots />}
          iconTone="bg-sky-100 text-sky-700"
        />
        <AdminAnalyticsKpiCard
          testId="admin-schedule-kpi-booked-slots"
          label="Booked Slots"
          value={kpis.bookedSlots}
          trend={kpis.trends.bookedSlots}
          icon={<IconBooked />}
          iconTone="bg-violet-100 text-violet-700"
        />
        <AdminAnalyticsKpiCard
          testId="admin-schedule-kpi-utilization"
          label="Utilization"
          value={kpis.utilization}
          trend={kpis.trends.utilization}
          icon={<IconUtil />}
          iconTone="bg-amber-100 text-amber-700"
        />
        <AdminAnalyticsKpiCard
          testId="admin-schedule-kpi-blocked-hours"
          label="Blocked Hours"
          value={kpis.blockedHours}
          trend={kpis.trends.blockedHours}
          icon={<IconBlocked />}
          iconTone="bg-rose-100 text-rose-700"
        />
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-gray-100">
        {(
          [
            ["week", "Week", "admin-schedule-tab-week"],
            ["month", "Month", "admin-schedule-tab-month"],
            ["list", "List", "admin-schedule-tab-list"],
            ["exceptions", "Exceptions", "admin-schedule-tab-exceptions"],
          ] as const
        ).map(([id, label, testId]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 ${
              activeTab === id
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
            data-testid={testId}
          >
            {label}
          </button>
        ))}
      </div>

      {showFilters ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm font-semibold text-gray-900">Show on calendar</p>
          <div className="flex flex-wrap gap-3">
            {(
              [
                ["available", "Available"],
                ["booked", "Booked"],
                ["service", "Service"],
                ["blocked", "Blocked"],
                ["exception", "Exception"],
              ] as const
            ).map(([kind, label]) => (
              <label key={kind} className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={visibleKinds.has(kind)}
                  onChange={(event) => {
                    setVisibleKinds((current) => {
                      const next = new Set(current);
                      if (event.target.checked) next.add(kind);
                      else next.delete(kind);
                      return next;
                    });
                  }}
                  className="rounded border-gray-300"
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {loading ? <LoadingState message="Loading schedule…" /> : null}
      {loadError ? <ErrorState title="Could not load schedule" message={loadError} /> : null}

      {!loading && !loadError && schedule ? (
        <div
          className={`grid items-start gap-5 ${
            panelOpen
              ? "xl:grid-cols-[220px_minmax(0,1fr)_360px] 2xl:grid-cols-[220px_minmax(0,1fr)_380px]"
              : "xl:grid-cols-[220px_minmax(0,1fr)]"
          }`}
        >
          <AdminScheduleServiceFilter
            services={services}
            search={serviceSearch}
            onSearchChange={setServiceSearch}
            selectedIds={selectedServiceIds}
            onToggleAll={(checked) => {
              setSelectedServiceIds(
                checked ? new Set(services.map((service) => service.id)) : new Set(),
              );
            }}
            onToggleService={(serviceId, checked) => {
              setSelectedServiceIds((current) => {
                const next = new Set(current);
                if (checked) next.add(serviceId);
                else next.delete(serviceId);
                return next;
              });
            }}
          />

          <div className="min-w-0 space-y-4">
            {activeTab === "week" ? (
              <AdminScheduleCalendarGrid
                weekDays={weekDayList}
                events={weekEvents}
                visibleKinds={visibleKinds}
                onSelectEvent={handleSelectEvent}
                toolbar={calendarNav}
              />
            ) : null}

            {activeTab !== "week" ? (
              <div className="rounded-2xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm sm:px-4">
                {calendarNav}
              </div>
            ) : null}

            {activeTab === "month" ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3 grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {DAY_NAMES.map((name) => (
                    <div key={name}>{name.slice(0, 3)}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {monthCells(monthAnchor).map((day) => {
                    const key = toDayKey(day);
                    const inMonth = day.getMonth() === monthAnchor.getMonth();
                    const dayEvents = buildWeekEvents({
                      weekStart: startOfWeek(day),
                      schedule,
                      bookings,
                      selectedServiceNames,
                    }).filter((event) => event.dayKey === key && visibleKinds.has(event.kind));
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setWeekStart(startOfWeek(day));
                          setActiveTab("week");
                        }}
                        className={`min-h-[72px] rounded-xl border p-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 ${
                          inMonth
                            ? "border-gray-100 bg-white hover:bg-gray-50"
                            : "border-transparent bg-gray-50 text-gray-400"
                        }`}
                      >
                        <span className="text-xs font-semibold">{day.getDate()}</span>
                        <div className="mt-1 flex flex-wrap gap-0.5">
                          {dayEvents.slice(0, 3).map((event) => (
                            <span
                              key={event.id}
                              className={`h-1.5 w-1.5 rounded-full ${
                                event.kind === "available"
                                  ? "bg-emerald-500"
                                  : event.kind === "booked" || event.kind === "service"
                                    ? "bg-sky-500"
                                    : event.kind === "exception"
                                      ? "bg-amber-500"
                                      : "bg-slate-400"
                              }`}
                            />
                          ))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {activeTab === "list" || activeTab === "exceptions" ? (
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                {listEvents.length === 0 ? (
                  <div className="px-4 py-10 text-center" data-testid="admin-schedule-empty-state">
                    <p className="text-sm font-medium text-gray-800">No items in this view</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Try another week or add a schedule entry.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {listEvents.map((event) => (
                      <li
                        key={event.id}
                        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">{event.title}</p>
                          <p className="truncate text-xs text-gray-500">
                            {event.dayKey} · {event.subtitle}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {(event.kind === "exception" || event.kind === "blocked") && event.metaId ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSelectEvent(event)}
                                className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setPendingDelete({
                                    kind: event.kind === "exception" ? "break" : "unavailable",
                                    id: event.metaId!,
                                    label: event.title,
                                  })
                                }
                                className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSelectEvent(event)}
                              className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            >
                              View
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            <div
              ref={workingHoursFocus.ref}
              className={`rounded-2xl border border-gray-200 bg-white p-4 shadow-sm ${workingHoursFocus.highlightClassName}`.trim()}
              data-testid="admin-schedule-working-hours"
              data-admin-focused={workingHoursFocus.highlighted ? "true" : undefined}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Weekly working hours</h3>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Available blocks on the calendar come from these hours.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    openCreatePanel();
                  }}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Edit via Add schedule
                </button>
              </div>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {DAY_NAMES.map((name, index) => {
                  const hour = schedule.working_hours.find((row) => row.day_of_week === index);
                  const weekdayKey = name.toLowerCase();
                  const isOpen = Boolean(hour?.is_open);
                  const hoursLabel = isOpen
                    ? `${toTimeInputValue(hour!.opens_at as unknown as string)} – ${toTimeInputValue(hour!.closes_at as unknown as string)}`
                    : "Closed";
                  return (
                    <li key={name} data-testid="admin-schedule-working-hours-day">
                      <button
                        type="button"
                        onClick={() => openWeekdayFromCard(index)}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-2 text-left text-sm outline-none transition hover:border-emerald-300 hover:bg-emerald-50/60 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                        data-testid={`admin-schedule-working-hours-day-${weekdayKey}`}
                        data-weekday={weekdayKey}
                        aria-label={`${name}: ${hoursLabel}. Open schedule panel.`}
                        title={`Edit ${name} working hours`}
                      >
                        <span className="block font-medium text-gray-800">{name}</span>
                        <span className="mt-0.5 block text-xs text-gray-500">{hoursLabel}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs text-gray-500">
                Slot interval: {schedule.settings.slot_interval_minutes} min · Buffer:{" "}
                {schedule.settings.booking_buffer_minutes} min
              </p>
            </div>
          </div>

          {panelOpen ? (
            <AdminSchedulePanel
              mode={
                editingBreakId || editingUnavailableId || editingAvailableBlock
                  ? "edit"
                  : "create"
              }
              title={panelTitle}
              statusHint={panelStatusHint}
              form={panelForm}
              submitting={acting}
              error={panelError}
              editingAvailable={editingAvailableBlock}
              canDeleteOverride={Boolean(editingBreakId || editingUnavailableId)}
              onChange={setPanelForm}
              onCancel={closePanel}
              onSubmit={() => void handlePanelSubmit()}
              onCloseWeekday={() => void handleCloseWeekdayFromPanel()}
              onDeleteOverride={() => {
                if (editingBreakId) {
                  setPendingDelete({
                    kind: "break",
                    id: editingBreakId,
                    label: panelForm.notes.trim() || "Break",
                  });
                  return;
                }
                if (editingUnavailableId) {
                  setPendingDelete({
                    kind: "unavailable",
                    id: editingUnavailableId,
                    label: panelForm.notes.trim() || "Blocked time",
                  });
                }
              }}
            />
          ) : null}
        </div>
      ) : null}

      <AdminConfirmDialog
        open={Boolean(pendingDelete)}
        title={pendingDelete?.kind === "break" ? "Delete break?" : "Delete blocked time?"}
        description={
          pendingDelete
            ? `This will remove “${pendingDelete.label}” from your schedule.`
            : ""
        }
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteBreakMutation.isPending || deleteUnavailableMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </section>
  );
}

function minutesToClock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
