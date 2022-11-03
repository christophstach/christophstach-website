import EducationTimeline from './EducationTimeline'
import ExperienceTimeline from './ExperienceTimeline'

export default function Curriculum() {
  return (
    <div className="flex flex-col lg:flex-row">
      <div className="flex-1">
        <div className='xl:prose-xl" prose prose-emerald mb-10 max-w-none dark:prose-invert sm:prose-sm lg:prose-lg'>
          <h2>Professional Experience</h2>
        </div>

        <ExperienceTimeline />
      </div>
      <div className="flex-1">
        <div className="prose prose-emerald mb-10 max-w-none dark:prose-invert sm:prose-sm lg:prose-lg xl:prose-xl">
          <h2>Education</h2>
        </div>

        <EducationTimeline />
      </div>
    </div>
  )
}
