import type { SVGProps } from "react";

export type IconName =
  | "menu"
  | "mail"
  | "calendar"
  | "people"
  | "tasks"
  | "settings"
  | "search"
  | "plus"
  | "trash"
  | "archive"
  | "send"
  | "attach"
  | "chevron"
  | "clock"
  | "spark"
  | "coin"
  | "contact"
  | "flag"
  | "trophy"
  | "pause"
  | "play"
  | "check"
  | "close"
  | "warning"
  | "admin";

const paths: Record<IconName, React.ReactNode> = {
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18M7 14h2m4 0h2m-8 3h2m4 0h2"/></>,
  people: <><circle cx="9" cy="8" r="3"/><path d="M3.5 20c.5-4 2.4-6 5.5-6s5 2 5.5 6m1-8a3 3 0 1 0 0-6m1 8c2.4.3 3.8 2.3 4.1 5"/></>,
  tasks: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 8h7m-7 4h7m-7 4h7M6.5 8h.01M6.5 12h.01M6.5 16h.01"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  search: <><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></>,
  plus: <path d="M12 5v14M5 12h14" />,
  trash: <><path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7m4 4v6m4-6v6"/></>,
  archive: <><rect x="3" y="5" width="18" height="4" rx="1"/><path d="M5 9v11h14V9m-9 4h4"/></>,
  send: <path d="m3 4 18 8-18 8 3-8-3-8Zm3 8h15" />,
  attach: <path d="m8 12 6.8-6.8a3 3 0 0 1 4.2 4.2l-8.5 8.5a5 5 0 0 1-7.1-7.1L12 2.2" />,
  chevron: <path d="m8 10 4 4 4-4" />,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  spark: <><path d="m12 3 1.2 4.2L17 9l-3.8 1.8L12 15l-1.2-4.2L7 9l3.8-1.8L12 3Z"/><path d="m5 15 .7 2.3L8 18l-2.3.7L5 21l-.7-2.3L2 18l2.3-.7L5 15Zm14-2 .7 2.3 2.3.7-2.3.7L19 19l-.7-2.3L16 16l2.3-.7L19 13Z"/></>,
  coin: <><ellipse cx="12" cy="7" rx="8" ry="4"/><path d="M4 7v5c0 2.2 3.6 4 8 4s8-1.8 8-4V7m-16 5v5c0 2.2 3.6 4 8 4s8-1.8 8-4v-5"/></>,
  contact: <><circle cx="12" cy="8" r="4"/><path d="M4 21c.7-5 3.4-7 8-7s7.3 2 8 7"/></>,
  flag: <><path d="M5 21V4"/><path d="M5 5h10l-1.5 3L15 11H5"/></>,
  trophy: <><path d="M8 4h8v4c0 3-1.6 5-4 5s-4-2-4-5V4Z"/><path d="M8 6H5v2c0 2 1.2 3 3.4 3M16 6h3v2c0 2-1.2 3-3.4 3M12 13v4m-4 3h8m-6-3h4"/></>,
  pause: <><path d="M8 5v14M16 5v14"/></>,
  play: <path d="m8 5 11 7-11 7V5Z" />,
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  warning: <><path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5m0 3h.01"/></>,
  admin: <><path d="M12 3 20 6v5c0 5-3.4 8.3-8 10-4.6-1.7-8-5-8-10V6l8-3Z"/><path d="M9 11a3 3 0 1 0 6 0 3 3 0 0 0-6 0Zm-1 7c.6-2 1.9-3 4-3s3.4 1 4 3"/></>,
};

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
