import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateBusiness } from "@/api/adminApi";
import { TextAreaField } from "@/components/TextAreaField";
import {
  EMPTY_PUBLIC_LOCATION_FORM,
  formatPublicLocationSummary,
  publicLocationFormFromApi,
  publicLocationPayloadFromForm,
  validatePublicLocationForm,
  type PublicBusinessLocation,
  type PublicLocationFormState,
} from "@/lib/publicLocation";
import { getAdminSettingsErrorMessage } from "@/utils/errors";

type AdminBusinessLocationSectionProps = {
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

export function AdminBusinessLocationSection({
  businessId,
  publicLocation,
  disabled = false,
}: AdminBusinessLocationSectionProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [draftForm, setDraftForm] = useState<PublicLocationFormState>(EMPTY_PUBLIC_LOCATION_FORM);
  const [error, setError] = useState<string | null>(null);

  const savedForm = publicLocationFormFromApi(publicLocation);
  const summary = formatPublicLocationSummary(publicLocation);

  useEffect(() => {
    if (!isEditing) {
      setDraftForm(publicLocationFormFromApi(publicLocation));
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

  function updateDraftForm<K extends keyof PublicLocationFormState>(
    key: K,
    value: PublicLocationFormState[K],
  ) {
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

  async function handleSave() {
    const validationError = validatePublicLocationForm(draftForm);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await saveMutation.mutateAsync({
        public_location: publicLocationPayloadFromForm(draftForm),
      });
    } catch (err) {
      setError(getAdminSettingsErrorMessage(err, "Could not save business location."));
    }
  }

  const saving = saveMutation.isPending;
  const controlsDisabled = disabled || saving;

  if (!isEditing) {
    return (
      <div
        className="rounded-xl border border-slate-200 bg-slate-50 p-4"
        data-testid="admin-business-location-section"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900">Business location</p>
            <p
              className="mt-1 text-sm text-slate-600"
              data-testid="admin-business-location-summary"
            >
              {summary ?? "No public location set"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleEdit}
            disabled={disabled}
            className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            data-testid="admin-business-location-edit"
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
      data-testid="admin-business-location-section"
    >
      <div>
        <p className="text-sm font-medium text-slate-900">Business location</p>
        <p className="mt-1 text-xs text-slate-600">
          Used on your public business page and marketplace listing. Map support is coming later.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2" data-testid="admin-business-location-form">
        <div>
          <FieldLabel htmlFor="locationCountry">Country</FieldLabel>
          <TextInput
            id="locationCountry"
            value={draftForm.country}
            disabled={controlsDisabled}
            onChange={(value) => updateDraftForm("country", value)}
          />
        </div>
        <div>
          <FieldLabel htmlFor="locationCity">City</FieldLabel>
          <TextInput
            id="locationCity"
            value={draftForm.city}
            disabled={controlsDisabled}
            onChange={(value) => updateDraftForm("city", value)}
          />
        </div>
        <div>
          <FieldLabel htmlFor="locationDistrict">District / area</FieldLabel>
          <TextInput
            id="locationDistrict"
            value={draftForm.district_or_area}
            disabled={controlsDisabled}
            onChange={(value) => updateDraftForm("district_or_area", value)}
          />
        </div>
        <div>
          <FieldLabel htmlFor="locationPostalCode">Postal code</FieldLabel>
          <TextInput
            id="locationPostalCode"
            value={draftForm.postal_code}
            disabled={controlsDisabled}
            onChange={(value) => updateDraftForm("postal_code", value)}
          />
        </div>
        <div className="sm:col-span-2">
          <FieldLabel htmlFor="locationStreet">Street, building, office</FieldLabel>
          <TextInput
            id="locationStreet"
            value={draftForm.public_address}
            disabled={controlsDisabled}
            onChange={(value) => updateDraftForm("public_address", value)}
          />
        </div>
        <div className="sm:col-span-2">
          <TextAreaField
            name="locationNote"
            label="Directions note"
            value={draftForm.location_note}
            disabled={controlsDisabled}
            onChange={(event) => updateDraftForm("location_note", event.target.value)}
          />
        </div>
        {/* Map pin latitude/longitude are preserved in draft state but hidden until map support ships. */}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={controlsDisabled}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          data-testid="admin-business-location-save"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={controlsDisabled}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          data-testid="admin-business-location-cancel"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
