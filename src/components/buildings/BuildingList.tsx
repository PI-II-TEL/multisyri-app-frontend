"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BuildingCard } from "./BuildingCard";
import { BuildingForm } from "./BuildingForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useBuildings } from "@/hooks/useBuildings";
import { useAuth } from "@/contexts/AuthContext";
import type { Building, BuildingCreate } from "@/types/buildings";

export function BuildingList({ autoCreate = false }: { autoCreate?: boolean }) {
  const router = useRouter();
  const { isCoordinator } = useAuth();
  const { buildings, isLoading, error, createBuilding, updateBuilding, deleteBuilding } =
    useBuildings();

  const [showCreate, setShowCreate] = useState(autoCreate);
  const [editing, setEditing] = useState<Building | null>(null);
  const [deleting, setDeleting] = useState<Building | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleCreate(data: BuildingCreate) {
    await createBuilding(data);
  }

  async function handleUpdate(data: BuildingCreate) {
    if (!editing) return;
    await updateBuilding(editing.id, data);
    setEditing(null);
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await deleteBuilding(deleting.id);
      setDeleting(null);
    } finally {
      setDeleteLoading(false);
    }
  }

  if (isLoading) return <LoadingSpinner label="Cargando edificios..." />;

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {buildings.length === 0 ? (
          <EmptyState
            title="Sin edificios"
            description="Aún no hay edificios registrados en el campus."
          />
        ) : (
          buildings.map((b) => (
            <div key={b.id} className="group relative">
              <BuildingCard
                building={b}
                onClick={() => router.push(`/buildings/${b.id}`)}
              />
              {isCoordinator && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditing(b); }}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-[#0A2463]"
                    aria-label="Editar"
                  >
                    <Icon name="pencil" size={15} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleting(b); }}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    aria-label="Eliminar"
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {isCoordinator && (
        <button
          onClick={() => setShowCreate(true)}
          className="fixed bottom-28 right-5 flex h-13 w-13 items-center justify-center rounded-2xl bg-[#0A2463] text-white shadow-lg hover:bg-[#0d2f7a] active:scale-95 transition-transform"
          aria-label="Nuevo edificio"
        >
          <Icon name="plus" size={24} />
        </button>
      )}

      <BuildingForm
        open={showCreate}
        onSave={handleCreate}
        onClose={() => setShowCreate(false)}
      />

      {editing && (
        <BuildingForm
          open={true}
          initial={editing}
          onSave={handleUpdate}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar edificio"
        description={`¿Eliminar "${deleting?.name}"? Se eliminarán también todos sus salones y equipos.`}
        isLoading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
