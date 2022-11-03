'use client'

import { Inter } from '@next/font/google'
import { ThemeProvider } from 'next-themes'

import { PropsWithChildren } from 'react'
import Hero from '../lib/Hero'
import Navbar from '../lib/Navbar'

import './global.css'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout(props: PropsWithChildren) {
  const { children } = props

  return (
    <html lang="en" className={inter.className}>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="X-UA-Compatible" content="ie=edge" />
      </head>
      <body className="bg-neutral-100 dark:bg-neutral-900">
        <ThemeProvider>
          <Navbar />
          <div className="mt-20">
            <Hero />
          </div>

          <main className="container my-12 mx-auto px-4">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  )
}
