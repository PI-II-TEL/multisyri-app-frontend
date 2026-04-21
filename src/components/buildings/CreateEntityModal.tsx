"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useBuildings } from "@/hooks/useBuildings";

type Step = "choose" | "select-building";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateEntityModal({ open, onClose }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const { buildings, isLoading } = useBuildings();

  function handleClose() {
    setStep("choose");
    onClose();
  }

  function handleEdificio() {
    handleClose();
    router.push("/buildings/list?new=building");
  }

  function handleBuilding(buildingId: string) {
    handleClose();
    router.push(`/buildings/${buildingId}?new=classroom`);
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={step === "choose" ? "¿Qué deseas crear?" : "Selecciona el edificio"}
    >
      {step === "choose" ? (
        <div className="flex flex-col gap-3">
          <button
            onClick={handleEdificio}
            className="flex items-center gap-4 rounded-xl border-2 border-[#E5E7EB] p-4 text-left transition-colors hover:border-[#0A2463] hover:bg-[#F8FAFF]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF]">
              <Icon name="building" size={22} className="text-[#0A2463]" />
            </div>
            <div className="flex flex-1 flex-col gap-0.5">
              <p className="text-[15px] font-semibold text-[#111827]">Edificio</p>
              <p className="text-[12px] text-[#6B7280]">
                Agregar un nuevo edificio al campus
              </p>
            </div>
            <Icon name="chevron-right" size={18} className="shrink-0 text-[#9CA3AF]" />
          </button>

          <button
            onClick={() => setStep("select-building")}
            className="flex items-center gap-4 rounded-xl border-2 border-[#E5E7EB] p-4 text-left transition-colors hover:border-[#0A2463] hover:bg-[#F8FAFF]"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF]">
              <Icon name="door" size={22} className="text-[#0A2463]" />
            </div>
            <div className="flex flex-1 flex-col gap-0.5">
              <p className="text-[15px] font-semibold text-[#111827]">Salón</p>
              <p className="text-[12px] text-[#6B7280]">
                Agregar un salón a un edificio existente
              </p>
            </div>
            <Icon name="chevron-right" size={18} className="shrink-0 text-[#9CA3AF]" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setStep("choose")}
            className="-mt-1 mb-1 flex items-center gap-1 self-start text-sm text-[#6B7280] hover:text-[#0A2463]"
          >
            <Icon name="chevron-left" size={16} />
            Volver
          </button>
          <p className="text-[13px] text-[#6B7280]">
            El salón se creará dentro del edificio que selecciones.
          </p>

          {isLoading ? (
            <LoadingSpinner label="Cargando edificios..." />
          ) : buildings.length === 0 ? (
            <p className="py-4 text-center text-sm text-[#6B7280]">
              No hay edificios. Crea uno primero.
            </p>
          ) : (
            <div className="flex max-h-60 flex-col gap-2 overflow-y-auto">
              {buildings.map((b) => (
                <button
                  key={b.id}
                  onClick={() => handleBuilding(b.id)}
                  className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] px-4 py-3 text-left transition-colors hover:border-[#0A2463] hover:bg-[#F8FAFF]"
                >
                  <Icon name="building" size={18} className="shrink-0 text-[#0A2463]" />
                  <span className="flex-1 text-[14px] font-semibold text-[#111827]">
                    {b.name}
                  </span>
                  <Icon name="chevron-right" size={16} className="shrink-0 text-[#9CA3AF]" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
