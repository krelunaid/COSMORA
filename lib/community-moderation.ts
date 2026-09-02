import { squads } from '@/lib/community-data';

const suspiciousSale = /(whatsapp|telegram).*(bonifico|bank transfer|paypal friends)|pagami fuori|pay me directly/i;
const privateAddress = /(via|viale|corso|street|road)\s+[a-zà-ÿ' ]+[, ]+\d{1,4}|apartment|citofono|house number/i;
const suspiciousLink = /(bit\.ly|tinyurl\.com|t\.me\/|wa\.me\/)/i;
const offensive = /\b(fuck|nazi|odio razziale)\b/i;

export function moderateText(title: string, description: string) {
  const text = `${title} ${description}`.trim();
  const reasons: string[] = [];
  if (title.trim().length < 4) reasons.push('Title is too short.');
  if (description.trim().length < 12) reasons.push('Description needs more useful detail.');
  if (suspiciousSale.test(text)) reasons.push('Possible off-marketplace transaction.');
  if (suspiciousLink.test(text)) reasons.push('Suspicious external link.');
  if (offensive.test(text)) reasons.push('Potentially offensive content.');
  return { status: reasons.length ? 'PENDING_REVIEW' as const : 'ACTIVE' as const, reasons };
}

export function validatePublicLocation(location: string) {
  return !privateAddress.test(location);
}

export function findSimilarSquad(name: string, event: string) {
  const words = name.toLowerCase().split(/\W+/).filter((word) => word.length > 3);
  return squads.find((squad) => squad.event === event && words.filter((word) => squad.name.toLowerCase().includes(word)).length >= 2);
}

