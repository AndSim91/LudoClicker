import type { Contact, TournamentParticipant } from "../../game/types";
import { participantName } from "./tournamentPresentation";
import { tournamentSchoolDisplayName } from "./tournamentSchoolPresentation";

type TournamentAthleteRarity = TournamentParticipant["rarity"];

interface TournamentAthleteIdentityProps {
  displayName: string;
  rarity: TournamentAthleteRarity;
  schoolName: string;
  schoolCity: string;
  owned: boolean;
  className?: string;
}

interface TournamentSchoolBadgeProps {
  schoolName: string;
  schoolCity: string;
  owned: boolean;
}

export function TournamentSchoolBadge({
  schoolName,
  schoolCity,
  owned,
}: TournamentSchoolBadgeProps) {
  const displaySchoolName = tournamentSchoolDisplayName(schoolName, schoolCity);
  const cityLabel = schoolCity.trim() || "Città non disponibile";
  return (
    <span
      className={`tournament-school-badge${owned ? " is-owned" : ""}`}
      aria-label={`Scuola: ${displaySchoolName}. Città: ${cityLabel}`}
      title={`Città: ${cityLabel}`}
    >
      {displaySchoolName}
    </span>
  );
}

export function TournamentAthleteIdentity({
  displayName,
  rarity,
  schoolName,
  schoolCity,
  owned,
  className,
}: TournamentAthleteIdentityProps) {
  return (
    <span
      className={["tournament-athlete-identity", className].filter(Boolean).join(" ")}
    >
      <strong className={`tournament-athlete-name rarity-name rarity-${rarity}`}>
        {displayName}
      </strong>
      <TournamentSchoolBadge schoolName={schoolName} schoolCity={schoolCity} owned={owned} />
    </span>
  );
}

export function TournamentParticipantIdentity({
  participant,
  className,
}: {
  participant: TournamentParticipant | undefined;
  className?: string;
}) {
  if (!participant) {
    return <span className="tournament-athlete-identity">—</span>;
  }
  return (
    <TournamentAthleteIdentity
      displayName={participantName(participant)}
      rarity={participant.rarity}
      schoolName={participant.schoolName}
      schoolCity={participant.city}
      owned={Boolean(participant.ownedContactId)}
      className={className}
    />
  );
}

export function TournamentContactIdentity({
  contact,
  schoolName,
  schoolCity,
  className,
}: {
  contact: Contact;
  schoolName: string;
  schoolCity: string;
  className?: string;
}) {
  return (
    <TournamentAthleteIdentity
      displayName={`${contact.firstName} ${contact.lastName}`}
      rarity={contact.secretLegendaryId ? "secret-legendary" : contact.rarity}
      schoolName={schoolName}
      schoolCity={schoolCity}
      owned
      className={className}
    />
  );
}
