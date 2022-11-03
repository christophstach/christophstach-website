import { AcademicCapIcon } from '@heroicons/react/24/outline'
import { format, isBefore } from 'date-fns'
import Timeline from '../../lib/timeline/Timeline'

function getData() {
  return [
    {
      title: 'M. Sc. Angewandte Informatik ',
      institution: 'HTW Berlin - Hochschule für Technik und Wirtschaft Berlin',
      description:
        'At <a target="_blank" href="https://www.htw-berlin.de/">HTW Berlin</a> I am studying applied computer science (Angewandte Informatik). I am currently in the end of my masters. During the time on this university I did serveal projects in the area of bio informatics, deep learning and data science.',
      bullets: [
        'Generative adverserial networks to generate pictures of human faces',
        'Member of the <a target="_blank" href="https://campus-stories.htw-berlin.de/en/jahr/2022/in-drei-stunden-das-virus-identifizieren/">Covid-SpiNGS</a> project, developing a on-demand next generation sequencing pipeline for COVID-19 detection',
        'Exchange year in Taipei, Taiwan at the <a target="_blank" href="https://www.ntust.edu.tw/">National Taiwan University of science and technologies (NTUST)</a>',
      ],
      from: new Date(2019, 9, 1),
      to: new Date(2023, 8, 30),
      current: true,
    },
    {
      title: 'B. Sc. Angewandte Informatik',
      institution: 'HTW Berlin - Hochschule für Technik und Wirtschaft Berlin',
      description:
        'I graduated from <a target="_blank" href="https://www.htw-berlin.de/">HTW Berlin</a> with a Bachelor in applied computer science. During this time I specialized in data science with deep learning.',
      bullets: [
        'Exchange semester in Cuernavaca, Mexico at <a target="_blank" href="https://uninter.edu.mx/">Universidad Internacional (UNINTER)</a>',
        'Bachelor thesis about style transfer of paintings to photos with methods of deep learning',
      ],
      from: new Date(2016, 3, 1),
      to: new Date(2019, 8, 30),
    },
    {
      title: 'IT Management Assistent',
      institution: 'KBS Nordhorn',
      description:
        'As part of my apprenticeship at <a target="_blank" href="https://www.kortmann-beton.de/">Kortmann Beton</a>, I had to go to this business related school. There the theoretical knowledge need for the apprenticeship was taught.',
      from: new Date(2009, 8, 1),
      to: new Date(2011, 6, 31),
      bullets: [],
    },
    {
      title: 'Information Technology Assistant',
      institution: 'Berufskolleg Rheine',
      description:
        'I started my IT carreer path at the technical college in Rheine. <a target="_blank" href="https://www.berufskolleg-rheine.de/">Berufskolleg Rheine</a> offered many subjects like Programming, Database, etc. From there I graduated with a dual degree as an Information Technoloy Assistant and the general permission study at Germany\'s Universities of Applied Sciences (Fachhoschule).',
      from: new Date(2004, 8, 1),
      to: new Date(2008, 6, 31),
      bullets: [],
    },
  ]
}

export default function EducationTimeline() {
  const data = getData()

  return (
    <Timeline>
      {data.map((item, itemIndex) => {
        return (
          <Timeline.Item key={itemIndex}>
            <Timeline.Icon current={item.current}>
              <AcademicCapIcon />
            </Timeline.Icon>
            <Timeline.Title>
              <span className="font-extrabold">{item.title}</span>
              <span className="font-extralight">@</span>
              <span className="font-extralight">{item.institution}</span>
            </Timeline.Title>
            <Timeline.Time>
              {format(item.from, 'MMMM yyyy')} -
              {!isBefore(item.to, new Date()) ? <> Present</> : <> {format(item.to, 'MMMM yyyy')}</>}
            </Timeline.Time>
            <Timeline.Content>
              <p
                className="prose-sm prose prose-emerald mb-5 mt-4 max-w-none"
                dangerouslySetInnerHTML={{ __html: item.description }}
              />

              {item.bullets.length > 0 ? (
                <ul className="ml-4 list-disc text-sm">
                  {item.bullets.map((bullet, bulletIndex) => {
                    return (
                      <li
                        key={bulletIndex}
                        className="prose-sm prose prose-emerald max-w-none"
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
