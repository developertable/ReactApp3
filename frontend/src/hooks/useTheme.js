
import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'tasklogger.theme'

/**
 * Read the saved theme from localStorage. Returns 'light' if nothing is
 * saved or if localStorage isn't available (private mode in some browsers).
 */
function readSavedTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function useTheme() {
  const [theme, setTheme] = useState(readSavedTheme)

  // Apply the theme to <body> whenever it changes. Using a class on body
  // (rather than :root) makes it easy to scope dark-mode-only overrides.
  useEffect(() => {
    if (theme === 'dark') {
      document.body.classList.add('theme-dark')
    } else {
      document.body.classList.remove('theme-dark')
    }

    // Persist the preference. Wrapped in try/catch in case storage is
    // disabled or full.
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Silently ignore — toggle still works for the session
    }
  }, [theme])

  // Memoized toggle so consuming components don't re-render needlessly
  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'))
  }, [])

  return { theme, toggleTheme }
}