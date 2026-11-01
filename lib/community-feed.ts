export type CommunityPost = {
  id: string;
  author_id: string;
  author: string;
  author_profile_url?: string | null;
  caption: string;
  created_at: string;
  link_label: string | null;
  link_url: string | null;
  liked?: boolean;
  saved?: boolean;
  media: { type: string; url: string; thumbnail_url?: string | null }[];
};

/** Older servers do not supply thumbnails; the signed original remains usable. */
export function communityThumbnail(media: { url: string; thumbnail_url?: string | null }): string {
  return media.thumbnail_url || media.url;
}

/** Only tags written by the author; no inferred topics or invented metadata. */
export function postHashtags(caption: string): string[] {
  return [
    ...new Set(
      Array.from(
        caption.matchAll(/(?:^|\s)#([\p{L}\p{N}_]{1,40})(?![\p{L}\p{N}_])/gu),
        (match) => '#' + match[1].toLowerCase(),
      ),
    ),
  ];
}
