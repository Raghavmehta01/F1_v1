import { PageHeader } from "@/components/layout/PageHeader";
import { BattlePanel } from "@/components/standings/BattlePanel";
import {
  getActiveSeasonYear,
  getDriverStandingsDetailed,
} from "@/lib/data/jolpica";
import { getDriverMediaIndex, matchOpenF1Driver } from "@/lib/data/openf1";
import { fullDriverImage, mediaFromStanding } from "@/lib/media";
import { parseSeason } from "@/lib/security/validation";

export const revalidate = 120;

type Props = { searchParams: Promise<{ season?: string; a?: string; b?: string }> };

export default async function BattlePage({ searchParams }: Props) {
  const params = await searchParams;
  const activeYear = await getActiveSeasonYear();
  const requested = parseSeason(params.season);
  const useCurrent = requested == null || requested === activeYear;
  const seasonKey = useCurrent ? ("current" as const) : requested!;

  const [detailed, media] = await Promise.all([
    getDriverStandingsDetailed(seasonKey),
    getDriverMediaIndex().catch(() => null),
  ]);

  const drivers = detailed.standings.map((s) => {
    const of1 = media
      ? matchOpenF1Driver(media, {
          code: s.Driver.code,
          familyName: s.Driver.familyName,
        })
      : null;
    return {
      id: s.Driver.driverId,
      name: `${s.Driver.givenName} ${s.Driver.familyName}`,
      code: s.Driver.code ?? s.Driver.familyName.slice(0, 3).toUpperCase(),
      points: s.points,
      wins: s.wins,
      position: s.position,
      constructorId: s.Constructors[0]?.constructorId,
      constructorName: s.Constructors[0]?.name,
      shot: fullDriverImage(
        mediaFromStanding({
          of1,
          code: s.Driver.code,
          driverId: s.Driver.driverId,
          constructorId: s.Constructors[0]?.constructorId,
          constructorName: s.Constructors[0]?.name,
        }),
      ),
    };
  });

  const aId = params.a && drivers.some((d) => d.id === params.a) ? params.a : drivers[0]?.id;
  const bId =
    params.b && drivers.some((d) => d.id === params.b) && params.b !== aId
      ? params.b
      : drivers.find((d) => d.id !== aId)?.id;

  return (
    <div className="page-wrap space-y-10 py-12 sm:py-16">
      <PageHeader
        eyebrow={`${detailed.season} · head-to-head`}
        title="Battle"
        description="Pick two drivers and compare championship form side by side."
      />
      <BattlePanel drivers={drivers} initialA={aId} initialB={bId} season={detailed.season} />
    </div>
  );
}
