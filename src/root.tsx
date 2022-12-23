// @refresh reload
import { format } from "date-fns"
import { FaBrandsFacebook, FaBrandsGithub, FaBrandsLinkedin, FaBrandsXing } from "solid-icons/fa"
import { createEffect, createSignal, Suspense } from "solid-js"
import { Body, ErrorBoundary, FileRoutes, Head, Html, Link, Meta, Routes, Scripts, Title } from "solid-start"
import Hero from "./components/Hero"
import Navbar from "./components/Navbar"
import SocialLink from "./components/SocialLink"
import navbarLinks from "./data/navbar-links"
import "./root.css"

const colorSchemeStorageKey = "color-scheme"

function initializeColorScheme() {
  let colorScheme

  if (typeof localStorage !== "undefined" && localStorage.getItem(colorSchemeStorageKey)) {
    colorScheme = localStorage.getItem(colorSchemeStorageKey) as "light" | "dark"
  } else if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    colorScheme = "dark"
  } else {
    colorScheme = "light"
  }

  return colorScheme
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

        <Link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>
      <Body class="bg-white dark:bg-black">
        <script>
          const html = document.documentElement; const colorSchemeStorageKey = 'color-scheme'; function
          initializeColorScheme() {"{"}
          let colorScheme; if (typeof localStorage !== 'undefined' && localStorage.getItem(colorSchemeStorageKey)) {"{"}
          colorScheme = localStorage.getItem(colorSchemeStorageKey);
          {"}"} else if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches){" "}
          {"{"}
          colorScheme = 'dark';
          {"}"} else {"{"}
          colorScheme = 'light';
          {"}"}
          return colorScheme;
          {"}"}
          const colorScheme = initializeColorScheme(); if(colorScheme && html) {"{"}
          html.setAttribute('data-theme', colorScheme);
          {"}"}
        </script>
        <Suspense>
          <ErrorBoundary>
            <Navbar links={navbarLinks} />
            <div class="mt-20">
              <Hero />
            </div>

            <main class="container my-12 mx-auto px-4">
              <Routes>
                A
                <FileRoutes />
              </Routes>
            </main>

            <footer class="bg-neutral-50 p-2.5 dark:bg-neutral-900">
              <div class="container mx-auto flex items-center">
                <div class="flex-1">
                  <small>Copyright &copy; 2022 - {format(new Date(), "yyyy")} Christoph Stach</small>
                </div>
                <div class="flex justify-end gap-2.5">
                  <SocialLink href="https://www.linkedin.com/in/christoph-stach-7586b958">
                    <FaBrandsLinkedin class="h-5 w-5" />
                  </SocialLink>
                  <SocialLink href="https://www.xing.com/profile/Christoph_Stach">
                    <FaBrandsXing class="h-5 w-5" />
                  </SocialLink>
                  <SocialLink href="https://www.facebook.com/christoph.stach">
                    <FaBrandsFacebook class="h-5 w-5" />
                  </SocialLink>
                  <SocialLink href="https://github.com/christophstach">
                    <FaBrandsGithub class="h-5 w-5" />
                  </SocialLink>
                </div>
              </div>
            </footer>
          </ErrorBoundary>
        </Suspense>
        <Scripts />
      </Body>
    </Html>
  )
}
