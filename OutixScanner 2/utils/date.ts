export function formatAppDateTime(input: string | number | Date | null | undefined): string {
  if (!input) return 'TBD';
  const date = new Date(input);
  if (isNaN(date.getTime())) return 'TBD';

  const datePart = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);

  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);

  return `${datePart} at ${timePart}`;
}

// Returns only the date portion like "October 1, 2024"
export function formatAppDate(input: string | number | Date | null | undefined): string {
  if (!input) return 'TBD';
  const date = new Date(input);
  if (isNaN(date.getTime())) return 'TBD';

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

// Returns only the time portion like "1:00 AM"
export function formatAppTime(input: string | number | Date | null | undefined): string {
  if (!input) return 'TBD';
  const date = new Date(input);
  if (isNaN(date.getTime())) return 'TBD';

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}







