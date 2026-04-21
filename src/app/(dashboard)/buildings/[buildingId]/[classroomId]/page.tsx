"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { EquipmentManager } from "@/components/buildings/EquipmentManager";
import { ClassroomForm } from "@/components/buildings/ClassroomForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/contexts/AuthContext";
import * as api from "@/services/buildings";

export default function ClassroomDetailPage() {
  const { buildingId, classroomId } = useParams<{
    buildingId: string;
    classroomId: string;
  }>();
  const router = useRouter();
  const { isCoordinator } = useAuth();

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [classroomName, setClassroomName] = useState<string>("");

  async function handleUpdate(data: { name: string }) {
    await api.updateClassroom(classroomId, data);
    setClassroomName(data.name);
    setShowEdit(false);
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      await api.deleteClassroom(classroomId);
      router.push(`/buildings/${buildingId}`);
    } catch {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="flex flex-col">
      {/* App Bar */}
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => router.back()}
            className="rounded-full p-1 text-[#0A2463] hover:bg-gray-100"
            aria-label="Volver"
          >
            <Icon name="chevron-left" size={22} />
          </button>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-lg font-bold text-[#0A2463]">
              {classroomName || "Salón"}
            </h1>
            <p className="text-xs text-[#6B7280]">Equipos asignados</p>
          </div>
        </div>

        {isCoordinator && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowEdit(true)}
              className="rounded-full p-1.5 text-[#6B7280] hover:bg-gray-100"
              aria-label="Editar salón"
            >
              <Icon name="pencil" size={18} />
            </button>
            <button
              onClick={() => setShowDelete(true)}
              className="rounded-full p-1.5 text-red-500 hover:bg-red-50"
              aria-label="Eliminar salón"
            >
              <Icon name="trash" size={18} />
            </button>
          </div>
        )}
      </header>

      {/* Section label */}
      <div className="px-5 pb-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9CA3AF]">
          Equipos asignados
        </p>
      </div>

      {/* Equipment manager */}
      <div className="px-4">
        <EquipmentManager classroomId={classroomId} />
      </div>

      {showEdit && (
        <ClassroomForm
          open
          initial={{ id: classroomId, name: classroomName, building_id: buildingId }}
          onSave={handleUpdate}
          onClose={() => setShowEdit(false)}
        />
      )}

      <ConfirmDialog
        open={showDelete}
        title="Eliminar salón"
        description="¿Eliminar este salón? Se eliminarán también sus equipos asignados."
        isLoading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}
