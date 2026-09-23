import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'

afterEach(cleanup)

// The one-time welcome screen would cover every page in tests.
beforeEach(() => localStorage.setItem('welcomed-v1', '1'))
