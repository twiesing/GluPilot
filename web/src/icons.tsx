// Schlanke Line-Icons (stroke = currentColor), passend zur klaren Ästhetik.
// Bewusst keine Emojis – überall echte SVG-Icons.

interface IconProps {
  size?: number;
}

function svgProps(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

// Wortmarke-Signet: Tropfen (Glukose) mit ansteigender Kurve (Führung/Dosis).
export function LogoMark({ size = 30 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden
    >
      <path
        d="M20 4.5c0 0 11.5 11 11.5 19.5a11.5 11.5 0 0 1-23 0C8.5 15.5 20 4.5 20 4.5Z"
        fill="var(--color-accent)"
      />
      <path
        d="M13 25.5 17 21.5l2.6 2.6L26 17"
        fill="none"
        stroke="var(--color-on-accent)"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="26" cy="17" r="1.5" fill="var(--color-on-accent)" />
    </svg>
  );
}

export function CameraIcon({ size = 22 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M3 8.5A2 2 0 0 1 5 6.5h1.4l1-1.6A2 2 0 0 1 10 4h4a2 2 0 0 1 1.7.9l1 1.6H18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      <circle cx="12" cy="12.5" r="3.4" />
    </svg>
  );
}

export function GalleryIcon({ size = 22 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="m4 17 4.5-4.2a2 2 0 0 1 2.7 0L20 20" />
    </svg>
  );
}

export function HistoryIcon({ size = 22 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M3.2 12a8.8 8.8 0 1 1 2.7 6.3" />
      <path d="M3.2 18v-4h4" />
      <path d="M12 8v4.3l3 1.8" />
    </svg>
  );
}

export function ShieldIcon({ size = 22 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M12 3.2 19 6v5.5c0 4.3-2.9 7.5-7 9-4.1-1.5-7-4.7-7-9V6Z" />
      <path d="M9.2 12.2 11.3 14 15 10" />
    </svg>
  );
}

export function GearIcon({ size = 22 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function TrashIcon({ size = 16 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M4 7h16" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
      <path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function DropIcon({ size = 16 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M12 3.5s6 6.2 6 10.2a6 6 0 0 1-12 0C6 9.7 12 3.5 12 3.5Z" />
    </svg>
  );
}

export function WarnIcon({ size = 16 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M12 4.5 21 19.5H3Z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function RefreshIcon({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8" />
      <path d="M20 4v4h-4" />
      <path d="M20 12a8 8 0 0 1-13.7 5.6L4 16" />
      <path d="M4 20v-4h4" />
    </svg>
  );
}

export function CalcIcon({ size = 26 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 7h8" />
      <path d="M8 11h2M11.5 11h.01M15 11h1" />
      <path d="M8 14h2M11.5 14h.01M15 14v3M8 17h5" />
    </svg>
  );
}
