import { CV_HOME_API_PATH } from "../../data/endpoints";
import { HomeAbout } from "../../components/home/HomeAbout";
import { HomeHero } from "../../components/home/HomeHero";
import { HomeStack } from "../../components/home/HomeStack";
import { HomeStats } from "../../components/home/HomeStats";
import { cvHomeSchema } from "../../data/public-api";
import { monthsBetween } from "../../lib/format";

// A server page: rendered on the server per request, its code never reaches
// the browser. Jobs and skill groups come from /api/cv-home, which the CDN
// caches (ISR) until the desk changes them.
export default async function Home() {
  "use server";

  // Imported here, inside the server function, so the client build never
  // resolves the server-only module.
  const { fetchPublic } = await import("../../server/fetch-public");
  // The router imports every route, this page eagerly: a static import here
  // would be a cycle that hangs the build.
  const { paths } = await import("../../router");
  const { experience, skills } = await fetchPublic(CV_HOME_API_PATH, cvHomeSchema);

  const totalSkills = skills.reduce((sum, group) => sum + group.items.length, 0);

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

  return () => (
    <div class="container">
      <HomeHero yearsEmployed={yearsEmployed} curriculumHref={paths.curriculum()} />
      <HomeStats
        yearsEmployed={yearsEmployed}
        companyCount={companyCount}
        totalSkills={totalSkills}
      />
      <HomeAbout />
      <HomeStack skills={skills} />
    </div>
  );
}
