import type { Slot } from "@solidjs/web/frames";
import { dynamicComponent } from "@solidjs/web";
import { query, type RouteDefinition } from "@solidjs/router";
import { CV_PDF_PATH } from "../../data/endpoints";
import { HomeAbout } from "../../components/home/HomeAbout";
import { HomeContactCta, type HomeContactCtaProps } from "../../components/home/HomeContactCta";
import { HomeHero } from "../../components/home/HomeHero";
import { HomeStack } from "../../components/home/HomeStack";
import { HomeStats } from "../../components/home/HomeStats";
import { SITE_OWNER } from "../../lib/site";
import { monthsBetween } from "../../lib/format";
import { routePaths } from "../../route-paths";

interface HomeServerProps {
  contact: Slot<HomeContactCtaProps>;
}

// Server component: reads the lean CV summary directly from Postgres (cached at
// the edge via ISR) without an internal HTTP loopback; only the interactive
// contact CTA hydrates in the browser through the `contact` slot.
const getHomeView = query(async () => {
  "use server";

  // Imported here, inside the server function, so the client build never
  // resolves the server-only modules or Effect runtime.
  const [{ loadCvHomeEffect }, { runServerEffect }] = await Promise.all([
    import("../../server/cv-content"),
    import("../../server/effect"),
  ]);
  // Not from src/router.ts, which imports this page (see src/route-paths.ts).
  const paths = routePaths();
  const { experience, degreeCount, skillGroups } = await runServerEffect(loadCvHomeEffect());

  const totalSkills = skillGroups.reduce((sum, group) => sum + group.items.length, 0);

  // Counted as time actually employed, so the career gap between SLH and
  // DERICON is not billed as experience.
  const monthsEmployed = experience.reduce(
    (sum, entry) => sum + monthsBetween(entry.from, entry.to),
    0,
  );

  // Whole decades only: part-time years make a more exact number overstate it.
  const yearsEmployed = Math.floor(monthsEmployed / 120) * 10;

  // A company with several roles on the CV counts once.
  const companyCount = new Set(experience.map((entry) => entry.organization)).size;

  return (props: HomeServerProps) => (
    <div class="container">
      <HomeHero yearsEmployed={yearsEmployed} curriculumHref={paths.curriculum()} />
      <HomeStats
        yearsEmployed={yearsEmployed}
        companyCount={companyCount}
        degreeCount={degreeCount}
        totalSkills={totalSkills}
      />
      <HomeAbout />
      <HomeStack skills={skillGroups} />
      <props.contact
        githubUrl={SITE_OWNER.githubUrl}
        linkedinUrl={SITE_OWNER.linkedinUrl}
        curriculumHref={paths.curriculum()}
        cvPdfHref={CV_PDF_PATH}
      />
    </div>
  );
}, "home-view");

export const route = {
  preload: () => {
    void getHomeView();
  },
} satisfies RouteDefinition;

export default function Home() {
  const View = dynamicComponent(() => getHomeView());

  return (
    <View
      contact={(props) => (
        <HomeContactCta
          githubUrl={props.githubUrl}
          linkedinUrl={props.linkedinUrl}
          curriculumHref={props.curriculumHref}
          cvPdfHref={props.cvPdfHref}
        />
      )}
    />
  );
}
