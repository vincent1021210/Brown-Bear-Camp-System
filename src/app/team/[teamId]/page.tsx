import { TeamProgressClient } from "@/components/team/TeamProgressClient";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  return <TeamProgressClient teamId={teamId} />;
}
