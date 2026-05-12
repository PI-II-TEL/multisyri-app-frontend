'use client'
import { useRouter } from 'next/navigation'

type LogCategory = 'SEGURIDAD' | 'ADMIN' | 'TURNO' | 'TICKET' | 'SISTEMA'

interface LogEntry {
  id: string
  category: LogCategory
  time: string
  title: string
  detail: string
}

interface LogDay {
  label: string
  entries: LogEntry[]
}

const CATEGORY_STYLE: Record<LogCategory, { color: string; bg: string }> = {
  SEGURIDAD: { color: '#DC2626', bg: '#FEF2F2' },
  ADMIN:     { color: '#1565C0', bg: '#EFF6FF' },
  TURNO:     { color: '#16A34A', bg: '#F0FDF4' },
  TICKET:    { color: '#D97706', bg: '#FFFBEB' },
  SISTEMA:   { color: '#6B7280', bg: '#F3F4F6' },
}

const MOCK_LOG: LogDay[] = [
  {
    label: 'Hoy · 26 May 2026',
    entries: [
      {
        id: '1',
        category: 'SEGURIDAD',
        time: '03:15 AM',
        title: 'Cierre Forzado de Turno ejecutado',
        detail: 'Por: Coord. Sandra Gómez · Monitor: Carlos R.',
      },
      {
        id: '2',
        category: 'ADMIN',
        time: '08:02 AM',
        title: 'Ticket #TK-0038 escalado',
        detail: 'Por: Carlos R. → Sandra Gómez',
      },
      {
        id: '3',
        category: 'TURNO',
        time: '08:47 AM',
        title: 'Check-in registrado en Edificio A',
        detail: 'Monitor asignado',
      },
      {
        id: '4',
        category: 'TICKET',
        time: '07:44 AM',
        title: 'Ticket #TK-0042 creado',
        detail: 'Por: Carlos R. · Proyector · Sal. 305',
      },
    ],
  },
  {
    label: 'Ayer · 25 May 2026',
    entries: [
      {
        id: '5',
        category: 'SISTEMA',
        time: '11:22 PM',
        title: 'Turno Omitido aprobado',
        detail: 'Aprobado por: Sandra Gómez · Monitor: MP',
      },
    ],
  },
]

function CategoryBadge({ category }: { category: LogCategory }) {
  const { color, bg } = CATEGORY_STYLE[category]
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ color, background: bg }}
    >
      {category}
    </span>
  )
}

export default function AuditLogPage() {
  const router = useRouter()

  return (
    <div className="flex flex-col min-h-screen bg-[#F9FAFB]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="bg-white px-5 pt-5 pb-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-full w-9 h-9 flex items-center justify-center bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] transition-colors"
            aria-label="Volver"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <div className="flex flex-col gap-0">
            <h1 className="text-[18px] font-bold text-[#111827]">Log de Auditoría</h1>
            <p className="text-[12px] text-[#9CA3AF]">Registro inmutable de acciones</p>
          </div>
        </div>
        <button className="flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] px-3 py-2 text-[13px] font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          Filtrar
        </button>
      </div>

      {/* Log */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-5">
        {MOCK_LOG.map(day => (
          <div key={day.label} className="flex flex-col gap-3">
            {/* Day label */}
            <span className="text-[11px] font-semibold tracking-[0.5px] text-[#9CA3AF] uppercase px-1">
              {day.label}
            </span>

            {/* Entries */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB] divide-y divide-[#F3F4F6] overflow-hidden">
              {day.entries.map(entry => (
                <div key={entry.id} className="flex items-start gap-3 px-4 py-3.5">
                  {/* Dot */}
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5"
                    style={{ background: CATEGORY_STYLE[entry.category].color }}
                  />
                  {/* Content */}
                  <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CategoryBadge category={entry.category} />
                      <span className="text-[11px] text-[#9CA3AF]">{entry.time}</span>
                    </div>
                    <p className="text-[14px] font-semibold text-[#111827] leading-snug">{entry.title}</p>
                    <p className="text-[12px] text-[#6B7280]">{entry.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Footer note */}
        <div className="flex items-center justify-center gap-2 py-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
          </svg>
          <span className="text-[12px] text-[#D1D5DB]">Registro inmutable · Solo lectura</span>
        </div>
      </div>
    </div>
  )
}
