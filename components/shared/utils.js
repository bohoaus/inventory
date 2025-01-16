// Date formatting and calculations for Australia/Sydney timezone
export function formatDateToSydney(date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-AU", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function getWeekRange(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  // Get Monday of the week
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));

  // Get Sunday
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  // Get week number
  const startOfYear = new Date(monday.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((monday - startOfYear) / 86400000 + 1) / 7);

  return {
    start: monday,
    end: sunday,
    weekNum,
    year: monday.getFullYear(),
    formatted: `${formatDateToSydney(monday)} - ${formatDateToSydney(
      sunday
    )} Week ${weekNum} of ${monday.getFullYear()}`,
  };
}

export function calculateSellingTime(releaseDate, soldOutDate) {
  if (!releaseDate || !soldOutDate) return "-";

  const release = new Date(releaseDate);
  const soldOut = new Date(soldOutDate);

  const diffTime = Math.abs(soldOut - release);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 7) {
    return `${diffDays} days`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? "s" : ""}`;
  } else {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? "s" : ""}`;
  }
}
