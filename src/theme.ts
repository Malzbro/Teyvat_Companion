// Theme preference. Kept in localStorage (not Dexie) so index.html can apply it before first paint.

export type Theme = 'dark' | 'light'
const KEY = 'theme'

export function getTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'light' ? '#fbf6fb' : '#13101f')
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // Private mode etc.: theme still applies for this session.
  }
}
