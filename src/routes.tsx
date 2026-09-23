import { Boxes } from 'lucide-react'
import { AppShell } from './AppShell'
import { ArtifactsScreen } from './screens/artifacts/ArtifactsScreen'
import { HomeScreen } from './screens/HomeScreen'
import { PlaceholderScreen } from './screens/PlaceholderScreen'
import { RosterScreen } from './screens/roster/RosterScreen'
import { StyleguideScreen } from './screens/StyleguideScreen'
import type { RouteObject } from 'react-router'

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomeScreen /> },
      { path: 'roster', element: <RosterScreen /> },
      { path: 'artifacts', element: <ArtifactsScreen /> },
      {
        path: 'materials',
        element: (
          <PlaceholderScreen
            title="Materials"
            icon={Boxes}
            message="Set a goal and track what you still need to farm."
          />
        ),
      },
      { path: 'styleguide', element: <StyleguideScreen /> },
    ],
  },
]
