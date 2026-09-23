import type { RouteObject } from 'react-router'
import { AppShell } from './AppShell'
import { ArtifactsScreen } from './screens/artifacts/ArtifactsScreen'
import { CharacterScreen } from './screens/character/CharacterScreen'
import { HomeScreen } from './screens/HomeScreen'
import { MaterialsScreen } from './screens/materials/MaterialsScreen'
import { RosterScreen } from './screens/roster/RosterScreen'
import { StyleguideScreen } from './screens/StyleguideScreen'

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomeScreen /> },
      { path: 'roster', element: <RosterScreen /> },
      { path: 'character/:key', element: <CharacterScreen /> },
      { path: 'artifacts', element: <ArtifactsScreen /> },
      { path: 'materials', element: <MaterialsScreen /> },
      { path: 'styleguide', element: <StyleguideScreen /> },
    ],
  },
]
