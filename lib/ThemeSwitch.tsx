'use client'

import { MoonIcon, SunIcon } from '@heroicons/react/24/outline'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export default function ThemeSwitch() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  function handleToggleTheme() {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <button
      type="button"
      className="rounded-lg p-2.5 text-sm text-emerald-700 hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white dark:focus:ring-gray-700"
      onClick={handleToggleTheme}
    >
      <SunIcon className={`h-5 w-5 ${theme === 'dark' ? 'hidden' : ''}`} />
      <MoonIcon className={`h-5 w-5 ${theme !== 'dark' ? 'hidden' : ''}`} />
    </button>
  )
}
