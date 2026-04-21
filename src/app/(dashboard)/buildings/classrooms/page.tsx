"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAllClassrooms } from "@/hooks/useAllClassrooms";
import type { ClassroomWithBuilding } from "@/services/buildings";

function groupByBuilding(
  classrooms: ClassroomWithBuilding[]
): { buildingId: string; buildingName: string; classrooms: ClassroomWithBuilding[] }[] {
  const map = new Map<string, { buildingId: string; buildingName: string; classrooms: ClassroomWithBuilding[] }>();
  for (const c of classrooms) {
    if (!map.has(c.building_id)) {
      map.set(c.building_id, { buildingId: c.building_id, buildingName: c.building_name, classrooms: [] });
    }
    map.get(c.building_id)!.classrooms.push(c);
  }
  return Array.from(map.values());
}

export default function AllClassroomsPage() {
  const router = useRouter();
  const { classrooms, loading, error } = useAllClassrooms();
  const groups = groupByBuilding(classrooms);

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
            <h1 className="text-lg font-bold text-[#0A2463]">Todos los Salones</h1>
            <p className="text-xs text-[#6B7280]">
              {loading ? "Cargando..." : `${classrooms.length} totales`}
            </p>
          </div>
        </div>
      </header>

      <div className="px-4 pb-4">
        {loading && <LoadingSpinner label="Cargando salones..." />}

        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</div>
        )}

        {!loading && !error && classrooms.length === 0 && (
          <EmptyState
            title="Sin salones"
            description="Aún no hay salones registrados en el campus."
          />
        )}

        {!loading && !error && groups.map((group) => (
          <div key={group.buildingId} className="mb-5">
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9CA3AF]">
              {group.buildingName}
            </p>
            <div className="flex flex-col gap-2">
              {group.classrooms.map((classroom) => (
                <button
                  key={classroom.id}
                  onClick={() =>
                    router.push(`/buildings/${classroom.building_id}/${classroom.id}`)
                  }
                  className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3 text-left hover:bg-gray-50 active:bg-gray-100"
                >
                  <Icon name="door" size={20} className="shrink-0 text-[#0A2463]" />
                  <span className="flex-1 text-[14px] font-semibold text-[#111827]">
                    {classroom.name}
                  </span>
                  <Icon name="chevron-right" size={16} className="text-[#9CA3AF]" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
