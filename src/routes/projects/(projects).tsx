/* eslint-disable solid/no-innerhtml */
import { AiOutlineGithub, AiOutlineGlobal } from 'solid-icons/ai'
import { For, Show } from 'solid-js'
import { Title } from 'solid-start'
import projects from '../../data/projects'

export default function Projects() {
  return (
    <>
      <Title>Christoph Stach - Projects</Title>

      <section class="mb-10">
        <p>
          Here, you'll find a selection of the projects I've worked on that showcase my skills and interests as a
          developer. I am constantly learning and experimenting with new technologies, and these projects reflect that
          passion for growth and innovation.
        </p>
      </section>

      <div class="flex flex-wrap justify-between gap-10">
        <For each={projects}>
          {(project) => {
            return (
              <div class="flex max-w-xs flex-col gap-3 rounded-lg border border-gray-200 bg-white p-6 shadow-md dark:border-gray-700 dark:bg-gray-800 md:max-w-md">
                <h5 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{project.title}</h5>
                <div class="prose prose-sm prose-indigo dark:prose-invert" innerHTML={project.description} />

                <Show when={project.tags}>
                  <div class="flex flex-wrap gap-2">
                    <For each={project.tags}>
                      {(tag) => {
                        return (
                          <span class="block rounded bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800 dark:bg-indigo-200 dark:text-indigo-900">
                            {tag}
                          </span>
                        )
                      }}
                    </For>
                  </div>
                </Show>

                <Show when={project.website}>
                  <div class="flex items-center gap-3">
                    <div>
                      <AiOutlineGlobal class="h-5 w-5" />
                    </div>
                    <a
                      href={project.website}
                      class="flex-1 break-all text-sm text-indigo-600 hover:underline dark:text-indigo-500"
                    >
                      {project.website}
                    </a>
                  </div>
                </Show>

                <Show when={project.repository}>
                  <div class="flex items-center gap-3">
                    <div>
                      <AiOutlineGithub class="h-5 w-5" />
                    </div>
                    <a
                      href={project.repository}
                      class="flex-1 break-all text-sm text-indigo-600 hover:underline dark:text-indigo-500"
                    >
                      {project.repository}
                    </a>
                  </div>
                </Show>
              </div>
            )
          }}
        </For>
      </div>
    </>
  )
}
