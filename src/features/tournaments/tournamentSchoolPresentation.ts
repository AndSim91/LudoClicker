export function tournamentSchoolDisplayName(schoolName: string, schoolCity: string): string {
  const normalizedName = schoolName.trim();
  const normalizedCity = schoolCity.trim();
  if (!normalizedCity) return normalizedName;

  for (const separator of [" — ", " – ", " - ", " · "]) {
    const suffix = `${separator}${normalizedCity}`;
    if (normalizedName.endsWith(suffix)) {
      return normalizedName.slice(0, -suffix.length).trim();
    }
  }
  return normalizedName;
}
