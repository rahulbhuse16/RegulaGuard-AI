/**
 * AppLandingPage.tsx
 *
 * The public landing page: logo/title top-left, "Watch demo" and "Log in" in
 * the nav, a hero with two calls to action, feature sections, and a
 * role-aware, autoplaying interactive walkthrough that opens full-screen the
 * moment "Watch demo" is clicked.
 *
 * The walkthrough content is illustrative and clearly labelled as such: it
 * makes no API calls and shows no real compliance data. This file is
 * self-contained apart from react-router-dom (for the Log in / Get started
 * links) and lucide-react, both already installed in this project.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Eye,
  FileStack,
  FileText,
  FlaskConical,
  Gauge,
  GitCompare,
  History,
  Link2,
  ListChecks,
  Pause,
  Play,
  Radar,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Swords,
  UserCog,
  Users,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react'

const BRAND = 'RegulaGuard AI'

/* ---------------------------------------------------------------------- */
/*  Walkthrough content model (shared by the demo overlay)                 */
/* ---------------------------------------------------------------------- */

type RoleKey = 'ANALYST' | 'MANAGER' | 'AUDITOR' | 'ADMIN'
type Involvement = 'AI_DRAFT' | 'DETERMINISTIC' | 'HUMAN_ONLY'

interface RoleInfo {
  key: RoleKey
  label: string
  icon: LucideIcon
  tagline: string
  description: string
  canApprove: boolean
}

const ROLES: RoleInfo[] = [
  {
    key: 'ANALYST',
    label: 'Compliance Analyst',
    icon: Eye,
    tagline: 'Does the day-to-day review work',
    description:
      'Runs extraction and mapping, reads every AI rationale and source citation, and approves, edits or rejects what the agents propose.',
    canApprove: true,
  },
  {
    key: 'MANAGER',
    label: 'Compliance Manager',
    icon: UserCog,
    tagline: 'Owns the regulatory catalog and sign-off',
    description:
      'Everything an analyst can do, plus adds regulators, regulations and versions, approves remediation plans, and triggers monitoring checks.',
    canApprove: true,
  },
  {
    key: 'AUDITOR',
    label: 'Auditor',
    icon: Scale,
    tagline: 'Independent, read-only oversight',
    description:
      'Cannot approve or change anything. Reads the audit trail and agent activity to confirm every conclusion is evidenced and was reviewed by a person.',
    canApprove: false,
  },
  {
    key: 'ADMIN',
    label: 'Administrator',
    icon: Users,
    tagline: 'Runs the platform itself',
    description:
      'Full access across every area, including everything above, for setting up the organization and stepping in when something needs attention.',
    canApprove: true,
  },
]

interface MockRow {
  left: string
  right: string
  tone?: 'teal' | 'amber' | 'crimson' | 'ochre' | 'brass' | 'neutral'
}

interface Step {
  id: string
  phase: string
  title: string
  icon: LucideIcon
  roles: RoleKey[]
  involvement: Involvement
  summary: string
  significance: string
  mock: { kind: 'rows' | 'timeline'; rows: MockRow[] }
}

const INVOLVEMENT_LABEL: Record<Involvement, string> = {
  AI_DRAFT: 'AI drafts, human reviews',
  DETERMINISTIC: 'Calculated by a fixed rule',
  HUMAN_ONLY: 'Human decision',
}
const INVOLVEMENT_TONE: Record<Involvement, string> = {
  AI_DRAFT: 'bg-brass-100 text-brass-700',
  DETERMINISTIC: 'bg-teal-100 text-teal-700',
  HUMAN_ONLY: 'bg-ink-100 text-ink-700',
}
const TONE_CLASSES: Record<NonNullable<MockRow['tone']>, string> = {
  teal: 'bg-teal-100 text-teal-700',
  amber: 'bg-amber-100 text-amber-700',
  crimson: 'bg-crimson-100 text-crimson-700',
  ochre: 'bg-ochre-100 text-ochre-600',
  brass: 'bg-brass-100 text-brass-700',
  neutral: 'bg-ink-100 text-ink-700',
}

const STEPS: Step[] = [
  {
    id: 'ingest-regulation',
    phase: '1. Bring regulation in',
    title: 'Upload a regulatory document',
    icon: FileStack,
    roles: ['MANAGER', 'ADMIN'],
    involvement: 'DETERMINISTIC',
    summary:
      'A PDF or text regulation is uploaded, checked for a safe file type and size, split into chunks that respect pages and headings, and turned into searchable embeddings.',
    significance:
      'Nothing after this step ever reads a raw document again. Every later AI answer is retrieved from these indexed chunks, which is what makes citations possible.',
    mock: { kind: 'rows', rows: [
      { left: 'consumer-duty-rules-v2.pdf', right: 'Indexed', tone: 'teal' },
      { left: 'internal-aml-policy.pdf', right: 'Embedding', tone: 'amber' },
      { left: 'safeguarding-rules-2023.pdf', right: 'Ready', tone: 'teal' },
    ] },
  },
  {
    id: 'extract-obligations',
    phase: '2. Understand the regulation',
    title: 'AI extracts obligations',
    icon: Sparkles,
    roles: ['ANALYST', 'MANAGER'],
    involvement: 'AI_DRAFT',
    summary:
      'An agent reads each chunk and pulls out concrete, binding requirements, each with a confidence score and the exact source passage it came from.',
    significance:
      'Obligations start life as PENDING. An analyst reads the cited text and the AI reasoning before anything counts as approved, so the model never quietly becomes the authority.',
    mock: { kind: 'rows', rows: [
      { left: 'Firms must identify vulnerable customers proactively', right: 'Pending, 90%', tone: 'brass' },
      { left: 'Fees must be disclosed within 2 business days', right: 'Approved', tone: 'teal' },
      { left: 'Customer records retained for 7 years', right: 'Pending, 74%', tone: 'brass' },
    ] },
  },
  {
    id: 'detect-change',
    phase: '3. Watch for change',
    title: 'Detect a new regulatory version',
    icon: GitCompare,
    roles: ['MANAGER', 'ADMIN'],
    involvement: 'AI_DRAFT',
    summary:
      'When a regulator publishes an update, the new version is compared against the one on file. Added, removed and modified sections are recorded individually, not as one vague summary.',
    significance:
      'This is what makes the platform continuous rather than a one-time import: a changed rule is a trigger for new work, not something that gets missed until an audit finds it.',
    mock: { kind: 'rows', rows: [
      { left: 'Vulnerable customer support, 2022 to 2024', right: 'Modified', tone: 'ochre' },
      { left: 'Fee disclosure window', right: 'Unchanged', tone: 'neutral' },
      { left: 'New data breach notice clause', right: 'Added', tone: 'crimson' },
    ] },
  },
  {
    id: 'ingest-controls',
    phase: '4. Know your own controls',
    title: 'Load internal policies and controls',
    icon: BookOpen,
    roles: ['MANAGER', 'ADMIN'],
    involvement: 'HUMAN_ONLY',
    summary:
      'Internal policies, control descriptions and testing procedures are uploaded the same way regulations are, so the agents have both sides of the picture: what is required, and what the bank already does.',
    significance: 'Without this step every obligation would look unmapped. This is the catalog the mapping agent actually searches against.',
    mock: { kind: 'rows', rows: [
      { left: 'CTRL-VULN-001: vulnerability identification', right: 'Active', tone: 'teal' },
      { left: 'CTRL-FEE-014: fee disclosure checklist', right: 'Active', tone: 'teal' },
      { left: 'CTRL-RET-002: record retention schedule', right: 'Active', tone: 'teal' },
    ] },
  },
  {
    id: 'control-mapping',
    phase: '5. Connect rule to control',
    title: 'Map obligations to controls',
    icon: Link2,
    roles: ['ANALYST', 'MANAGER'],
    involvement: 'AI_DRAFT',
    summary:
      'For each approved obligation, the agent proposes which control covers it, how fully, and why, with a confidence score. The analyst can accept, edit or reject each suggestion.',
    significance:
      'A rule with no mapped control is invisible risk. Making this explicit, with a status of full, partial, none or conflict, is what later turns into a gap.',
    mock: { kind: 'rows', rows: [
      { left: 'Vulnerable customers -> CTRL-VULN-001', right: 'Partial, 71%', tone: 'ochre' },
      { left: 'Fee disclosure -> CTRL-FEE-014', right: 'Full, 88%', tone: 'teal' },
      { left: 'Data breach notice -> none found', right: 'Unmapped', tone: 'crimson' },
    ] },
  },
  {
    id: 'control-assessment',
    phase: '6. Test the control',
    title: 'Assess control effectiveness',
    icon: ClipboardCheck,
    roles: ['ANALYST'],
    involvement: 'DETERMINISTIC',
    summary:
      'Effectiveness is set by a rule based on the most recent test result and its age, not by the AI\u2019s opinion. The AI only explains the rating in plain language and flags it if evidence seems to disagree.',
    significance: 'Keeping the rating rule-based, and using AI only to narrate it, is deliberate: a model should not decide whether a control passed.',
    mock: { kind: 'rows', rows: [
      { left: 'CTRL-VULN-001, tested 200 days ago', right: 'Partially effective', tone: 'ochre' },
      { left: 'CTRL-FEE-014, tested 40 days ago', right: 'Effective', tone: 'teal' },
      { left: 'CTRL-RET-002, never tested', right: 'Not tested', tone: 'neutral' },
    ] },
  },
  {
    id: 'evidence',
    phase: '7. Check the proof',
    title: 'Evaluate evidence sufficiency',
    icon: FileText,
    roles: ['ANALYST'],
    involvement: 'AI_DRAFT',
    summary:
      'Expiry is a plain date check. Whether evidence is strong enough, weak, or contradicts the claim is judged by an agent, and it says so plainly when it cannot tell.',
    significance: 'When evidence genuinely is not enough to decide, the system reports insufficient evidence instead of guessing.',
    mock: { kind: 'rows', rows: [
      { left: 'Q1 vulnerability QA sample', right: 'Expired', tone: 'crimson' },
      { left: 'Fee disclosure audit log', right: 'Sufficient', tone: 'teal' },
      { left: 'Retention schedule snapshot', right: 'Insufficient evidence', tone: 'neutral' },
    ] },
  },
  {
    id: 'gaps',
    phase: '8. Name the gap',
    title: 'Identify compliance gaps',
    icon: ShieldAlert,
    roles: ['ANALYST', 'MANAGER'],
    involvement: 'DETERMINISTIC',
    summary:
      'A fixed set of rules looks at mapping status, control effectiveness and evidence sufficiency together and raises a gap with a specific category, such as unmapped obligation or expired evidence.',
    significance: 'Given the same inputs, the same gap is raised every time, which is what makes it defensible to a regulator.',
    mock: { kind: 'rows', rows: [
      { left: 'Evidence expired', right: 'Open', tone: 'amber' },
      { left: 'Obligation unmapped, data breach notice', right: 'Open', tone: 'crimson' },
      { left: 'Control partial, vulnerable customers', right: 'Open', tone: 'ochre' },
    ] },
  },
  {
    id: 'risk',
    phase: '9. Rank what matters most',
    title: 'Prioritize risk',
    icon: Gauge,
    roles: ['ANALYST', 'MANAGER'],
    involvement: 'DETERMINISTIC',
    summary:
      'Each gap gets a score from a published, versioned formula across seven weighted factors: regulatory, customer, financial and business impact, likelihood, severity and urgency.',
    significance: 'The AI is never asked to invent a risk number, and the formula version is stored with every score.',
    mock: { kind: 'rows', rows: [
      { left: 'Evidence expired, vulnerability control', right: 'High, 6.8', tone: 'amber' },
      { left: 'Data breach notice unmapped', right: 'Critical, 8.9', tone: 'crimson' },
      { left: 'Retention control untested', right: 'Medium, 5.1', tone: 'ochre' },
    ] },
  },
  {
    id: 'remediation',
    phase: '10. Fix it',
    title: 'Generate a remediation plan',
    icon: Wrench,
    roles: ['ANALYST', 'MANAGER'],
    involvement: 'AI_DRAFT',
    summary:
      'For a prioritized gap, an agent drafts a root cause, a proposed action, a suggested owning function, a target date scaled to the risk priority, and what evidence would be needed afterward.',
    significance: 'Drafts are marked AI generated until a manager approves, modifies or rejects them.',
    mock: { kind: 'rows', rows: [
      { left: 'Refresh QA evidence every 90 days', right: 'AI generated', tone: 'brass' },
      { left: 'Build a mapping for breach notices', right: 'Approved', tone: 'teal' },
      { left: 'Schedule retention control test', right: 'AI generated', tone: 'brass' },
    ] },
  },
  {
    id: 'impact-analysis',
    phase: '11. Run the whole chain at once',
    title: 'Autonomous regulatory impact analysis',
    icon: Activity,
    roles: ['MANAGER', 'ADMIN'],
    involvement: 'AI_DRAFT',
    summary:
      'One button runs every step above, in order, for a regulatory change: extract, map, assess, evaluate evidence, find gaps, score risk, draft remediation, then stop for human review.',
    significance: 'A multi-step, stateful workflow with tool calls, retries and a visible trace, not a single prompt pretending to be an agent.',
    mock: { kind: 'timeline', rows: [
      { left: 'Load regulatory change', right: 'Done', tone: 'teal' },
      { left: 'Extract obligations', right: 'Done', tone: 'teal' },
      { left: 'Map controls', right: 'Done', tone: 'teal' },
      { left: 'Identify gaps', right: 'In progress', tone: 'brass' },
      { left: 'Generate remediation', right: 'Waiting', tone: 'neutral' },
    ] },
  },
  {
    id: 'simulation',
    phase: '12. Ask "what if"',
    title: 'Run a what-if simulation',
    icon: FlaskConical,
    roles: ['ANALYST', 'MANAGER'],
    involvement: 'AI_DRAFT',
    summary:
      'A scenario, such as a regulation newly applying to a product, is explored without touching any real record. The result is a forecast of likely gaps and risk, not a fact.',
    significance: 'Every simulation result is labelled as a scenario, never as actual compliance status.',
    mock: { kind: 'rows', rows: [
      { left: 'Scenario: Consumer Duty applies to Savings', right: 'Simulation', tone: 'ochre' },
      { left: 'Estimated gap: no mapped control yet', right: 'Forecast', tone: 'ochre' },
      { left: 'Estimated priority', right: 'High, forecast', tone: 'amber' },
    ] },
  },
  {
    id: 'cross-regulation',
    phase: '13. Compare regulations',
    title: 'Cross-regulation intelligence',
    icon: Scale,
    roles: ['ANALYST', 'MANAGER'],
    involvement: 'AI_DRAFT',
    summary:
      'Approved obligations from two regulations are compared in pairs to find shared, similar, overlapping or duplicate requirements, each with a confidence score.',
    significance: 'Similar wording is never treated as proof of an identical duty; a high score is a lead for a person to check.',
    mock: { kind: 'rows', rows: [
      { left: 'UK and US fee disclosure rules', right: 'Similar, 81%', tone: 'brass' },
      { left: 'Vulnerability identification duties', right: 'Shared, 90%', tone: 'teal' },
      { left: 'Retention periods, 7y vs 5y', right: 'Conflict, 64%', tone: 'crimson' },
    ] },
  },
  {
    id: 'contradictions',
    phase: '14. Catch conflicting rules',
    title: 'Detect potential contradictions',
    icon: Swords,
    roles: ['ANALYST', 'MANAGER'],
    involvement: 'AI_DRAFT',
    summary:
      'Two requirements that cannot both be followed as written, such as different disclosure deadlines for the same action, are flagged as a potential contradiction with the reasoning shown.',
    significance: 'The word "potential" is not decoration. A reviewer must confirm or dismiss it before it is treated as an established conflict.',
    mock: { kind: 'rows', rows: [
      { left: 'Fee disclosure: 2 days vs 5 days', right: 'Potential, timing', tone: 'crimson' },
      { left: 'Reviewed by compliance analyst', right: 'Confirmed', tone: 'teal' },
    ] },
  },
  {
    id: 'governance',
    phase: '15. Prove it happened',
    title: 'Agent activity and the audit trail',
    icon: History,
    roles: ['AUDITOR', 'MANAGER', 'ADMIN'],
    involvement: 'HUMAN_ONLY',
    summary:
      'Every agent run is recorded step by step: which tool it called, what it found, how many times it retried, and how it finished. Every human decision is appended to an audit log nothing in the app can edit.',
    significance: 'If a conclusion cannot be traced back through this trail to a source document, it should not be trusted.',
    mock: { kind: 'rows', rows: [
      { left: 'Obligation approved by J. Rao', right: '2 Oct, 09:14', tone: 'teal' },
      { left: 'Control mapping agent, 3 steps', right: 'Completed', tone: 'teal' },
      { left: 'Remediation rejected by M. Udall', right: '2 Oct, 10:02', tone: 'crimson' },
    ] },
  },
]

const AUTOPLAY_MS = 6500

/* ---------------------------------------------------------------------- */
/*  Small presentational pieces                                            */
/* ---------------------------------------------------------------------- */

function Pill({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium ${className}`}>{children}</span>
}

function MockScreen({ step }: { step: Step }) {
  if (step.mock.kind === 'timeline') {
    return (
      <ol className="space-y-3">
        {step.mock.rows.map((row, i) => (
          <li key={row.left} className="flex items-center gap-3">
            <span
              className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                row.tone === 'teal' ? 'bg-teal-600 text-white' : row.tone === 'brass' ? 'bg-brass-600 text-white' : 'bg-ink-100 text-ink-400'
              }`}
            >
              {row.tone === 'teal' ? <CheckCircle2 className="size-3.5" /> : i + 1}
            </span>
            <span className="text-sm text-ink-900">{row.left}</span>
            <span className="ml-auto text-xs text-slate-500">{row.right}</span>
          </li>
        ))}
      </ol>
    )
  }
  return (
    <div className="divide-y divide-ink-100 overflow-hidden rounded-[0.25rem] border border-ink-100 bg-white">
      {step.mock.rows.map((row) => (
        <div key={row.left} className="flex items-center justify-between gap-4 px-4 py-2.5">
          <span className="text-sm text-ink-900">{row.left}</span>
          <Pill className={TONE_CLASSES[row.tone ?? 'neutral']}>{row.right}</Pill>
        </div>
      ))}
    </div>
  )
}

/* ---------------------------------------------------------------------- */
/*  Full-screen interactive demo overlay                                   */
/* ---------------------------------------------------------------------- */

function DemoOverlay({ onClose }: { onClose: () => void }) {
  const [activeRole, setActiveRole] = useState<RoleKey>('ANALYST')
  const [activeStep, setActiveStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [animKey, setAnimKey] = useState(0)

  const step = STEPS[activeStep]
  const role = useMemo(() => ROLES.find((r) => r.key === activeRole)!, [activeRole])
  const stepInvolvesRole = step.roles.includes(activeRole)

  useEffect(() => setAnimKey((k) => k + 1), [activeStep])

  useEffect(() => {
    if (!isPlaying) return
    const id = window.setInterval(() => setActiveStep((i) => (i + 1) % STEPS.length), AUTOPLAY_MS)
    return () => window.clearInterval(id)
  }, [isPlaying])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const goTo = (i: number) => {
    setActiveStep((i + STEPS.length) % STEPS.length)
    setIsPlaying(false)
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Product walkthrough" className="fixed inset-0 z-50 overflow-y-auto bg-vellum-50">
      <style>{`@keyframes rg-fade-slide { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-100 bg-ink-950 px-6 py-3.5 text-ink-100">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-brass-100" />
          <span className="font-serif text-base font-semibold text-vellum-50">{BRAND}</span>
          <Pill className="ml-1 bg-ink-700 text-ink-100">Interactive demo</Pill>
        </div>
        <button
          onClick={onClose}
          autoFocus
          className="focus-ring inline-flex items-center gap-1.5 rounded-[0.25rem] border border-ink-700 px-3 py-1.5 text-sm text-ink-100 hover:bg-ink-900"
        >
          <X className="size-4" /> Close demo
        </button>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <section className="mb-8">
          <h2 className="font-serif text-xl font-semibold text-ink-950">Choose a role to see what it experiences</h2>
          <p className="mt-1 text-sm text-slate-500">
            The same steps happen for everyone; what changes is who can act. Steps are highlighted when the selected role takes part.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((r) => {
              const active = r.key === activeRole
              return (
                <button
                  key={r.key}
                  onClick={() => setActiveRole(r.key)}
                  className={`focus-ring rounded-r-[0.25rem] border-l-4 bg-white p-4 text-left transition-shadow ${
                    active ? 'border-l-brass-600 shadow-sm ring-1 ring-brass-600/30' : 'border-l-ink-100 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <r.icon className={`size-5 ${active ? 'text-brass-700' : 'text-ink-500'}`} />
                    <span className="font-medium text-ink-950">{r.label}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{r.tagline}</p>
                </button>
              )
            })}
          </div>
          <div className="mt-4 rounded-[0.25rem] border border-ink-100 bg-white p-4">
            <div className="flex items-center gap-2">
              <role.icon className="size-4 text-brass-700" />
              <span className="font-medium text-ink-950">{role.label}</span>
              {!role.canApprove && <Pill className="bg-ink-100 text-ink-700">Cannot approve or reject anything</Pill>}
            </div>
            <p className="mt-1.5 text-sm text-slate-600">{role.description}</p>
          </div>
        </section>

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-serif text-xl font-semibold text-ink-950">The compliance lifecycle, step by step</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => goTo(activeStep - 1)} aria-label="Previous step" className="focus-ring rounded p-1.5 text-slate-500 hover:bg-vellum-100 hover:text-ink-900">
                <ChevronLeft className="size-4" />
              </button>
              <button
                onClick={() => setIsPlaying((p) => !p)}
                className="focus-ring inline-flex items-center gap-1.5 rounded-[0.25rem] border border-ink-300 bg-white px-3 py-1.5 text-sm text-ink-700 hover:bg-vellum-100"
              >
                {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button onClick={() => goTo(activeStep + 1)} aria-label="Next step" className="focus-ring rounded p-1.5 text-slate-500 hover:bg-vellum-100 hover:text-ink-900">
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap gap-1.5">
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                onClick={() => goTo(i)}
                title={s.title}
                aria-label={`Go to step ${i + 1}: ${s.title}`}
                className={`h-1.5 flex-1 min-w-6 rounded-full transition-colors ${
                  i === activeStep ? 'bg-brass-600' : s.roles.includes(activeRole) ? 'bg-ink-300' : 'bg-ink-100'
                }`}
              />
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            <ol className="hidden max-h-[560px] space-y-1 overflow-y-auto pr-1 lg:block">
              {STEPS.map((s, i) => {
                const active = i === activeStep
                const relevant = s.roles.includes(activeRole)
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => goTo(i)}
                      className={`focus-ring flex w-full items-start gap-2.5 rounded-[0.25rem] px-2.5 py-2 text-left text-sm ${
                        active ? 'bg-ink-950 text-vellum-50' : relevant ? 'text-ink-900 hover:bg-vellum-100' : 'text-ink-300 hover:bg-vellum-100'
                      }`}
                    >
                      <s.icon className={`mt-0.5 size-4 shrink-0 ${active ? 'text-brass-100' : relevant ? 'text-ink-500' : 'text-ink-300'}`} />
                      <span>
                        <span className="block text-xs opacity-70">{s.phase}</span>
                        {s.title}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>

            <div key={animKey} className="rounded-[0.25rem] border border-ink-100 bg-white p-6" style={{ animation: 'rg-fade-slide 280ms ease-out' }}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Pill className="bg-ink-100 text-ink-700">{step.phase}</Pill>
                <Pill className={INVOLVEMENT_TONE[step.involvement]}>{INVOLVEMENT_LABEL[step.involvement]}</Pill>
                {stepInvolvesRole ? (
                  <Pill className="bg-teal-100 text-teal-700"><CheckCircle2 className="size-3" /> {role.label} acts here</Pill>
                ) : (
                  <Pill className="bg-ink-100 text-ink-400"><AlertCircle className="size-3" /> Not part of {role.label}&rsquo;s role</Pill>
                )}
              </div>
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[0.25rem] bg-ink-950 text-brass-100">
                  <step.icon className="size-5" />
                </span>
                <div>
                  <h3 className="font-serif text-xl font-semibold text-ink-950">{step.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{step.summary}</p>
                </div>
              </div>
              <div className="mt-5">
                <p className="mb-2 text-xs font-medium text-slate-500">Illustrative screen</p>
                <MockScreen step={step} />
              </div>
              <div className="mt-5 flex gap-2 rounded-[0.25rem] border border-brass-100 bg-brass-100/30 p-3 text-sm text-brass-700">
                <Sparkles className="mt-0.5 size-4 shrink-0" />
                <p><strong>Why it matters: </strong>{step.significance}</p>
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-10 flex items-start gap-2 border-t border-ink-100 pt-6 pb-10 text-sm text-slate-500">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-ochre-600" />
          <p>
            This demo is a walkthrough for explaining the product. Screens shown are simplified mock-ups, not a live view of the
            application, and none of the figures are real compliance data.
          </p>
        </footer>
      </main>
    </div>
  )
}

/* ---------------------------------------------------------------------- */
/*  Landing page                                                           */
/* ---------------------------------------------------------------------- */

export default function AppLandingPage() {
  const [showDemo, setShowDemo] = useState(false)

  return (
    <div className="min-h-screen bg-vellum-50 text-ink-900">
      {/* ---------------- Nav ---------------- */}
      <nav className="sticky top-0 z-30 border-b border-ink-100 bg-vellum-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-6 text-ink-950" />
            <span className="font-serif text-lg font-semibold text-ink-950">{BRAND}</span>
          </div>
          <div className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
            <a href="#how-it-works" className="hover:text-ink-900">How it works</a>
            <a href="#roles" className="hover:text-ink-900">Built for every role</a>
            <a href="#principles" className="hover:text-ink-900">Why it's trustworthy</a>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDemo(true)}
              className="focus-ring hidden items-center gap-1.5 rounded-[0.25rem] border border-ink-300 bg-white px-3.5 py-2 text-sm font-medium text-ink-900 hover:bg-vellum-100 sm:inline-flex"
            >
              <Play className="size-3.5" /> Watch demo
            </button>
            <Link
              to="/login"
              className="focus-ring inline-flex items-center gap-1.5 rounded-[0.25rem] bg-ink-900 px-3.5 py-2 text-sm font-medium text-vellum-50 hover:bg-ink-700"
            >
              Log in
            </Link>
          </div>
        </div>
      </nav>

      {/* ---------------- Hero ---------------- */}
      <header className="relative overflow-hidden bg-ink-950 text-ink-100">
        <div
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #8a6a1b 0%, transparent 70%)' }}
        />
        <div className="relative mx-auto max-w-6xl px-6 py-20">
          <Pill className="bg-ink-700 text-ink-100">Built for the Accenture ET AI Hackathon</Pill>
          <h1 className="mt-5 max-w-3xl font-serif text-5xl font-semibold leading-tight text-vellum-50">
            From regulation to remediation, with every step traceable.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-ink-300">
            {BRAND} keeps one continuous chain for a bank: regulation, obligation, control, evidence, gap, risk, remediation. Specialized
            agents read regulatory text and internal controls, draft findings with citations and a confidence score, and a person
            approves or rejects every one of them.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/login"
              className="focus-ring inline-flex items-center gap-2 rounded-[0.25rem] bg-brass-600 px-5 py-3 text-sm font-semibold text-ink-950 hover:bg-brass-600/90"
            >
              Get started <ArrowRight className="size-4" />
            </Link>
            <button
              onClick={() => setShowDemo(true)}
              className="focus-ring inline-flex items-center gap-2 rounded-[0.25rem] border border-ink-300 px-5 py-3 text-sm font-semibold text-vellum-50 hover:bg-ink-900"
            >
              <Play className="size-4" /> Watch demo
            </button>
          </div>

          <div className="mt-12 flex flex-wrap items-center gap-2 text-sm">
            {['Regulation', 'Obligation', 'Control', 'Evidence', 'Gap', 'Risk', 'Remediation'].map((n, i, arr) => (
              <span key={n} className="flex items-center gap-2">
                <span className="rounded-sm border border-ink-700 bg-ink-900 px-2.5 py-1 text-ink-100">{n}</span>
                {i < arr.length - 1 && <ChevronRight className="size-4 text-ink-300" />}
              </span>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        {/* ---------------- Stats strip ---------------- */}
        <section className="mb-16 grid gap-4 sm:grid-cols-3">
          {[
            { value: '14', label: 'compliance capabilities covered, from ingestion to contradiction detection' },
            { value: '13', label: 'specialized agents, each doing one job well instead of one agent doing everything' },
            { value: '100%', label: 'of AI conclusions carry a source citation and a human review state' },
          ].map((s) => (
            <div key={s.label} className="rounded-r-[0.25rem] border-l-4 border-l-brass-600 bg-white p-5">
              <p className="font-serif text-4xl font-semibold tabular text-ink-950">{s.value}</p>
              <p className="mt-1 text-sm text-slate-500">{s.label}</p>
            </div>
          ))}
        </section>

        {/* ---------------- How it works ---------------- */}
        <section id="how-it-works" className="mb-16 scroll-mt-20">
          <h2 className="font-serif text-2xl font-semibold text-ink-950">How it works</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Fifteen steps, from the first document upload to the audit trail. Watch the full interactive walkthrough to see what each
            step looks like and who is involved.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.slice(0, 8).map((s) => (
              <div key={s.id} className="rounded-[0.25rem] border border-ink-100 bg-white p-4">
                <s.icon className="size-5 text-ink-700" />
                <p className="mt-2 text-xs text-slate-400">{s.phase}</p>
                <p className="font-medium text-ink-950">{s.title}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowDemo(true)}
            className="focus-ring mt-6 inline-flex items-center gap-2 rounded-[0.25rem] border border-ink-300 bg-white px-4 py-2.5 text-sm font-medium text-ink-900 hover:bg-vellum-100"
          >
            <Play className="size-4" /> See all 15 steps in the interactive demo
          </button>
        </section>

        {/* ---------------- Roles ---------------- */}
        <section id="roles" className="mb-16 scroll-mt-20">
          <h2 className="font-serif text-2xl font-semibold text-ink-950">Built for every role in compliance</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            The same lifecycle, different permissions. The backend is always the final authority on what each role can do.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map((r) => (
              <div key={r.key} className="rounded-r-[0.25rem] border-l-4 border-l-ink-700 bg-white p-4">
                <r.icon className="size-5 text-ink-700" />
                <p className="mt-2 font-medium text-ink-950">{r.label}</p>
                <p className="mt-1 text-sm text-slate-500">{r.tagline}</p>
                {!r.canApprove && <Pill className="mt-2 bg-ink-100 text-ink-700">Read-only</Pill>}
              </div>
            ))}
          </div>
        </section>

        {/* ---------------- Principles ---------------- */}
        <section id="principles" className="scroll-mt-20">
          <h2 className="font-serif text-2xl font-semibold text-ink-950">Why it's trustworthy</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Banks must continuously connect regulation to internal practice and prove it. This platform is built around four
            commitments to make that provable, not just plausible.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { icon: ListChecks, title: 'Full traceability', body: 'Every AI conclusion links back through a chain of citations to the exact source passage it came from.' },
              { icon: ShieldAlert, title: 'Deterministic risk', body: 'Risk scores and gap categories come from fixed, versioned rules, not from a model guessing a number.' },
              { icon: Eye, title: 'Human in the loop', body: 'Nothing material is final until a person reviews it: obligations, mappings, remediations, contradictions.' },
              { icon: Radar, title: 'Continuous, not one-time', body: 'New regulatory versions trigger change detection and a full autonomous impact analysis, on demand or on a schedule.' },
            ].map((item) => (
              <div key={item.title} className="rounded-[0.25rem] border border-ink-100 bg-white p-4">
                <item.icon className="size-5 text-ink-700" />
                <p className="mt-2 font-medium text-ink-950">{item.title}</p>
                <p className="mt-1 text-sm text-slate-500">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------- Closing CTA ---------------- */}
        <section className="mt-16 rounded-[0.25rem] bg-ink-950 px-8 py-10 text-center text-ink-100">
          <h2 className="font-serif text-2xl font-semibold text-vellum-50">See it work end to end</h2>
          <p className="mx-auto mt-2 max-w-xl text-ink-300">
            Watch the interactive walkthrough, then sign in to try it against real backend data.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setShowDemo(true)}
              className="focus-ring inline-flex items-center gap-2 rounded-[0.25rem] bg-brass-600 px-5 py-3 text-sm font-semibold text-ink-950 hover:bg-brass-600/90"
            >
              <Play className="size-4" /> Watch demo
            </button>
            <Link
              to="/login"
              className="focus-ring inline-flex items-center gap-2 rounded-[0.25rem] border border-ink-300 px-5 py-3 text-sm font-semibold text-vellum-50 hover:bg-ink-900"
            >
              Log in <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink-100 px-6 py-8 text-center text-xs text-slate-400">
        {BRAND}. AI output is decision support and is not legal or regulatory advice.
      </footer>

      {showDemo && <DemoOverlay onClose={() => setShowDemo(false)} />}
    </div>
  )
}