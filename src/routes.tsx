import { Boxes, Flower2, Users } from 'lucide-react'
import { AppShell } from './AppShell'
import { HomeScreen } from './screens/HomeScreen'
import { PlaceholderScreen } from './screens/PlaceholderScreen'
import { StyleguideScreen } from './screens/StyleguideScreen'
import type { RouteObject } from 'react-router'

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomeScreen /> },
      {
        path: 'roster',
        element: (
          <PlaceholderScreen
            title="Roster"
            icon={Users}
            message="Your characters and weapons will live here."
          />
        ),
      },
      {
        path: 'artifacts',
        element: (
          <PlaceholderScreen
            title="Artifacts"
            icon={Flower2}
            message="Add artifacts in a few taps and see who wears what."
          />
        ),
      },
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
