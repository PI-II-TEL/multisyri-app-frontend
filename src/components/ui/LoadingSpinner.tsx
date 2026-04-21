interface LoadingSpinnerProps {
  label?: string;
}

export function LoadingSpinner({ label = "Cargando..." }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[#0A2463] border-t-transparent" />
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  );
}
