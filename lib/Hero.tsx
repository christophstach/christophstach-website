import Image from 'next/image'

import image from '../public/IMG_7098.jpg'

export default function Hero() {
  return (
    <section className="bg-cyan-50 dark:bg-gray-900">
      <div className="mx-auto grid max-w-screen-xl px-4 py-8 lg:grid-cols-12 lg:gap-8 lg:py-16 xl:gap-0">
        <div className="mr-auto place-self-center lg:col-span-7">
          <h1 className="mb-4 max-w-2xl text-4xl font-extrabold leading-none tracking-tight dark:text-white md:text-5xl xl:text-6xl">
            Hi, I am Christoph!
          </h1>
          <p className="mb-6 max-w-2xl font-light text-gray-500 dark:text-gray-400 md:text-lg lg:mb-8 lg:text-xl">
            A software engineer with a passion for webtechnologies, especially frontend development. Currently I like to
            use <strong>TypeScript</strong>, <strong>React</strong>, <strong>Next.js</strong>, and{' '}
            <strong>Tailwind CSS</strong>.
          </p>
        </div>
        <div className="hidden lg:col-span-5 lg:mt-0 lg:flex">
          <Image className="h-72 w-72 rounded-full object-cover drop-shadow-xl" src={image} alt="Hero section image" />
        </div>
      </div>
    </section>
  )
}
