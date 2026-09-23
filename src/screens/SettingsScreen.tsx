import { ArrowLeft, Download, Moon, Palette, RotateCcw, Sun, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { Button, Card, Sheet, Toggle } from '../components'
import { meta } from '../data'
import { db } from '../db'
import { downloadBackup, restoreBackup } from '../db/backup'
import { getTheme, setTheme, type Theme } from '../theme'
import { PageHeader } from './PageHeader'

const section = 'text-xs font-bold tracking-[0.18em] text-muted uppercase'

export function SettingsScreen() {
  const [theme, setThemeState] = useState<Theme>(getTheme)
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)
  const [confirm, setConfirm] = useState<
    null | { kind: 'restore'; file: File } | { kind: 'reset' }
  >(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const changeTheme = (light: boolean) => {
    const next: Theme = light ? 'light' : 'dark'
    setTheme(next)
    setThemeState(next)
  }

  async function exportBackup() {
    await downloadBackup(db)
    setMessage({ text: 'Backup saved to your downloads.' })
  }

  async function doConfirm() {
    if (!confirm) return
    try {
      if (confirm.kind === 'restore') {
        await restoreBackup(db, confirm.file)
        setMessage({ text: 'Backup restored. ✿' })
      } else {
        await Promise.all(db.tables.map((t) => t.clear()))
        setMessage({ text: 'Everything was reset.' })
      }
    } catch (e) {
      setMessage({ text: (e as Error).message, error: true })
    } finally {
      setConfirm(null)
    }
  }

  return (
    <div className="space-y-6">
      <Link
        to="/"
        className="inline-flex min-h-10 items-center gap-1 rounded-full pr-3 text-sm font-bold text-muted hover:text-ink"
      >
        <ArrowLeft size={18} /> Home
      </Link>
      <PageHeader title="Settings" />

      {message && (
        <p
          role="status"
          className={
            message.error
              ? 'rounded-2xl bg-danger/10 p-3 text-sm text-danger'
              : 'rounded-2xl bg-mint/10 p-3 text-sm text-mint'
          }
        >
          {message.text}
        </p>
      )}

      <section className="space-y-2.5">
        <h2 className={section}>Look</h2>
        <Toggle
          checked={theme === 'light'}
          onChange={changeTheme}
          icon={theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
          label="Light theme"
          description="Dark is the dreamy night sky; light is soft and bright."
        />
      </section>

      <section className="space-y-2.5">
        <h2 className={section}>Your data</h2>
        <Card className="space-y-3">
          <p className="text-sm text-muted">
            Everything is saved on this phone only. Make a backup now and then, especially before
            changing phones.
          </p>
          <Button block variant="secondary" onClick={exportBackup}>
            <Download size={18} /> Save a backup
          </Button>
          <Button block variant="secondary" onClick={() => fileInput.current?.click()}>
            <Upload size={18} /> Restore from a backup
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="Backup file"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) setConfirm({ kind: 'restore', file })
              e.target.value = ''
            }}
          />
          <Button block variant="danger" onClick={() => setConfirm({ kind: 'reset' })}>
            <RotateCcw size={18} /> Reset everything
          </Button>
        </Card>
      </section>

      <section className="space-y-2.5">
        <h2 className={section}>About</h2>
        <Card className="space-y-2 text-sm text-muted">
          <p>
            Game data up to version {meta.gameVersion} (genshin-db {meta.genshinDbVersion}).
          </p>
          <p>
            Thanks to genshin-db, Genshin Optimizer, paimon.moe, Enka.Network and Project Amber for
            the data and pictures. Not affiliated with HoYoverse.
          </p>
          <Link to="/styleguide" className="inline-flex items-center gap-1.5 font-bold text-accent">
            <Palette size={16} /> Styleguide
          </Link>
        </Card>
      </section>

      {confirm && (
        <Sheet
          open
          onClose={() => setConfirm(null)}
          title={confirm.kind === 'reset' ? 'Reset everything?' : 'Restore this backup?'}
        >
          <div className="space-y-4 pb-2">
            <p className="text-muted">
              {confirm.kind === 'reset'
                ? 'All characters, weapons, artifacts, goals and counts will be deleted from this phone. This can’t be undone unless you have a backup.'
                : `Everything in the app will be replaced with “${confirm.file.name}”.`}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" block onClick={() => setConfirm(null)}>
                Cancel
              </Button>
              <Button variant="danger" block onClick={doConfirm}>
                {confirm.kind === 'reset' ? 'Reset' : 'Restore'}
              </Button>
            </div>
          </div>
        </Sheet>
      )}
    </div>
  )
}
