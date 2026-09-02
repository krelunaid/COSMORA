import { communityPolicy } from '@/lib/server/community-policy';

export function GET() {
  return Response.json({ limits: communityPolicy.standard, archiveGraceDays: communityPolicy.archiveGraceDays });
}
