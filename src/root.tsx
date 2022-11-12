// @refresh reload
import { createEffect, createSignal, Suspense } from 'solid-js'
import { Body, ErrorBoundary, FileRoutes, Head, Html, Link, Meta, Routes, Scripts, Title } from 'solid-start'
import Hero from './components/Hero'
import Navbar from './components/Navbar'
import navbarLinks from './data/navbar-links'
import './root.css'

const colorSchemeStorageKey = 'color-scheme'

function initializeColorScheme() {
  let theme

  if (typeof localStorage !== 'undefined' && localStorage.getItem(colorSchemeStorageKey)) {
    theme = localStorage.getItem(colorSchemeStorageKey) as 'light' | 'dark'
  } else if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    theme = 'dark'
  } else {
    theme = 'light'
  }

  return theme
}

export const [colorScheme, setColorScheme] = createSignal(initializeColorScheme())

export default function Root() {
  createEffect(() => {
    localStorage.setItem(colorSchemeStorageKey, colorScheme())
    document.documentElement.style.colorScheme = colorScheme()
  })

  return (
    <Html lang="en" data-theme={colorScheme()}>
      <Head>
        <Title>Christoph Stach</Title>
        <Meta charset="utf-8" />
        <Meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta
          name="description"
          content="Christoph Stach is a software engineer with a passion for webtechnologies, especially frontend development"
        />

        <Meta property="og:type" content="website" />
        <Meta property="og:title" content="Christoph Stach" />
        <Meta
          property="og:description"
          content="Christoph Stach is a software engineer with a passion for webtechnologies, especially frontend development"
        />
        <Meta property="og:url" content="https://christophstach.me" />
        <Meta property="og:image" content="https://christophstach.me/og.png" />

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
