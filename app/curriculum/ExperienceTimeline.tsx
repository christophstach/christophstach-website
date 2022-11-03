import { BriefcaseIcon } from '@heroicons/react/24/outline'
import { addMonths, format, isBefore } from 'date-fns'
import Timeline from '../../lib/timeline/Timeline'

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
      {data.map((item, itemIndex) => {
        return (
          <Timeline.Item key={itemIndex}>
            <Timeline.Icon current={item.current}>
              <BriefcaseIcon />
            </Timeline.Icon>
            <Timeline.Title>
              <span className="font-extrabold">{item.title}</span>
              <span className="font-extralight">@</span>
              <span className="font-extralight">{item.company}</span>
            </Timeline.Title>
            <Timeline.Time>
              {format(item.from, 'MMMM yyyy')} -
              {!isBefore(item.to, new Date()) ? <> Present</> : <> {format(item.to, 'MMMM yyyy')}</>}
            </Timeline.Time>
            <Timeline.Content>
              <p
                className="prose-sm prose prose-emerald mb-5 mt-4 max-w-none dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: item.description }}
              />

              {item.bullets.length > 0 ? (
                <ul className="ml-4 list-disc text-sm">
                  {item.bullets.map((bullet, bulletIndex) => {
                    return (
                      <li
                        key={bulletIndex}
                        className="prose-sm prose prose-emerald max-w-none dark:prose-invert"
                        dangerouslySetInnerHTML={{ __html: bullet }}
                      />
                    )
                  })}
                </ul>
              ) : null}
            </Timeline.Content>
          </Timeline.Item>
        )
      })}
    </Timeline>
  )
}
