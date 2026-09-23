import { Moon, PackageOpen, Sun } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import {
  Button,
  Card,
  Chip,
  ELEMENTS,
  ElementBadge,
  EmptyState,
  ProgressBar,
  ScoreBadge,
  Sheet,
  Stepper,
  elementColor,
} from '../components'
import { getTheme, setTheme, type Theme } from '../theme'
import { PageHeader } from './PageHeader'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-bold tracking-[0.18em] text-muted uppercase">{title}</h2>
      {children}
    </section>
  )
}

const palette = [
  ['Background', 'var(--bg)'],
  ['Surface', 'var(--surface-solid)'],
  ['Text', 'var(--text)'],
  ['Muted', 'var(--text-muted)'],
  ['Pink', 'var(--accent)'],
  ['Mint', 'var(--mint)'],
] as const

export function StyleguideScreen() {
  const [theme, setThemeState] = useState<Theme>(getTheme)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [level, setLevel] = useState(80)
  const [cons, setCons] = useState(6)
  const [have, setHave] = useState(42)
  const [chips, setChips] = useState<string[]>(['Cryo'])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    setThemeState(next)
  }
  const toggleChip = (c: string) =>
    setChips((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]))

  return (
    <div className="space-y-8">
      <PageHeader
        title="Styleguide"
        subtitle="Design system"
        action={
          <Button variant="secondary" size="sm" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {theme === 'dark' ? 'Light' : 'Dark'}
          </Button>
        }
      />

      <Section title="Colours">
        <div className="grid grid-cols-3 gap-2">
          {palette.map(([name, color]) => (
            <div key={name} className="space-y-1">
              <div className="h-12 rounded-2xl border border-line" style={{ background: color }} />
              <p className="text-xs text-muted">{name}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {ELEMENTS.map((e) => (
            <ElementBadge key={e} element={e} />
          ))}
        </div>
        <div className="flex gap-2">
          {ELEMENTS.map((e) => (
            <ElementBadge key={e} element={e} iconOnly />
          ))}
        </div>
      </Section>

      <Section title="Type">
        <Card className="space-y-1">
          <p className="font-display text-3xl font-semibold">Fraunces display</p>
          <p className="font-display text-xl italic">Soft, a little storybook</p>
          <p>Nunito body text, rounded and friendly. 1,234,567 Mora.</p>
          <p className="text-sm text-muted">Muted helper text for hints and labels.</p>
        </Card>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Delete</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button disabled>Disabled</Button>
        </div>
        <Button block size="lg">
          Equip this build
        </Button>
      </Section>

      <Section title="Chips">
        <div className="flex flex-wrap gap-2">
          {ELEMENTS.map((e) => (
            <Chip
              key={e}
              selected={chips.includes(e)}
              color={elementColor(e)}
              onClick={() => toggleChip(e)}
            >
              {e}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {['CRIT Rate', 'CRIT DMG', 'ATK%', 'Energy Recharge'].map((s) => (
            <Chip key={s} selected={chips.includes(s)} onClick={() => toggleChip(s)}>
              {s}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Steppers">
        <Card className="space-y-3">
          <Stepper label="Level" value={level} onChange={setLevel} min={1} max={90} />
          <Stepper
            label="Constellation"
            value={cons}
            onChange={setCons}
            min={0}
            max={6}
            format={(v) => `C${v}`}
          />
        </Card>
      </Section>

      <Section title="Progress">
        <Card className="space-y-4">
          <ProgressBar label="Philosophies of Justice" value={have} max={60} showCount />
          <ProgressBar
            label="Level 80 → 90"
            value={3}
            max={4}
            showCount
            color={elementColor('Cryo')}
          />
          <ProgressBar label="Mora" value={1_200_000} max={1_200_000} showCount />
          <Stepper label="Owned" value={have} onChange={setHave} min={0} max={99} />
        </Card>
      </Section>

      <Section title="Cards">
        <div className="grid grid-cols-2 gap-3">
          <Card element="Cryo" interactive>
            <ElementBadge element="Cryo" iconOnly />
            <p className="mt-3 font-bold">Skirk</p>
            <p className="text-sm text-muted">Lv. 90 · C0</p>
          </Card>
          <Card element="Hydro" interactive>
            <ElementBadge element="Hydro" iconOnly />
            <p className="mt-3 font-bold">Yelan</p>
            <p className="text-sm text-muted">Lv. 90 · C6</p>
          </Card>
        </div>
        <Card>
          <p className="font-bold">Plain card</p>
          <p className="text-sm text-muted">For lists, forms and summaries.</p>
        </Card>
      </Section>

      <Section title="Score">
        <Card className="flex items-center justify-around">
          <ScoreBadge score={92} />
          <ScoreBadge score={68} />
          <ScoreBadge score={31} />
          <ScoreBadge score={85} size={48} />
        </Card>
      </Section>

      <Section title="Empty state">
        <Card>
          <EmptyState
            icon={PackageOpen}
            title="No artifacts yet"
            message="Add your first artifact and it will show up here."
            action={<Button size="sm">Add artifact</Button>}
          />
        </Card>
      </Section>

      <Section title="Sheet">
        <Button variant="secondary" block onClick={() => setSheetOpen(true)}>
          Open bottom sheet
        </Button>
        <Sheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Edit Yelan"
          footer={
            <Button block size="lg" onClick={() => setSheetOpen(false)}>
              Save
            </Button>
          }
        >
          <div className="space-y-3">
            <Stepper label="Level" value={level} onChange={setLevel} min={1} max={90} />
            <Stepper
              label="Constellation"
              value={cons}
              onChange={setCons}
              min={0}
              max={6}
              format={(v) => `C${v}`}
            />
            <p className="text-sm text-muted">Sheets hold quick forms like adding an artifact.</p>
          </div>
        </Sheet>
      </Section>
    </div>
  )
}
