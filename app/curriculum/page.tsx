import { AcademicCapIcon, BriefcaseIcon } from '@heroicons/react/24/outline'
import Timeline from '../../lib/timeline/Timeline'

export default function Curriculum() {
  return (
    <div className="flex">
      <div>
        <Timeline>
          <Timeline.Item>
            <Timeline.Icon current>
              <BriefcaseIcon />
            </Timeline.Icon>
            <Timeline.Title>Flowbite Application UI v2.0.0</Timeline.Title>
            <Timeline.Time>Released on January 13th, 2022</Timeline.Time>
            <Timeline.Content>
              Get access to over 20+ pages including a dashboard layout, charts, kanban board, calendar, and pre-order
              E-commerce & Marketing pages.
            </Timeline.Content>
          </Timeline.Item>
          <Timeline.Item>
            <Timeline.Icon>
              <BriefcaseIcon />
            </Timeline.Icon>
            <Timeline.Title>Flowbite Application UI v2.0.0</Timeline.Title>
            <Timeline.Time>Released on January 13th, 2022</Timeline.Time>
            <Timeline.Content>
              Get access to over 20+ pages including a dashboard layout, charts, kanban board, calendar, and pre-order
              E-commerce & Marketing pages.
            </Timeline.Content>
          </Timeline.Item>
        </Timeline>
      </div>
      <div>
        <Timeline>
          <Timeline.Item>
            <Timeline.Icon>
              <AcademicCapIcon />
            </Timeline.Icon>
            <Timeline.Title>Flowbite Application UI v2.0.0</Timeline.Title>
            <Timeline.Time>Released on January 13th, 2022</Timeline.Time>
            <Timeline.Content>
              Get access to over 20+ pages including a dashboard layout, charts, kanban board, calendar, and pre-order
              E-commerce & Marketing pages.
            </Timeline.Content>
          </Timeline.Item>
          <Timeline.Item>
            <Timeline.Icon>
              <AcademicCapIcon />
            </Timeline.Icon>
            <Timeline.Title>Flowbite Application UI v2.0.0</Timeline.Title>
            <Timeline.Time>Released on January 13th, 2022</Timeline.Time>
            <Timeline.Content>
              Get access to over 20+ pages including a dashboard layout, charts, kanban board, calendar, and pre-order
              E-commerce & Marketing pages.
            </Timeline.Content>
          </Timeline.Item>
        </Timeline>
      </div>
    </div>
  )
}
