// ThemeToggle — single button that switches between light and dark themes.

// Props:
//   - theme  : 'light' | 'dark'
//   - onToggle : () => void
// ─────────────────────────────────────────────────────────────────────────────

export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      {isDark ? '☀' : '☾'}
    </button>
  )
}