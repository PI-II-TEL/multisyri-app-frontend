"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClassroomForm } from "./ClassroomForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Icon } from "@/components/ui/Icon";
import { useClassrooms } from "@/hooks/useClassrooms";
import { useAuth } from "@/contexts/AuthContext";
import type { Classroom } from "@/types/buildings";

interface ClassroomListProps {
  buildingId: string;
  autoCreate?: boolean;
}

export function ClassroomList({ buildingId, autoCreate = false }: ClassroomListProps) {
  const router = useRouter();
  const { isCoordinator } = useAuth();
  const { classrooms, isLoading, error, createClassroom, updateClassroom, deleteClassroom } =
    useClassrooms(buildingId);

  const [showCreate, setShowCreate] = useState(autoCreate);
  const [editing, setEditing] = useState<Classroom | null>(null);
  const [deleting, setDeleting] = useState<Classroom | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  async function handleDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await deleteClassroom(deleting.id);
      setDeleting(null);
    } finally {
      setDeleteLoading(false);
    }
  }

  if (isLoading) return <LoadingSpinner label="Cargando salones..." />;

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {classrooms.length === 0 ? (
          <EmptyState
            title="Sin salones"
            description="Este edificio no tiene salones registrados aún."
          />
        ) : (
          classrooms.map((c) => (
            <div key={c.id} className="group relative">
              <button
                onClick={() => router.push(`/buildings/${buildingId}/${c.id}`)}
                className="flex w-full items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3.5 text-left transition-colors hover:bg-gray-50"
              >
                <span className="flex-shrink-0 text-[#1565C0]">
                  <Icon name="door" size={20} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-semibold text-[#0A2463]">
                    {c.name}
                  </span>
                  <span className="text-xs text-[#9CA3AF]">Ver equipos asignados</span>
                </span>
                <span className="flex-shrink-0 text-[#9CA3AF]">
                  <Icon name="chevron-right" size={18} />
                </span>
              </button>

              {isCoordinator && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditing(c); }}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-[#0A2463]"
                    aria-label="Editar"
                  >
                    <Icon name="pencil" size={15} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleting(c); }}
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

        {isCoordinator && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#0A2463]/30 py-3.5 text-sm font-semibold text-[#0A2463] transition-colors hover:bg-[#EFF6FF]"
          >
            <Icon name="plus" size={18} />
            Nuevo Salón
          </button>
        )}
      </div>

      <ClassroomForm
        open={showCreate}
        onSave={async (data) => { await createClassroom(data.name); }}
        onClose={() => setShowCreate(false)}
      />

      {editing && (
        <ClassroomForm
          open={true}
          initial={editing}
          onSave={async (data) => {
            await updateClassroom(editing.id, data);
            setEditing(null);
            return;
          }}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Eliminar salón"
        description={`¿Eliminar "${deleting?.name}"? Se eliminarán también sus equipos asignados.`}
        isLoading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
