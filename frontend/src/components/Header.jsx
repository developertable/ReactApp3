// Header — top bar of the app. Holds the title and the theme toggle.
//
// Currently simple, but having it as its own component leaves a clear
// home for future header chrome (search, user menu, settings link, etc.)
// without crowding App.jsx.

import ThemeToggle from './ThemeToggle.jsx'

export default function Header({ theme, onToggleTheme }) {
  return (
    <header className="app-header">
      <h1 className="app-title">Task Logger</h1>
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
    </header>
  )
}