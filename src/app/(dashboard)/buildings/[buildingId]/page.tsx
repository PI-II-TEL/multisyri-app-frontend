"use client";

import { useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ClassroomList } from "@/components/buildings/ClassroomList";
import { BuildingForm } from "@/components/buildings/BuildingForm";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/contexts/AuthContext";
import * as api from "@/services/buildings";

function BuildingDetailContent() {
  const { buildingId } = useParams<{ buildingId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isCoordinator } = useAuth();

  const autoCreateClassroom = searchParams.get("new") === "classroom";

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [buildingName, setBuildingName] = useState<string>("");

  async function handleUpdate(data: { name: string }) {
    await api.updateBuilding(buildingId, data);
    setBuildingName(data.name);
    setShowEdit(false);
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      await api.deleteBuilding(buildingId);
      router.push("/buildings/list");
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
              {buildingName || "Edificio"}
            </h1>
            <p className="text-xs text-[#6B7280]">Ver salones</p>
          </div>
        </div>

        {isCoordinator && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowEdit(true)}
              className="rounded-full p-1.5 text-[#6B7280] hover:bg-gray-100"
              aria-label="Editar edificio"
            >
              <Icon name="pencil" size={18} />
            </button>
            <button
              onClick={() => setShowDelete(true)}
              className="rounded-full p-1.5 text-red-500 hover:bg-red-50"
              aria-label="Eliminar edificio"
            >
              <Icon name="trash" size={18} />
            </button>
          </div>
        )}
      </header>

      <div className="px-5 pb-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9CA3AF]">
          Salones
        </p>
      </div>

      <div className="px-4">
        <ClassroomList buildingId={buildingId} autoCreate={autoCreateClassroom} />
      </div>

      {showEdit && (
        <BuildingForm
          open
          initial={{ id: buildingId, name: buildingName }}
          onSave={handleUpdate}
          onClose={() => setShowEdit(false)}
        />
      )}

      <ConfirmDialog
        open={showDelete}
        title="Eliminar edificio"
        description="¿Eliminar este edificio? Se eliminarán también todos sus salones y equipos."
        isLoading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  );
}

export default function BuildingDetailPage() {
  return (
    <Suspense>
      <BuildingDetailContent />
    </Suspense>
  );
}
