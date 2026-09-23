import type { Element } from '../data/types'

export const ELEMENTS: Element[] = ['Pyro', 'Hydro', 'Electro', 'Cryo', 'Anemo', 'Geo', 'Dendro']

/** CSS colour for an element, following the current theme. */
export const elementColor = (element: Element) => `var(--${element.toLowerCase()})`
