import type { IconName } from "../common/Icon";
import type { GameArea } from "../../game/progression";

export type AppView = GameArea | "admin";

interface AppRailItem {
  id: AppView;
  label: string;
  icon: IconName;
  devOnly?: boolean;
  tutorialRegion?:
    | "events-navigation"
    | "contacts-navigation"
    | "upgrades-navigation"
    | "gadget-navigation"
    | "tournaments-navigation"
    | "network-navigation";
}

export const APP_RAIL_ITEMS: readonly AppRailItem[] = [
  { id: "contacts", label: "Scuola", icon: "people", tutorialRegion: "contacts-navigation" },
  { id: "mail", label: "Posta", icon: "mail" },
  { id: "events", label: "Eventi", icon: "flag", tutorialRegion: "events-navigation" },
  { id: "tournaments", label: "Tornei", icon: "trophy", tutorialRegion: "tournaments-navigation" },
  { id: "gadget", label: "Gadget", icon: "gift", tutorialRegion: "gadget-navigation" },
  { id: "upgrades", label: "Upgrade", icon: "spark", tutorialRegion: "upgrades-navigation" },
  { id: "network", label: "Network", icon: "network", tutorialRegion: "network-navigation" },
  { id: "ludowiki", label: "LudoWiki", icon: "ludowiki" },
  { id: "settings", label: "Impostazioni", icon: "settings" },
  { id: "admin", label: "Admin", icon: "admin", devOnly: true },
];
