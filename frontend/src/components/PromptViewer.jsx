import { useState } from 'react'
import {
  Copy, Check, ChevronDown, ChevronUp,
  Terminal, Lightbulb, User, BookOpen,
  AlignLeft, ShieldCheck, Sparkles, Save,
  BookMarked, Hash,
} from 'lucide-react'
import { SkeletonPrompt } from './Skeleton'
import FeedbackBar from './FeedbackBar'

// ── Copy button ────────────────────────────────────────────────────────────
function CopyBtn({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="btn-ghost py-1 px-2.5 text-xs gap-1.5 flex-shrink-0">
      {copied
        ? <><Check size={11} className="text-emerald-400" /><span className="text-emerald-400">Copied</span></>
        : <><Copy size={11} /><span>{label}</span></>
      }
    </button>
  )
}

// ── Collapsible section block ──────────────────────────────────────────────
function SectionBlock({ icon: Icon, label, content, accent, defaultOpen = true, mono = false }) {
  const [open, setOpen] = useState(defaultOpen)

  const accents = {
    indigo:  'border-indigo-500/20  bg-indigo-500/[0.04]',
    purple:  'border-purple-500/20  bg-purple-500/[0.04]',
    emerald: 'border-emerald-500/20 bg-emerald-500/[0.04]',
    amber:   'border-amber-500/20   bg-amber-500/[0.04]',
    rose:    'border-rose-500/20    bg-rose-500/[0.04]',
    blue:    'border-blue-500/20    bg-blue-500/[0.04]',
  }
  const iconColors = {
    indigo:  'text-indigo-400',
    purple:  'text-purple-400',
    emerald: 'text-emerald-400',
    amber:   'text-amber-400',
    rose:    'text-rose-400',
    blue:    'text-blue-400',
  }

  return (
    <div className={`rounded-xl border overflow-hidden ${accents[accent]}`}>
      <div
        className="flex items-center justify-between px-4 py-2.5 cursor-pointer
                   hover:bg-white/[0.03] transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <Icon size={13} className={iconColors[accent]} />
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {open && <CopyBtn text={content} />}
          {open
            ? <ChevronUp size={13} className="text-gray-600" />
            : <ChevronDown size={13} className="text-gray-600" />
          }
        </div>
      </div>
      {open && (
        <div className="px-4 pb-4 pt-1 fade-up">
          {mono
            ? <pre className="text-xs text-gray-300 font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto">{content}</pre>
            : <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{content}</p>
          }
        </div>
      )}
    </div>
  )
}

// ── Save prompt button ─────────────────────────────────────────────────────
function SavePromptBtn({ promptData, plan }) {
  const [saving, setSaving]   = useState(false)
  const [savedId, setSavedId] = useState(null)

  const handleSave = async () => {
    if (!plan || saving || savedId) return
    setSaving(true)
    try {
      // Re-call /prompt/ with save=true via the memory endpoint
      // (already saved via saveToHistory in the hook — show confirmation)
      setSavedId('saved')
    } finally {
      setSaving(false)
    }
  }

  if (savedId) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-400">
        <Check size={12} /> Saved to history
      </div>
    )
  }

  return (
    <button
      onClick={handleSave}
      disabled={saving}
      className="btn-ghost py-1.5 px-3 text-xs gap-1.5"
    >
      {saving
        ? <><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
        : <><Save size={12} />Save prompt</>
      }
    </button>
  )
}

// ── Full assembled prompt view ─────────────────────────────────────────────
function AssembledView({ systemPrompt, userPrompt }) {
  const full = `=== SYSTEM PROMPT ===\n${systemPrompt}\n\n=== USER PROMPT ===\n${userPrompt}`
  return (
    <div className="space-y-3">
      <SectionBlock
        icon={ShieldCheck} label="System Prompt" content={systemPrompt}
        accent="purple" defaultOpen={false} mono
      />
      <SectionBlock
        icon={AlignLeft} label="User Prompt" content={userPrompt}
        accent="indigo" defaultOpen={true} mono
      />
      <div className="flex justify-end">
        <CopyBtn text={full} label="Copy both" />
      </div>
    </div>
  )
}

// ── Sections breakdown view ────────────────────────────────────────────────
function SectionsView({ sections }) {
  const items = [
    { key: 'role',          icon: User,        label: 'Role',          accent: 'emerald', open: true  },
    { key: 'instructions',  icon: BookOpen,    label: 'Instructions',  accent: 'indigo',  open: true  },
    { key: 'output_format', icon: AlignLeft,   label: 'Output Format', accent: 'blue',    open: false },
    { key: 'constraints',   icon: ShieldCheck, label: 'Constraints',   accent: 'amber',   open: false },
    { key: 'examples',      icon: Sparkles,    label: 'Examples',      accent: 'rose',    open: false },
  ]

  return (
    <div className="space-y-2.5">
      {items.map(({ key, icon, label, accent, open }) => (
        <SectionBlock
          key={key}
          icon={icon}
          label={label}
          content={sections[key]}
          accent={accent}
          defaultOpen={open}
        />
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function PromptViewer({ promptData, loading, entryId }) {
  const [view,     setView]     = useState('sections')
  // Local copies so we can swap in improved prompts without re-running the pipeline
  const [localData, setLocalData] = useState(null)

  if (loading) return <SkeletonPrompt />
  if (!promptData) return null

  // Use improved version if available, otherwise original
  const active = localData
    ? { ...promptData, ...localData }
    : promptData

  const hasSections = !!active.sections

  const handleImproved = ({ system_prompt, user_prompt }) => {
    setLocalData({ system_prompt, user_prompt })
  }

  return (
    <div className="space-y-5 stagger">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
            <Terminal size={14} className="text-pink-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Generated Prompt</h2>
            <p className="text-[11px] text-gray-600 mt-0.5">
              Optimised for {active.tool}
              {active.saved_id && (
                <span className="ml-2 text-emerald-400 flex items-center gap-1 inline-flex">
                  <BookMarked size={9} /> Saved
                </span>
              )}
              {localData && (
                <span className="ml-2 text-indigo-400 flex items-center gap-1 inline-flex">
                  <Sparkles size={9} /> Improved
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="badge bg-white/[0.05] text-gray-400 border border-white/[0.08]">
          {active.tool}
        </div>
      </div>

      {/* View toggle */}
      {hasSections && (
        <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.07] rounded-xl w-fit">
          {[
            { id: 'sections',  label: '5 Sections',  icon: Hash },
            { id: 'assembled', label: 'Assembled',   icon: Terminal },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                          transition-all duration-150
                          ${view === id
                            ? 'bg-indigo-600 text-white shadow-glow-sm'
                            : 'text-gray-500 hover:text-gray-300'
                          }`}
            >
              <Icon size={11} />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {hasSections && view === 'sections'
        ? <SectionsView sections={active.sections} />
        : <AssembledView systemPrompt={active.system_prompt} userPrompt={active.user_prompt} />
      }

      {/* Feedback bar */}
      <FeedbackBar entryId={entryId} onImproved={handleImproved} />

      {/* Tips */}
      {active.tips?.length > 0 && (
        <div className="glass rounded-xl p-4 border-amber-500/10 bg-amber-500/[0.03]">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={13} className="text-amber-400" />
            <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
              Tips for {promptData.tool}
            </span>
          </div>
          <ul className="space-y-2">
            {active.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                <span className="text-amber-500/60 mt-0.5 flex-shrink-0">▸</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
