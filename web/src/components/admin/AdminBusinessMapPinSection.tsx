import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateBusiness } from "@/api/adminApi";
import {
  EMPTY_MAP_PIN_FORM,
  formatMapPinSummary,
  hasMapPin,
  mapPinFormFromApi,
  mapPinPayloadFromLocation,
  validateMapPinForm,
  type MapPinFormState,
  type PublicBusinessLocation,
} from "@/lib/publicLocation";
import { getAdminSettingsErrorMessage } from "@/utils/errors";

type AdminBusinessMapPinSectionProps = {
  businessId: string;
  publicLocation: PublicBusinessLocation | null | undefined;
  disabled?: boolean;
};

function FieldLabel({ children, htmlFor }: { children: string; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
      {children}
    </label>
  );
}

function TextInput({
  id,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
    />
  );
}

export function AdminBusinessMapPinSection({
  businessId,
  publicLocation,
  disabled = false,
}: AdminBusinessMapPinSectionProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [draftForm, setDraftForm] = useState<MapPinFormState>(EMPTY_MAP_PIN_FORM);
  const [error, setError] = useState<string | null>(null);

  const savedForm = mapPinFormFromApi(publicLocation);
  const summary = formatMapPinSummary(publicLocation);
  const pinIsSet = hasMapPin(publicLocation);

  useEffect(() => {
    if (!isEditing) {
      setDraftForm(mapPinFormFromApi(publicLocation));
    }
  }, [publicLocation, isEditing]);

  const saveMutation = useMutation({
    mutationFn: (payload: { public_location: PublicBusinessLocation }) =>
      updateBusiness(businessId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-business", businessId] });
      setIsEditing(false);
      setError(null);
    },
  });

  function updateDraftForm<K extends keyof MapPinFormState>(key: K, value: MapPinFormState[K]) {
    setDraftForm((current) => ({ ...current, [key]: value }));
  }

  function handleEdit() {
    setDraftForm(savedForm);
    setError(null);
    setIsEditing(true);
  }

  function handleCancel() {
    setDraftForm(savedForm);
    setError(null);
    setIsEditing(false);
  }

  async function savePinForm(form: MapPinFormState) {
    const validationError = validateMapPinForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await saveMutation.mutateAsync({
        public_location: mapPinPayloadFromLocation(publicLocation, form),
      });
    } catch (err) {
      setError(getAdminSettingsErrorMessage(err, "Could not save map pin."));
    }
  }

  async function handleSave() {
    await savePinForm(draftForm);
  }

  async function handleClearPin() {
    await savePinForm(EMPTY_MAP_PIN_FORM);
  }

  const saving = saveMutation.isPending;
  const controlsDisabled = disabled || saving;

  if (!isEditing) {
    return (
      <div
        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
        data-testid="admin-business-map-pin-section"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900">Map pin</p>
            <p className="mt-1 text-sm text-slate-600" data-testid="admin-business-map-pin-summary">
              {summary}
            </p>
          </div>
          <button
            type="button"
            onClick={handleEdit}
            disabled={disabled}
            className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            data-testid="admin-business-map-pin-edit"
          >
            Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3"
      data-testid="admin-business-map-pin-section"
    >
      <div>
        <p className="text-sm font-medium text-slate-900">Map pin</p>
        <p className="mt-1 text-xs text-slate-600">Optional. Used later for map discovery.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2" data-testid="admin-business-map-pin-form">
        <div>
          <FieldLabel htmlFor="mapPinLatitude">Latitude</FieldLabel>
          <TextInput
            id="mapPinLatitude"
            value={draftForm.latitude}
            disabled={controlsDisabled}
            placeholder="Optional"
            onChange={(value) => updateDraftForm("latitude", value)}
          />
        </div>
        <div>
          <FieldLabel htmlFor="mapPinLongitude">Longitude</FieldLabel>
          <TextInput
            id="mapPinLongitude"
            value={draftForm.longitude}
            disabled={controlsDisabled}
            placeholder="Optional"
            onChange={(value) => updateDraftForm("longitude", value)}
          />
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={controlsDisabled}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          data-testid="admin-business-map-pin-save"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={controlsDisabled}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          data-testid="admin-business-map-pin-cancel"
        >
          Cancel
        </button>
        {pinIsSet ? (
          <button
            type="button"
            onClick={() => void handleClearPin()}
            disabled={controlsDisabled}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            data-testid="admin-business-map-pin-clear"
          >
            Clear pin
          </button>
        ) : null}
      </div>
    </div>
  );
}
