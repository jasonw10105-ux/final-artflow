import { mediaTaxonomy } from "./mediaTaxonomy";

/**
 * Returns all top-level media types.
 */
export function getMediaTypes(): string[] {
  return Object.keys(mediaTaxonomy);
}

/**
 * Returns subtypes for a given media type.
 * If the type is undefined or invalid, returns an empty array.
 */
export function getMediaSubtypes(mediaType?: string): string[] {
  if (!mediaType) return [];
  return mediaTaxonomy[mediaType] || [];
}