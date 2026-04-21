"use client";

import { useRouter } from "next/navigation";
import { BuildingList } from "@/components/buildings/BuildingList";
import { Icon } from "@/components/ui/Icon";

export default function BuildingsListPage() {
  const router = useRouter();

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
              Gestión de Edificios
            </h1>
            <p className="text-xs text-[#6B7280]">Infraestructura Campus</p>
          </div>
        </div>
        <button
          className="rounded-full p-1.5 text-[#6B7280] hover:bg-gray-100"
          aria-label="Notificaciones"
        >
          <Icon name="bell" size={20} />
        </button>
      </header>

      {/* Section label */}
      <div className="px-5 pb-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9CA3AF]">
          Edificios
        </p>
      </div>

      {/* Content */}
      <div className="px-4">
        <BuildingList />
      </div>
    </div>
  );
}
