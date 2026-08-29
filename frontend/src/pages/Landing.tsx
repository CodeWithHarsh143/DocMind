import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BookOpenText, FileSearch, MessageSquareText, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Logo } from '../components/ui/Brand'
import { Button } from '../components/ui/Button'
import { ThemeToggle } from '../components/ui/ThemeToggle'

const FEATURES = [
  {
    icon: FileSearch,
    title: 'Grounded answers',
    text: 'Every reply is generated only from the content you upload with retrieval-augmented generation.',
  },
  {
    icon: Zap,
    title: 'Real-time streaming',
    text: 'Responses type out as they are generated — no waiting for a full answer to appear.',
  },
  {
    icon: MessageSquareText,
    title: 'Conversational AI',
    text: 'Clarify, dig deeper, or shift topics. DocMind keeps the context of your discussion.',
  },
  {
    icon: BookOpenText,
    title: 'Markdown & code',
    text: 'Answers render with headings, lists, tables and syntax-highlighted code blocks.',
  },
  {
    icon: ShieldCheck,
    title: 'Workspace isolation',
    text: 'Documents are scoped to workspaces, keeping knowledge bases separate and secure.',
  },
  {
    icon: Sparkles,
    title: 'Upload-friendly',
    text: 'Drag-and-drop PDF, DOCX and TXT files. Processing and embedding run automatically.',
  },
]

const STEPS = [
  { n: '01', t: 'Create a workspace', d: 'A private space for the documents you want to query.' },
  { n: '02', t: 'Upload your files', d: 'PDFs, DOCX and TXT — dropped in and processed automatically.' },
  { n: '03', t: 'Ask & get streamed answers', d: 'Type a question and watch the answer stream in, grounded in your files.' },
]

function Navbar() {
  const { status } = useAuth()
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
      <Link to="/" aria-label="DocMind — go home">
        <Logo />
      </Link>
      <nav className="hidden items-center gap-8 text-[14px] text-[var(--text-2)] md:flex" aria-label="Landing">
        <a href="#features" className="transition-colors hover:text-[var(--text-1)]">Features</a>
        <a href="#how" className="transition-colors hover:text-[var(--text-1)]">How it works</a>
        <a href="#faq" className="transition-colors hover:text-[var(--text-1)]">FAQ</a>
      </nav>
      <div className="flex items-center gap-2.5">
        <ThemeToggle />
        {status === 'authenticated' ? (
          <Link to="/app">
            <Button variant="ghost" size="md">Open app <ArrowRight size={15} /></Button>
          </Link>
        ) : (
          <>
            <Link to="/login" className="hidden sm:block">
              <Button variant="ghost" size="md">Sign in</Button>
            </Link>
            <Link to="/register">
              <Button variant="outline" size="md">Get started <ArrowRight size={15} /></Button>
            </Link>
          </>
        )}
      </div>
    </header>
  )
}

export default function LandingPage() {
  const { status } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-dvh">
      <div className="aurora" aria-hidden />
      <Navbar />

      {/* Hero */}
      <section className="mx-auto w-full max-w-5xl px-5 pb-16 pt-12 text-center sm:px-8 sm:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-1)]/80 px-4 py-1.5 text-[12.5px] font-medium text-[var(--text-2)] backdrop-blur"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
          Retrieval-augmented Q&A · Gemini powered
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="font-display text-[42px] font-semibold leading-[1.06] tracking-tight sm:text-[64px]"
        >
          Turn your documents into
          <br />
          <span className="gradient-text">intelligent answers.</span>
        </motion.h1>

        <div className="mx-auto mt-5 max-w-xl">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.16 }}
            className="text-center text-[16px] leading-relaxed text-[var(--text-3)] sm:text-[17px]"
          >
            Upload PDFs, DOCX and TXT files, then ask anything. DocMind streams precise,
            context-grounded answers at lightning speed — no more digging through pages.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.24 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
          {status === 'authenticated' ? (
            <Button size="lg" onClick={() => navigate('/app')}>
              Open your app <ArrowRight size={17} />
            </Button>
          ) : (
            <>
              <Button size="lg" onClick={() => navigate('/register')}>
                Get started free <ArrowRight size={17} />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/login')}>
                Sign in
              </Button>
            </>
          )}
        </motion.div>

        {/* Chat preview */}
        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.32, type: 'spring', stiffness: 120, damping: 20 }}
          className="relative mx-auto mt-16 max-w-3xl"
        >
          <div className="absolute -inset-6 rounded-[32px] bg-accent-grad opacity-20 blur-3xl" aria-hidden />
          <div className="island relative overflow-hidden rounded-[var(--radius-xl)] p-2">
            <div className="flex items-center gap-1.5 border-b border-[var(--border-subtle)] px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--danger)]/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--warning)]/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--success)]/70" />
              <span className="ml-3 text-[12px] text-[var(--text-3)]">docmind — Engineering Wiki</span>
            </div>
            <div className="flex flex-col gap-4 p-5 text-left">
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-[var(--radius-lg)] rounded-tr-md bg-accent-grad px-4 py-2.5 text-[13.5px] text-white">
                  Summarize the onboarding runbook for me
                </div>
              </div>
              <div className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[var(--radius-md)] bg-accent-grad text-[var(--on-accent)]">
                  <Sparkles size={13} />
                </span>
                <div className="rounded-[var(--radius-lg)] rounded-tl-md border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3 text-[13.5px] leading-relaxed text-[var(--text-2)]">
                  Here's a summary of the onboarding runbook:
                  <br />
                  <br />
                  <span className="text-[var(--text-1)]">
                    <span className="font-semibold">1. Setup — </span>Provide access to the staging
                    environment and request the deploy credentials from the platform team. Install the
                    CLI and verify connectivity with <code className="rounded bg-[var(--accent-soft)] px-1 py-0.5 text-[12px] text-[var(--accent-hi)]">docmind ping</code>.
                  </span>
                  <span className="stream-caret" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-[30px] font-semibold tracking-tight sm:text-[36px]">
            Everything you need to <span className="gradient-text">chat with your files</span>
          </h2>
          <p className="mt-3 text-[15px] text-[var(--text-3)]">
            A focused, production-quality RAG experience — from upload to streamed answer.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
              className="group rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-1)]/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--accent)]/50 hover:shadow-[var(--shadow-md)]"
            >
              <span className="mb-4 inline-grid h-11 w-11 place-items-center rounded-[var(--radius-md)] bg-[var(--accent-soft)] text-[var(--accent-hi)] transition-transform duration-300 group-hover:scale-110">
                <Icon size={19} />
              </span>
              <h3 className="font-display text-[17px] font-semibold">{title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-3)]">{text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-1)]/50 p-8 sm:p-12">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-[30px] font-semibold tracking-tight sm:text-[36px]">
              Up and running in <span className="gradient-text">three steps</span>
            </h2>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map(({ n, t, d }, i) => (
              <motion.div
                key={n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative"
              >
                <span className="font-display bg-gradient-to-b from-[var(--accent-hi)] to-transparent bg-clip-text text-[52px] font-bold leading-none text-transparent">
                  {n}
                </span>
                <h3 className="mt-3 font-display text-[18px] font-semibold">{t}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-3)]">{d}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-strong)] bg-gradient-to-br from-[var(--accent-soft)] via-[var(--bg-1)] to-[var(--bg-1)] p-10 text-center sm:p-16"
        >
          <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-[36rem] -translate-x-1/2 rounded-full bg-[var(--accent)]/20 blur-[110px]" aria-hidden />
          <h2 className="relative font-display text-[28px] font-semibold tracking-tight sm:text-[38px]">
            Ready to make your documents talk?
          </h2>
          <div className="relative mx-auto mt-3 max-w-md">
            <p className="text-center text-[15px] text-[var(--text-3)]">
              Free to start. Upload a file, ask a question, and watch the answer stream in.
            </p>
          </div>
          <div className="relative mt-8 flex justify-center">
            <Button size="lg" onClick={() => navigate(status === 'authenticated' ? '/app' : '/register')}>
              {status === 'authenticated' ? 'Go to your app' : 'Create your account'} <ArrowRight size={17} />
            </Button>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-[var(--border-subtle)] py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-5 sm:flex-row sm:px-8">
          <Link to="/" aria-label="DocMind — go home">
            <Logo />
          </Link>
          <p className="text-[12.5px] text-[var(--text-3)]">
            Built with FastAPI, pgvector & Google Gemini. © {new Date().getFullYear()} DocMind.
          </p>
        </div>
      </footer>
    </div>
  )
}