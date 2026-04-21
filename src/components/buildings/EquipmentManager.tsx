"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useEquipment } from "@/hooks/useEquipment";
import { useAuth } from "@/contexts/AuthContext";
import { ALL_FAULT_TYPES, FAULT_TYPE_LABELS } from "@/types/buildings";
import type { FaultType } from "@/types/buildings";

type IconName = "projector" | "speakers" | "monitor" | "wrench";

const FAULT_ICON: Record<FaultType, IconName> = {
  PROJECTOR: "projector",
  SPEAKERS: "speakers",
  PC: "monitor",
  OTHER: "wrench",
};

interface EquipmentManagerProps {
  classroomId: string;
}

export function EquipmentManager({ classroomId }: EquipmentManagerProps) {
  const { isCoordinator } = useAuth();
  const { assignedTypes, isLoading, error, addEquipment, removeEquipment } =
    useEquipment(classroomId);

  // Local pending state: starts equal to server state, tracks unsaved toggles
  const [pending, setPending] = useState<Set<FaultType> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Use pending if set, otherwise reflect server state
  const effective = pending ?? assignedTypes;

  function toggle(type: FaultType) {
    if (!isCoordinator) return;
    const base = pending ?? new Set(assignedTypes);
    const next = new Set(base);
    if (next.has(type)) next.delete(type);
    else next.add(type);
    setPending(next);
    setSaveSuccess(false);
  }

  function isDirty() {
    if (!pending) return false;
    if (pending.size !== assignedTypes.size) return true;
    for (const t of pending) if (!assignedTypes.has(t)) return true;
    return false;
  }

  async function handleSave() {
    if (!pending) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const toAdd = ALL_FAULT_TYPES.filter(
        (t) => pending.has(t) && !assignedTypes.has(t),
      );
      const toRemove = ALL_FAULT_TYPES.filter(
        (t) => !pending.has(t) && assignedTypes.has(t),
      );
      await Promise.all([
        ...toAdd.map((t) => addEquipment(t)),
        ...toRemove.map((t) => removeEquipment(t)),
      ]);
      setPending(null);
      setSaveSuccess(true);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-[#9CA3AF]">
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#0A2463] border-t-transparent" />
        Cargando equipos...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Info banner */}
      <div className="flex items-start gap-2.5 rounded-xl bg-[#EFF6FF] p-3.5">
        <span className="mt-0.5 flex-shrink-0 text-[#1565C0]">
          <Icon name="info" size={16} />
        </span>
        <p className="text-xs text-[#1565C0] leading-relaxed">
          Solo los equipos marcados aparecerán como opciones al reportar una
          falla en este salón.
        </p>
      </div>

      {/* Equipment rows */}
      {ALL_FAULT_TYPES.map((type) => {
        const assigned = effective.has(type);
        return (
          <button
            key={type}
            onClick={() => toggle(type)}
            disabled={!isCoordinator}
            className={[
              "flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors",
              assigned
                ? "border-[#86EFAC] bg-[#DCFCE7]"
                : "border-[#E5E7EB] bg-[#F9FAFB]",
              isCoordinator && "cursor-pointer hover:opacity-80",
              !isCoordinator && "cursor-default",
            ].join(" ")}
            aria-pressed={assigned}
          >
            <span className={assigned ? "text-[#16A34A]" : "text-[#9CA3AF]"}>
              <Icon name={FAULT_ICON[type]} size={22} />
            </span>
            <span className="flex flex-1 flex-col gap-0.5">
              <span
                className={`text-sm font-semibold ${assigned ? "text-[#15803D]" : "text-[#6B7280]"}`}
              >
                {FAULT_TYPE_LABELS[type]}
              </span>
              <span
                className={`text-xs ${assigned ? "text-[#16A34A]" : "text-[#9CA3AF]"}`}
              >
                {type}
              </span>
            </span>
            <span
              className={[
                "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2",
                assigned
                  ? "border-[#16A34A] bg-[#16A34A] text-white"
                  : "border-[#D1D5DB] bg-white text-[#9CA3AF]",
              ].join(" ")}
            >
              <Icon name={assigned ? "check" : "plus"} size={14} />
            </span>
          </button>
        );
      })}

      {/* Save actions — coordinator only */}
      {isCoordinator && (
        <div className="mt-2 flex flex-col gap-2">
          {saveError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              {saveError}
            </p>
          )}
          {saveSuccess && !isDirty() && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
              Equipos guardados correctamente.
            </p>
          )}
          <Button
            onClick={handleSave}
            isLoading={isSaving}
            disabled={!isDirty()}
            className="w-full"
          >
            <Icon name="save" size={18} />
            Guardar Cambios
          </Button>
          <div className="flex items-center justify-center gap-1.5 rounded-lg bg-[#EFF6FF] py-2">
            <span className="text-[#1565C0]">
              <Icon name="shield" size={14} />
            </span>
            <span className="text-xs text-[#1565C0]">Solo coordinadores</span>
          </div>
        </div>
      )}
    </div>
  );
}
