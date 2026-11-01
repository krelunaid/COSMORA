import Link from '@/components/app-link';

/** Missing/hidden public profiles must not become dead links from their posts. */
export function CommunityAuthorLink({ authorId, author, profileUrl, viewerId }: {
  authorId: string;
  author: string;
  profileUrl?: string | null;
  viewerId: string;
}) {
  const href = viewerId && viewerId === authorId
    ? '/profile/me'
    : profileUrl === '/profile/' + authorId ? profileUrl : null;
  const className = 'block truncate text-sm font-semibold text-violet-100';
  return href
    ? <Link href={href} className={className}>{author}</Link>
    : <span className={className}>{author}</span>;
}
