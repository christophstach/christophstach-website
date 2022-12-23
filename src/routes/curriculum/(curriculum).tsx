import { Title } from "solid-start"
import EducationTimeline from "../../components/EducationTimeline"
import ExperienceTimeline from "../../components/ExperienceTimeline"

export default function Curriculum() {
  return (
    <>
      <Title>Christoph Stach - Curriculum</Title>

      <section class="mb-10">
        <p>
          On this page, you'll find a rundown of my education, professional experience, and skills. I'm always looking
          to learn new things and push myself to be the best I can be, and this page is a way for me to show you what
          I've been up to.
        </p>
      </section>

      <div class="flex flex-col lg:flex-row">
        <div class="flex-1">
          <div class='xl:prose-xl" prose prose-indigo mb-10 max-w-none dark:prose-invert sm:prose-sm lg:prose-lg'>
            <h2>Professional Experience</h2>
          </div>

          <ExperienceTimeline />
        </div>
        <div class="flex-1">
          <div class="prose prose-indigo mb-10 max-w-none dark:prose-invert sm:prose-sm lg:prose-lg xl:prose-xl">
            <h2>Education</h2>
          </div>

          <EducationTimeline />
        </div>
      </div>
    </>
  )
}
