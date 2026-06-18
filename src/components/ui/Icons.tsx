// Minimal inline icon set (stroke-based, inherits currentColor) so we avoid an
// icon dependency. Each accepts standard SVG props.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

export const LogoIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M3 17.5 17.5 3l3.5 3.5L6.5 21H3z" />
    <path d="M14.5 6 18 9.5" />
  </svg>
);

export const SearchIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.2-3.2" />
  </svg>
);

export const FolderIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4l2 2.5h7A1.5 1.5 0 0 1 19 9v8.5A1.5 1.5 0 0 1 17.5 19h-13A1.5 1.5 0 0 1 3 17.5z" />
  </svg>
);

export const PlusIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const StarIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8-4.3-4.1 5.9-.9z" />
  </svg>
);

export const TrashIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
  </svg>
);

export const GridIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="4" y="4" width="6" height="6" rx="1" />
    <rect x="14" y="4" width="6" height="6" rx="1" />
    <rect x="4" y="14" width="6" height="6" rx="1" />
    <rect x="14" y="14" width="6" height="6" rx="1" />
  </svg>
);

export const ClockIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

export const TagIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M3 12.5V5a2 2 0 0 1 2-2h7.5L21 11.5 13.5 19z" />
    <circle cx="7.5" cy="7.5" r="1.3" fill="currentColor" stroke="none" />
  </svg>
);

export const DotsIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);

export const LogoutIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M14 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8" />
    <path d="M17 8l4 4-4 4M21 12H9" />
  </svg>
);

export const PencilIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 20h4l10-10-4-4L4 16z" />
    <path d="M13.5 6.5 17.5 10.5" />
  </svg>
);

export const CheckIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 12.5 9 17.5 20 6.5" />
  </svg>
);

export const XIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const ChevronLeftIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M15 5l-7 7 7 7" />
  </svg>
);

export const ChevronRightIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M9 5l7 7-7 7" />
  </svg>
);

export const FolderPlusIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4l2 2.5h7A1.5 1.5 0 0 1 19 9v8.5A1.5 1.5 0 0 1 17.5 19h-13A1.5 1.5 0 0 1 3 17.5z" />
    <path d="M11 13h4M13 11v4" />
  </svg>
);

export const UploadIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 16V4M8 8l4-4 4 4" />
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </svg>
);

export const GlobeIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.5 2.4 2.5 14.6 0 17M12 3.5c-2.5 2.4-2.5 14.6 0 17" />
  </svg>
);

export const InboxIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M3 13l3-8h12l3 8" />
    <path d="M3 13v6h18v-6M3 13h5l2 3h4l2-3h5" />
  </svg>
);
