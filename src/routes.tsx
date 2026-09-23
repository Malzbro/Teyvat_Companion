import type { RouteObject } from 'react-router'
import { AppShell } from './AppShell'
import { ArtifactsScreen } from './screens/artifacts/ArtifactsScreen'
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
      { path: 'artifacts', element: <ArtifactsScreen /> },
      { path: 'materials', element: <MaterialsScreen /> },
      { path: 'styleguide', element: <StyleguideScreen /> },
    ],
  },
]
