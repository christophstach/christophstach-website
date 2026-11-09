import { SiteLayout } from "../components/SiteLayout";
import { SiteMeta } from "../seo";

// Placeholder until the home page is ported (Task 5).
export default function Home() {
  return (
    <SiteLayout>
      <SiteMeta
        title="Senior Software Engineer in Berlin"
        ogTitle="Christoph Stach, Senior Software Engineer in Berlin"
      />
      <div class="container">solid</div>
    </SiteLayout>
  );
}
