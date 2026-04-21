"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { useInfraStats } from "@/hooks/useInfraStats";
import { CreateEntityModal } from "@/components/buildings/CreateEntityModal";

export default function AdminPanelPage() {
  const router = useRouter();
  const { stats, loading } = useInfraStats();
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="flex flex-col">
      {/* App Bar */}
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-bold text-[#0A2463]">Panel Admin</h1>
          <p className="text-xs text-[#6B7280]">Infraestructura y Auditoría</p>
        </div>
        <button
          className="rounded-full p-1.5 text-[#6B7280] hover:bg-gray-100"
          aria-label="Notificaciones"
        >
          <Icon name="bell" size={20} />
        </button>
      </header>

      <div className="flex flex-col gap-4 px-4 pb-4">
        {/* Emergency Card */}
        <div className="flex items-center gap-3 rounded-[14px] border-[1.5px] border-[#FCA5A5] bg-[#FEF2F2] p-4">
          <Icon name="zap" size={28} className="shrink-0 text-[#DC2626]" />
          <div className="flex flex-1 flex-col gap-1">
            <p className="text-[15px] font-bold text-[#991B1B]">
              Cierre Forzado de Turno
            </p>
            <p className="text-[12px] text-[#DC2626]">
              Usar si un monitor olvidó hacer Check-Out
            </p>
          </div>
          <button className="shrink-0 rounded-lg bg-[#DC2626] px-3 py-2 text-[13px] font-bold text-white">
            Forzar
          </button>
        </div>

        {/* Infraestructura */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9CA3AF]">
            Infraestructura
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={() => router.push("/buildings/list")}
              className="flex flex-col items-center gap-2 rounded-xl border-[1.5px] border-[#E5E7EB] p-4"
            >
              <Icon name="building" size={24} className="text-[#0A2463]" />
              <p className="text-[13px] font-semibold text-[#111827]">Edificios</p>
              <p className="text-[11px] text-[#6B7280]">
                {loading ? "—" : `${stats?.total_buildings ?? 0} activos`}
              </p>
            </button>
            <button
              onClick={() => router.push("/buildings/classrooms")}
              className="flex flex-col items-center gap-2 rounded-xl border-[1.5px] border-[#E5E7EB] p-4"
            >
              <Icon name="door" size={24} className="text-[#0A2463]" />
              <p className="text-[13px] font-semibold text-[#111827]">Salones</p>
              <p className="text-[11px] text-[#6B7280]">
                {loading ? "—" : `${stats?.total_classrooms ?? 0} totales`}
              </p>
            </button>
            <button
              onClick={() => router.push("/buildings/list")}
              className="flex flex-col items-center gap-2 rounded-xl border-[1.5px] border-[#E5E7EB] p-4"
            >
              <Icon name="monitor" size={24} className="text-[#0A2463]" />
              <p className="text-[13px] font-semibold text-[#111827]">Equipos</p>
              <p className="text-[11px] text-[#6B7280]">
                {loading ? "—" : `${stats?.total_equipment ?? 0} items`}
              </p>
            </button>
          </div>
        </div>

        {/* Turnos y Programación */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#9CA3AF]">
            Turnos y Programación
          </p>

          {/* Cargar Programación — sin acción */}
          <div className="flex items-center gap-3 rounded-xl border-[1.5px] border-[#E5E7EB] p-3.5">
            <Icon name="calendar-plus" size={22} className="shrink-0 text-[#1565C0]" />
            <div className="flex flex-1 flex-col gap-0.5">
              <p className="text-[14px] font-semibold text-[#111827]">
                Cargar Programación
              </p>
              <p className="text-[12px] text-[#6B7280]">
                Importar turnos desde archivo CSV
              </p>
            </div>
            <Icon name="chevron-right" size={18} className="text-[#9CA3AF]" />
          </div>

          {/* Crear Edificio / Salón */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-3 rounded-xl border-[1.5px] border-[#E5E7EB] p-3.5 text-left"
          >
            <Icon name="circle-plus" size={22} className="shrink-0 text-[#1565C0]" />
            <div className="flex flex-1 flex-col gap-0.5">
              <p className="text-[14px] font-semibold text-[#111827]">
                Crear Edificio / Salón
              </p>
              <p className="text-[12px] text-[#6B7280]">
                Agregar nuevos espacios al campus
              </p>
            </div>
            <Icon name="chevron-right" size={18} className="text-[#9CA3AF]" />
          </button>

          {/* Asignar Equipos */}
          <button
            onClick={() => router.push("/buildings/list")}
            className="flex items-center gap-3 rounded-xl border-[1.5px] border-[#E5E7EB] p-3.5 text-left"
          >
            <Icon name="link" size={22} className="shrink-0 text-[#1565C0]" />
            <div className="flex flex-1 flex-col gap-0.5">
              <p className="text-[14px] font-semibold text-[#111827]">
                Asignar Equipos
              </p>
              <p className="text-[12px] text-[#6B7280]">
                Vincular equipos a salones
              </p>
            </div>
            <Icon name="chevron-right" size={18} className="text-[#9CA3AF]" />
          </button>
        </div>
      </div>

      <CreateEntityModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
