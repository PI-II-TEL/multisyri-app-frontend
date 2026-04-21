import { Icon } from "@/components/ui/Icon";
import type { Building } from "@/types/buildings";

interface BuildingCardProps {
  building: Building;
  classroomCount?: number;
  onClick: () => void;
}

export function BuildingCard({
  building,
  classroomCount,
  onClick,
}: BuildingCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-4 py-3.5 text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
    >
      <span className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[#16A34A]" />
      <span className="flex-shrink-0 text-[#1565C0]">
        <Icon name="building" size={22} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-semibold text-[#0A2463]">
          {building.name}
        </span>
        {classroomCount !== undefined && (
          <span className="text-xs text-[#6B7280]">
            {classroomCount} {classroomCount === 1 ? "salón" : "salones"}
          </span>
        )}
      </span>
      <span className="flex-shrink-0 text-[#9CA3AF]">
        <Icon name="chevron-right" size={18} />
      </span>
    </button>
  );
}
