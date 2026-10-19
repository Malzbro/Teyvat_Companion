import type { RouteObject } from 'react-router'
import { AppShell } from './AppShell'
import { ArtifactsScreen } from './screens/artifacts/ArtifactsScreen'
import { CharacterScreen } from './screens/character/CharacterScreen'
import { HomeScreen } from './screens/HomeScreen'
import { MaterialsScreen } from './screens/materials/MaterialsScreen'
import { OptimiseScreen } from './screens/optimise/OptimiseScreen'
import { RosterScreen } from './screens/roster/RosterScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { StyleguideScreen } from './screens/StyleguideScreen'
import { TeamsScreen } from './screens/teams/TeamsScreen'

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomeScreen /> },
      { path: 'roster', element: <RosterScreen /> },
      { path: 'character/:key', element: <CharacterScreen /> },
      { path: 'teams', element: <TeamsScreen /> },
      { path: 'optimise', element: <OptimiseScreen /> },
      { path: 'artifacts', element: <ArtifactsScreen /> },
      { path: 'materials', element: <MaterialsScreen /> },
      { path: 'settings', element: <SettingsScreen /> },
      { path: 'styleguide', element: <StyleguideScreen /> },
    ],
  },
]
