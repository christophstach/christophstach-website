export default function Hero() {
  return (
    <section class="bg-neutral-50 dark:bg-neutral-900">
      <div class="mx-auto flex max-w-screen-xl flex-col-reverse items-center justify-center gap-8 px-4 py-8 lg:flex-row lg:gap-20 lg:py-16">
        <div>
          <h1 class="mb-4 max-w-2xl text-4xl font-extrabold leading-none tracking-tight dark:text-white md:text-5xl xl:text-6xl">
            Hi, I am Christoph!
          </h1>
          <p class="mb-6 max-w-2xl font-light text-gray-500 dark:text-gray-400 md:text-lg lg:mb-8 lg:text-xl">
            A software engineer with a passion for webtechnologies, especially frontend development. Currently I like to
            use <strong>TypeScript</strong>, <strong>React</strong>, <strong>SolidJS</strong>, and{" "}
            <strong>TailwindCSS</strong>.
          </p>
        </div>
        <div class="flex items-center justify-center ">
          <img
            class="h-32 w-32 rounded-full object-cover drop-shadow-xl md:h-72 md:w-72"
            src="/hero.webp"
            alt="Hero section image"
            loading="eager"
          />
        </div>
      </div>
    </section>
  )
}
