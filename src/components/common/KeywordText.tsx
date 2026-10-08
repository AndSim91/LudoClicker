import { Fragment } from "react";
import { Icon } from "./Icon";
import { APP_RAIL_ITEMS } from "../outlook-shell/appRailItems";
import { parseKeywordMarkup } from "../../shared/keywordMarkup";

function findRailItem(text: string) {
  // "Rete delle Onde" still points at "Rete": the label only has to start the text.
  return APP_RAIL_ITEMS.find((item) => text === item.label || text.startsWith(`${item.label} `));
}

// Resource words in bold get their icon (Andrea, 08/10: stile B, colore per risorsa). Creatività no: è un ramo degli Upgrade.
const RESOURCE_ICONS = [
  ["Iscritt", "people"],
  ["Spad", "saber"],
  ["Contatt", "mail"],
  ["Fond", "euro"],
  ["Fama", "star"],
  ["Reputazione", "crest"],
  ["Follower", "heart"],
] as const;

function findResourceIcon(text: string) {
  // Case-insensitive: prose also says "i **follower**".
  const word = text.charAt(0).toUpperCase() + text.slice(1);
  return RESOURCE_ICONS.find(([prefix]) => word.startsWith(prefix))?.[1];
}

function highlightRail(view: string, on: boolean) {
  document.querySelector(`.rail-item[data-view="${view}"]`)?.classList.toggle("is-keyword-hover", on);
}

/** Draws game prose with its keyword markup (see keywordMarkup.ts). Plain strings come out unchanged. */
export function KeywordText({ text }: { text: string }) {
  return (
    <>
      {parseKeywordMarkup(text).map((segment, index) => {
        if (segment.kind === "text") return <Fragment key={index}>{segment.text}</Fragment>;
        if (segment.kind === "number") {
          const icon = findResourceIcon(segment.text);
          return (
            <strong key={index} className="kw-number" data-resource={icon}>
              {icon && <Icon name={icon} />}
              {segment.text}
            </strong>
          );
        }
        if (segment.kind === "area") return <span key={index} className="kw kw-area">{segment.text}</span>;
        if (segment.kind === "rarity") {
          return <span key={index} className="kw-rarity" data-rarity={segment.rarity}>{segment.text}</span>;
        }
        const item = findRailItem(segment.text);
        if (!item) return <Fragment key={index}>{segment.text}</Fragment>;
        return (
          <span
            key={index}
            className="kw kw-page"
            onMouseEnter={() => highlightRail(item.id, true)}
            onMouseLeave={() => highlightRail(item.id, false)}
          >
            <Icon name={item.icon} />
            {segment.text}
          </span>
        );
      })}
    </>
  );
}
