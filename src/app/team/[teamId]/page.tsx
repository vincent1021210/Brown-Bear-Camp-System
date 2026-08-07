import { TeamProgressClient } from "@/components/team/TeamProgressClient";

export function generateStaticParams() {
  return Array.from({ length: 8 }, (_, i) => ({
    teamId: `team-${String(i + 1).padStart(2, "0")}`,
  }));
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  return <TeamProgressClient teamId={teamId} />;
}
