import { A, Title } from "solid-start"
import { HttpStatusCode } from "solid-start/server"

export default function NotFound() {
  return (
    <>
      <Title>Not Found</Title>
      <HttpStatusCode code={404} />

      <section>
        <div class="mx-auto max-w-screen-xl px-4 py-8 lg:px-6 lg:py-16">
          <div class="mx-auto max-w-screen-sm text-center">
            <h1 class="mb-4 text-7xl font-extrabold tracking-tight text-indigo-600 dark:text-indigo-500 lg:text-9xl">
              404
            </h1>
            <p class="mb-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-white md:text-4xl">
              Something's missing.
            </p>
            <p class="mb-4 text-lg font-light text-gray-500 dark:text-gray-400">
              Sorry, we can't find that page. You'll find lots to explore on the home page.{" "}
            </p>
            <A
              href="/"
              class="my-4 inline-flex rounded-lg bg-indigo-600 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-indigo-800 focus:outline-none focus:ring-4 focus:ring-indigo-300 dark:focus:ring-indigo-900"
            >
              Back to Homepage
            </A>
          </div>
        </div>
      </section>
    </>
  )
}
