export type TournamentCircuitLevel = "academy" | "national" | "champions";
export type TournamentSchoolKind = "order" | "academy" | "nation";

export interface TournamentSchool {
  id: string;
  name: string;
  city: string;
  nation: string;
  kind: TournamentSchoolKind;
  level: TournamentCircuitLevel;
  academy?: string;
}

// Fonte: https://www.ludosportplus.com/schools-map (consultata nel luglio 2026).
// Gli Ordini Alpha aggregano le proprie sedi; al Nazionale ogni voce rappresenta
// un'Accademia italiana; alla Champion's ogni voce rappresenta una nazione.
export const TOURNAMENT_SCHOOLS = [
  {
    id: "alpha-ordine-della-cripta",
    name: "Ordine della Cripta",
    city: "Milano e Monza",
    nation: "Italia",
    academy: "LudoSport Alpha",
    kind: "order",
    level: "academy",
  },
  {
    id: "alpha-ordine-degli-elementi",
    name: "Ordine degli Elementi",
    city: "Torino",
    nation: "Italia",
    academy: "LudoSport Alpha",
    kind: "order",
    level: "academy",
  },
  {
    id: "alpha-ordine-della-spirale",
    name: "Ordine della Spirale",
    city: "Padova",
    nation: "Italia",
    academy: "LudoSport Alpha",
    kind: "order",
    level: "academy",
  },
  {
    id: "alpha-ordine-di-minerva",
    name: "Ordine di Minerva",
    city: "Pavia e Vigevano",
    nation: "Italia",
    academy: "LudoSport Alpha",
    kind: "order",
    level: "academy",
  },
  {
    id: "alpha-ordine-dell-equilibrio",
    name: "Ordine dell'Equilibrio",
    city: "Pordenone",
    nation: "Italia",
    academy: "LudoSport Alpha",
    kind: "order",
    level: "academy",
  },
  {
    id: "alpha-ordine-del-vento",
    name: "Ordine del Vento",
    city: "Trieste",
    nation: "Italia",
    academy: "LudoSport Alpha",
    kind: "order",
    level: "academy",
  },
  {
    id: "alpha-ordine-degli-shardana",
    name: "Ordine degli Shardana",
    city: "Cagliari",
    nation: "Italia",
    academy: "LudoSport Alpha",
    kind: "order",
    level: "academy",
  },
  {
    id: "alpha-ordine-della-loggia",
    name: "Ordine della Loggia",
    city: "Brescia",
    nation: "Italia",
    academy: "LudoSport Alpha",
    kind: "order",
    level: "academy",
  },
  {
    id: "alpha-ordine-delle-mura",
    name: "Ordine delle Mura",
    city: "Bergamo",
    nation: "Italia",
    academy: "LudoSport Alpha",
    kind: "order",
    level: "academy",
  },
  {
    id: "alpha-ordine-del-ronin",
    name: "Ordine del Ronin",
    city: "Cesena",
    nation: "Italia",
    academy: "LudoSport Alpha",
    kind: "order",
    level: "academy",
  },
  {
    id: "alpha-ordine-di-prometeo",
    name: "Ordine di Prometeo",
    city: "Vicenza",
    nation: "Italia",
    academy: "LudoSport Alpha",
    kind: "order",
    level: "academy",
  },
  {
    id: "italia-aemilia",
    name: "LudoSport Aemilia",
    city: "Bologna, Magreta, Modena, Modena Est, Reggio Emilia e Rivalta",
    nation: "Italia",
    academy: "LudoSport Aemilia",
    kind: "academy",
    level: "national",
  },
  {
    id: "italia-adriatica",
    name: "LudoSport Adriatica",
    city: "Ferrara",
    nation: "Italia",
    academy: "LudoSport Adriatica",
    kind: "academy",
    level: "national",
  },
  {
    id: "italia-cassia",
    name: "LudoSport Cassia",
    city: "Firenze, Campi Bisenzio e Prato",
    nation: "Italia",
    academy: "LudoSport Cassia",
    kind: "academy",
    level: "national",
  },
  {
    id: "italia-neapolis",
    name: "LudoSport Neapolis",
    city: "Caserta, Maddaloni e Salerno",
    nation: "Italia",
    academy: "LudoSport Neapolis",
    kind: "academy",
    level: "national",
  },
  {
    id: "italia-porta-dei-laghi",
    name: "LudoSport Porta dei Laghi",
    city: "Busto Arsizio, Magenta e Novara",
    nation: "Italia",
    academy: "LudoSport Porta dei Laghi",
    kind: "academy",
    level: "national",
  },
  {
    id: "italia-porta-dei-mari",
    name: "LudoSport Porta dei Mari",
    city: "Livorno, Lucca e Pisa",
    nation: "Italia",
    academy: "LudoSport Porta dei Mari",
    kind: "academy",
    level: "national",
  },
  {
    id: "italia-roma",
    name: "LudoSport Roma",
    city: "Roma, Bracciano e L'Aquila",
    nation: "Italia",
    academy: "LudoSport Roma",
    kind: "academy",
    level: "national",
  },
  {
    id: "international-canada",
    name: "LudoSport Canada",
    city: "Niagara Falls",
    nation: "Canada",
    kind: "nation",
    level: "champions",
  },
  {
    id: "international-czech-republic",
    name: "LudoSport Czech Republic",
    city: "Ostrava",
    nation: "Repubblica Ceca",
    kind: "nation",
    level: "champions",
  },
  {
    id: "international-france",
    name: "LudoSport France",
    city: "Saint-Paul, Saint-Pierre, Bussy Saint-Georges, Lagny-sur-Marne, Lione, Montpellier, Nîmes, Parigi, Saint-Denis e Tours",
    nation: "Francia",
    kind: "nation",
    level: "champions",
  },
  {
    id: "international-germany",
    name: "LudoSport Germany",
    city: "Berlino, Darmstadt, Hannover, Potsdam, Stoccarda e Wald",
    nation: "Germania",
    kind: "nation",
    level: "champions",
  },
  {
    id: "international-ireland",
    name: "LudoSport Ireland",
    city: "Bray e Dublino",
    nation: "Irlanda",
    kind: "nation",
    level: "champions",
  },
  {
    id: "international-japan",
    name: "LudoSport Japan",
    city: "Amagasaki e Osaka",
    nation: "Giappone",
    kind: "nation",
    level: "champions",
  },
  {
    id: "international-netherlands",
    name: "LudoSport Netherlands",
    city: "Leida, Purmerend, Rotterdam, Utrecht e Veldhoven",
    nation: "Paesi Bassi",
    kind: "nation",
    level: "champions",
  },
  {
    id: "international-spain",
    name: "LudoSport Spain",
    city: "Albacete, Alicante, Almería, Palma, Barcellona, Bilbao, Castelló de la Plana, Girona, Granada, Guadalajara, Madrid, León, Málaga, Cartagena, Fuenlabrada, San Sebastián, Siviglia, Tarragona, Toledo, Valladolid, Valencia, Vigo e Saragozza",
    nation: "Spagna",
    kind: "nation",
    level: "champions",
  },
  {
    id: "international-sweden",
    name: "LudoSport Sweden",
    city: "Eskilstuna, Göteborg, Helsingborg, Löddeköpinge, Malmö, Örebro, Stoccolma e Ystad",
    nation: "Svezia",
    kind: "nation",
    level: "champions",
  },
  {
    id: "international-united-kingdom",
    name: "LudoSport United Kingdom",
    city: "Basingstoke, Birmingham, Bristol, Coventry, Colchester, Gloucester, Leeds, Manchester e Southsea",
    nation: "Regno Unito",
    kind: "nation",
    level: "champions",
  },
  {
    id: "international-united-states",
    name: "LudoSport United States",
    city: "North Canton, Maple Shade, Conshohocken, Elmira Heights, East Grand Forks, Waipahu, Rochester, Mattawan, San Francisco, St. Peters, Frisco, West Jordan, Yorktown, Norfolk, Arlington e Waltham",
    nation: "Stati Uniti",
    kind: "nation",
    level: "champions",
  },
] as const satisfies readonly TournamentSchool[];

export type TournamentSchoolId = (typeof TOURNAMENT_SCHOOLS)[number]["id"];
export type CataloguedTournamentSchool = (typeof TOURNAMENT_SCHOOLS)[number];

const TOURNAMENT_SCHOOLS_BY_ID = new Map<TournamentSchoolId, CataloguedTournamentSchool>(
  TOURNAMENT_SCHOOLS.map((school) => [school.id, school]),
);

export function getTournamentSchool(id: TournamentSchoolId): CataloguedTournamentSchool {
  return TOURNAMENT_SCHOOLS_BY_ID.get(id)!;
}

export function getNpcSchoolPool(
  level: TournamentCircuitLevel,
): readonly CataloguedTournamentSchool[] {
  return TOURNAMENT_SCHOOLS.filter((school) => school.level === level);
}
