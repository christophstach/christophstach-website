// @refresh reload
import { createSignal, Suspense } from 'solid-js'
import { Body, ErrorBoundary, FileRoutes, Head, Html, Link, Meta, Routes, Scripts, Title } from 'solid-start'
import Hero from './components/Hero'
import Navbar from './components/Navbar'
import navbarLinks from './data/navbar-links'
import './root.css'

export const [theme, setTheme] = createSignal('light')

export default function Root() {
  return (
    <Html lang="en" data-theme={theme()}>
      <Head>
        <Title>Christoph Stach</Title>
        <Meta charset="utf-8" />
        <Meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta
          name="description"
          content="Christoph Stach is a software engineer with a passion for webtechnologies, especially frontend development"
        />
        <Link
          rel="preload"
          as="style"
          href="https://rsms.me/inter/inter.css"
          onLoad={(event) => {
            event.currentTarget.rel = 'stylesheet'
            event.currentTarget.onload = null
          }}
        />
        <Link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>
      <Body class="bg-white dark:bg-black">
        <Suspense>
          <ErrorBoundary>
            <Navbar links={navbarLinks} />
            <div class="mt-20">
              <Hero />
            </div>

            <main class="container my-12 mx-auto px-4">
              <Routes>
                <FileRoutes />
              </Routes>
            </main>
          </ErrorBoundary>
        </Suspense>
        <Scripts />
      </Body>
    </Html>
  )
}
