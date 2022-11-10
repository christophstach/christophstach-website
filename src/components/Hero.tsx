export default function Hero() {
  return (
    <section class="bg-gray-50 dark:bg-gray-900">
      <div class="mx-auto grid max-w-screen-xl px-4 py-8 lg:grid-cols-12 lg:gap-8 lg:py-16 xl:gap-0">
        <div class="mr-auto place-self-center lg:col-span-7">
          <h1 class="mb-4 max-w-2xl text-4xl font-extrabold leading-none tracking-tight dark:text-white md:text-5xl xl:text-6xl">
            Hi, I am Christoph!
          </h1>
          <p class="mb-6 max-w-2xl font-light text-gray-500 dark:text-gray-400 md:text-lg lg:mb-8 lg:text-xl">
            A software engineer with a passion for webtechnologies, especially frontend development. Currently I like to
            use <strong>TypeScript</strong>, <strong>React</strong>, <strong>Next.js</strong>, and{' '}
            <strong>Tailwind CSS</strong>.
          </p>
        </div>
        <div class="flex flex-row justify-center lg:col-span-5 lg:mt-0 lg:flex-col">
          <img class="h-72 w-72 rounded-full object-cover drop-shadow-xl" src="hero.webp" alt="Hero section image" loading='lazy' />
        </div>
      </div>
    </section>
  )
}
