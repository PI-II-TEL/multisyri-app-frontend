import type { SVGProps } from "react";

type IconName =
  | "building"
  | "door"
  | "projector"
  | "speakers"
  | "monitor"
  | "wrench"
  | "chevron-right"
  | "chevron-left"
  | "plus"
  | "pencil"
  | "trash"
  | "shield"
  | "check"
  | "info"
  | "alert-circle"
  | "x"
  | "map-pin"
  | "life-buoy"
  | "users"
  | "bell"
  | "save"
  | "loader"
  | "zap"
  | "calendar-plus"
  | "circle-plus"
  | "link"
  | "log-out"
  | "bar-chart"
  | "clock"
  | "filter";

const PATHS: Record<IconName, string> = {
  building:
    "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2 M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2 M10 6h4 M10 10h4 M10 14h4 M10 18h4",
  door: "M13 4h3a2 2 0 0 1 2 2v14 M2 20h3 M13 20h9 M10 12v.01 M13 4.562v16.157a1 1 0 0 1-1.726.69L4.856 15.86a2 2 0 0 1-.5-1.352V6.7a2 2 0 0 1 .504-1.348L11.275 1.21A1 1 0 0 1 13 1.954",
  projector:
    "M5 7h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2 M12 19v2 M8 19h8 M2 11h3",
  speakers:
    "M11 5 6 9H2v6h4l5 4V5Z M15.54 8.46a5 5 0 0 1 0 7.07 M19.07 4.93a10 10 0 0 1 0 14.14",
  monitor:
    "M20 3H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z M8 21h8 M12 17v4",
  wrench:
    "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z",
  "chevron-right": "M9 18l6-6-6-6",
  "chevron-left": "M15 18l-6-6 6-6",
  plus: "M12 5v14 M5 12h14",
  pencil:
    "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z M15 5l4 4",
  trash:
    "M3 6h18 M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6 M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2 M10 11v6 M14 11v6",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10",
  check: "M20 6 9 17l-5-5",
  info: "M12 16v-4 M12 8h.01 M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z",
  "alert-circle":
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z M12 8v4 M12 16h.01",
  x: "M18 6 6 18 M6 6l12 12",
  "map-pin":
    "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z M12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  "life-buoy":
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M4.93 4.93l4.24 4.24 M14.83 14.83l4.24 4.24 M14.83 9.17l4.24-4.24 M4.93 19.07l4.24-4.24",
  users:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
  bell: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a1.94 1.94 0 0 0 3.4 0",
  save: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z M17 21v-8H7v8 M7 3v5h8",
  loader: "M21 12a9 9 0 1 1-6.219-8.56",
  zap: "M13 2L3 14L12 14L11 22L21 10L12 10Z",
  "calendar-plus":
    "M8 2v4 M16 2v4 M21 13V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7 M3 10h18 M16 19h6 M19 16v6",
  "circle-plus":
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z M8 12h8 M12 8v8",
  link: "M10 13a5 5 0 0 0 7.54 0.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71 M14 11a5 5 0 0 0-7.54-0.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  "log-out": "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
  "bar-chart": "M12 20V10 M18 20V4 M6 20v-4",
  "clock": "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z M12 6v6l4 2",
  "filter": "M22 3H2l8 9.46V19l4 2v-8.54L22 3",
};

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 20, className, ...props }: IconProps) {
  const paths = PATHS[name].split(" M ").map((p, i) => (i === 0 ? p : "M " + p));
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
