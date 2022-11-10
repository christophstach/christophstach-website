import { addMonths, format, isBefore } from 'date-fns'
import { HiOutlineBriefcase } from 'solid-icons/hi'
import { For, Show } from 'solid-js'
import Timeline from './timeline/Timeline'

function getData() {
  return [
    {
      title: 'Frontend Engineer',
      company: 'DERICON GmbH',
      description: '',
      bullets: [
        'Extending the existing frontend of a web based software based on Angular (v2+)',
        'Developing a PHP Symfony framework middleware to connect the AngularJS (v1) frontend with the systems core REST API',
      ],
      from: new Date(2016, 11, 1),
      to: addMonths(new Date(), 1),
      current: true,
    },
    {
      title: 'Fullstack Developer',
      company: 'SLH GmbH',
      description: '',
      bullets: [
        'Planning and implementing new features for the web based software UWEB2000',
        'Developing a new frontend with Sencha ExtJS',
        'Bug fixing the PHP based business logic',
        'Troubleshooting with customers regarding the software',
        'Consultant and contact person for customers',
        'Implementing features in the 2nd product of the company with ASP.NET MVC + Entity Framework',
        'Working with predefined GIT SCM workflows',
      ],
      from: new Date(2011, 9, 1),
      to: new Date(2014, 10, 30),
    },
    {
      title: 'Fullstack Developer',
      company: 'CREAVIVA GmbH & Co. KG',
      description: '',
      bullets: [
        'Managing content and developing new websites based on PHP, MySQL, CSS and JavaScript',
        'Developing websites with the CMS TYPO3 including the creation of new TYPO3-Extension',
        'Internal contact person for IT related issues',
      ],
      from: new Date(2011, 6, 1),
      to: new Date(2011, 9, 31),
    },
    {
      title: 'IT Management Assistant',
      company: 'Kortmann Beton GmbH & Co. KG',
      description: '',
      bullets: [
        'Development of the company website',
        'Developing reports for internal company analysis with C#, Crystal Reports, Visual Basic and Microsoft Access',
        'Internal contact person for IT related issues',
      ],
      from: new Date(2011, 6, 1),
      to: new Date(2011, 9, 31),
    },
  ]
}

export default function ExperienceTimeline() {
  const data = getData()

  return (
    <Timeline>
      <For each={data}>
        {(item) => {
          return (
            <Timeline.Item>
              <Timeline.Icon current={item.current}>
                <HiOutlineBriefcase />
              </Timeline.Icon>
              <Timeline.Title>
                <span class="font-extrabold">{item.title}</span>
                <span class="font-extralight">@</span>
                <span class="font-extralight">{item.company}</span>
              </Timeline.Title>
              <Timeline.Time>
                {format(item.from, 'MMMM yyyy')} -
                {!isBefore(item.to, new Date()) ? <> Present</> : <> {format(item.to, 'MMMM yyyy')}</>}
              </Timeline.Time>
              <Timeline.Content>
                <p class="prose prose-sm prose-indigo mb-5 mt-4 max-w-none dark:prose-invert">{item.description}</p>

                <Show when={item.bullets.length > 0}>
                  <ul class="ml-4 list-disc text-sm">
                    <For each={item.bullets}>
                      {(bullet) => {
                        return <li class="prose prose-sm prose-indigo max-w-none dark:prose-invert">{bullet}</li>
                      }}
                    </For>
                  </ul>
                </Show>
              </Timeline.Content>
            </Timeline.Item>
          )
        }}
      </For>
    </Timeline>
  )
}
