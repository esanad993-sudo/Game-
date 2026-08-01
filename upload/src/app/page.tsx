'use client'

import { useNav } from '@/lib/nav'
import { MenuView } from '@/components/views/MenuView'
import { SoloView } from '@/components/views/SoloView'
import { LivePlayView } from '@/components/views/LivePlayView'
import { HomeworkListView } from '@/components/views/HomeworkListView'
import { HomeworkPlayView } from '@/components/views/HomeworkPlayView'
import { TeacherView } from '@/components/views/TeacherView'

export default function Home() {
  const { view } = useNav()

  switch (view.name) {
    case 'menu':          return <MenuView />
    case 'solo':          return <SoloView />
    case 'live-play':     return <LivePlayView code={view.code} playerId={view.playerId} playerName={view.playerName} isHost={view.isHost} />
    case 'homework-list': return <HomeworkListView />
    case 'homework-play': return <HomeworkPlayView id={view.id} playerName={view.playerName} />
    case 'teacher':       return <TeacherView />
    default:              return <MenuView />
  }
}
