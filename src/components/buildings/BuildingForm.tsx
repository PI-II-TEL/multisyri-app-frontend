"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { Building, BuildingCreate } from "@/types/buildings";

interface BuildingFormProps {
  open: boolean;
  initial?: Building;
  onSave: (data: BuildingCreate) => Promise<void>;
  onClose: () => void;
}

export function BuildingForm({
  open,
  initial,
  onSave,
  onClose,
}: BuildingFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(initial);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setIsLoading(true);
    setError(null);
    try {
      await onSave({ name: trimmed });
      setName("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Editar Edificio" : "Nuevo Edificio"}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="building-name" className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
            Nombre del edificio
          </label>
          <input
            id="building-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Bloque A"
            required
            className="w-full rounded-xl border border-[#E5E7EB] px-4 py-3 text-sm text-[#0A2463] outline-none placeholder:text-gray-300 focus:border-[#0A2463] focus:ring-2 focus:ring-[#0A2463]/10"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" type="button" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" isLoading={isLoading}>
            {isEditing ? "Guardar cambios" : "Crear edificio"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
