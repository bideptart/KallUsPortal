"use client"

// Get-started signup widget for www.9278.ai — same design as 9278.io's
// /get-started (billing toggle + 3 plan cards + account form + order-summary
// sidebar), but wired to the voice.9278.ai portal with Stripe (USD).
//
// Flow: fetch live plans from voice.9278.ai → collect account + agent details
// → POST to /api/stripe/checkout-session/signup → redirect to Stripe Checkout.
// After payment Stripe returns the customer to voice.9278.ai/signup/success,
// where the portal finalizes the account and signs them in. The phone number
// is auto-assigned server-side at checkout (no picker UI here). Agent language
// defaults to English (en-US) — no language selector.
//
// IMPORTANT: exported as a NAMED export `SignupForm` to match
// `app/get-started/page.tsx`: import { SignupForm } from "@/components/get-started/signup-form"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Check, Loader2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

const PORTAL_BASE = "https://voice.9278.ai"
const RESELLER_PORTAL = "9278.ai"
const DEFAULT_LANGUAGE = "en-US"   // English by default — no in-form selector

type Plan = {
  id: string
  label: string
  amount: number
  yearlyAmount: number
  yearlySavingsUsd?: number
  min: number
  rate: number
  overage: number
  dids: number
  concurrent: number
  agents: number
  voiceStack: string
  support: string
  tag: string | null
  sub: string
  perks: string[]
}

const usd = (n: number) =>
  "$" + Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })

export function SignupForm() {
  // Honor ?plan=…&cycle=… deep-links from the marketing /pricing page.
  const searchParams = useSearchParams()
  const initialPlanId = (() => {
    const p = searchParams.get("plan")
    return p && ["starter", "growth", "scale"].includes(p) ? p : "growth"
  })()
  const initialCycle: "monthly" | "yearly" =
    searchParams.get("cycle") === "yearly" ? "yearly" : "monthly"

  const [plans, setPlans] = useState<Plan[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const [cycle, setCycle] = useState<"monthly" | "yearly">(initialCycle)
  const [selectedId, setSelectedId] = useState<string>(initialPlanId)

  const [form, setForm] = useState({
    name: "",
    company: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    agentName: "",
    greeting: "",
  })

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load live plans from the portal on mount.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const plansRes = await fetch(`${PORTAL_BASE}/api/plans`).then((r) => r.json())
        if (cancelled) return
        setPlans(plansRes.plans || [])
      } catch (e) {
        if (!cancelled) setLoadError((e as Error).message || "Could not load plans")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const selectedPlan = useMemo(() => plans.find((p) => p.id === selectedId), [plans, selectedId])

  const priceFor = (p: Plan) => (cycle === "yearly" ? p.yearlyAmount : p.amount)
  const yearlySavings = (p: Plan) =>
    p.yearlySavingsUsd ?? Math.max(0, p.amount * 12 - p.yearlyAmount)

  const updateInput =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))

  const updateTextarea =
    (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))

  const validateAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!selectedPlan) return setError("Please pick a plan.")
    if (!form.name.trim()) return setError("Tell us your name.")
    if (!form.company.trim()) return setError("Company is required.")
    if (!form.username.trim()) return setError("Pick a username.")
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError("Enter a valid email.")
    if (form.password.length < 8) return setError("Password must be 8+ characters.")

    setSubmitting(true)

    const body = {
      name: form.name.trim(),
      company: form.company.trim(),
      username: form.username.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      password: form.password,

      planLabel: selectedPlan.label,
      planAmount: priceFor(selectedPlan),
      planMin: selectedPlan.min,
      planRate: selectedPlan.rate,
      planAgents: selectedPlan.agents,
      planCycle: cycle,

      voice: "Kore",
      language: DEFAULT_LANGUAGE,   // English by default
      agentName: form.agentName.trim() || `${form.company.trim()} Receptionist`,
      greeting:
        form.greeting.trim() ||
        `Hi, thanks for calling ${form.company.trim()}. How can I help today?`,
      prompt: "",
      kbCompany: "",
      kbFaqs: "",

      resellerPortal: RESELLER_PORTAL,
    }

    try {
      const session = await fetch(`${PORTAL_BASE}/api/stripe/checkout-session/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json())

      if (session.url) {
        window.location.href = session.url
      } else {
        setSubmitting(false)
        setError(session.error || "Could not start checkout.")
      }
    } catch (err) {
      setSubmitting(false)
      setError((err as Error).message || "Could not start checkout.")
    }
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-6 text-sm text-destructive">
        Couldn&apos;t load the signup form: {loadError}
      </div>
    )
  }

  if (plans.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading plans…
      </div>
    )
  }

  const planPrice = selectedPlan ? priceFor(selectedPlan) : 0
  const totalAmount = planPrice

  return (
    <>
      {/* Billing cycle toggle */}
      <div className="mb-8 flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 text-sm">
          <button
            type="button"
            onClick={() => setCycle("monthly")}
            className={cn(
              "rounded-full px-4 py-1.5 transition",
              cycle === "monthly" ? "bg-foreground text-background" : "text-muted-foreground",
            )}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setCycle("yearly")}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-1.5 transition",
              cycle === "yearly" ? "bg-sky-500 text-white" : "text-muted-foreground",
            )}
          >
            Yearly
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px]",
                cycle === "yearly" ? "bg-white/20 text-white" : "bg-sky-100 text-sky-700",
              )}
            >
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Per-second billing callout */}
      <div className="mb-8 flex justify-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-800 dark:border-sky-800/40 dark:bg-sky-950/40 dark:text-sky-200">
          <span>⏱️</span>
          <span>
            <strong>Per-second billing</strong> — pay only for the seconds you use.
          </span>
        </div>
      </div>

      {/* Plan cards */}
      <div className="mb-10 grid gap-5 md:grid-cols-3">
        {plans.map((p) => {
          const selected = p.id === selectedId
          const price = priceFor(p)
          return (
            <Card
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedId(p.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  setSelectedId(p.id)
                }
              }}
              className={cn(
                "relative cursor-pointer transition focus:outline-none",
                selected ? "border-sky-500 ring-2 ring-sky-500/30" : "hover:border-sky-300",
              )}
            >
              {p.tag && (
                <Badge className="absolute -top-3 left-4 bg-sky-500 hover:bg-sky-500">{p.tag}</Badge>
              )}
              <CardHeader>
                <CardTitle>{p.label}</CardTitle>
                <p className="text-sm text-muted-foreground">{p.sub}</p>
              </CardHeader>
              <CardContent>
                <div className="mb-1">
                  <span className="text-4xl font-bold tracking-tight">{usd(price)}</span>
                  <span className="ml-1 text-sm text-muted-foreground">
                    /{cycle === "yearly" ? "yr" : "mo"}
                  </span>
                </div>
                {cycle === "yearly" && (
                  <div className="mb-2 text-xs text-sky-700 dark:text-sky-300">
                    Save {usd(yearlySavings(p))} vs monthly
                  </div>
                )}
                <div className="mb-4 text-xs text-muted-foreground">
                  {p.min.toLocaleString("en-US")} min · {usd(p.rate)}/min ·{" "}
                  {p.agents >= 999 ? "Unlimited" : `${p.agents} agents`}
                </div>
                <ul className="space-y-2 text-sm">
                  {p.perks
                    .filter((perk) => !/phone number|concurrent call/i.test(perk))
                    .map((perk) => (
                      <li key={perk} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" />
                        <span>{perk}</span>
                      </li>
                    ))}
                </ul>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Two-column section: form on the left, order summary on the right */}
      <form onSubmit={validateAndSubmit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* === LEFT: form fields ============================================= */}
        <Card>
          <CardHeader>
            <CardTitle>Create your account</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field id="name" label="Your name" value={form.name} onChange={updateInput("name")} />
            <Field id="company" label="Company" value={form.company} onChange={updateInput("company")} />
            <Field id="username" label="Username" value={form.username} onChange={updateInput("username")} />
            <Field id="email" label="Work email" type="email" value={form.email} onChange={updateInput("email")} />
            <Field id="phone" label="Phone (optional)" value={form.phone} onChange={updateInput("phone")} />
            <Field id="password" label="Password (8+ chars)" type="password" value={form.password} onChange={updateInput("password")} />

            <div className="md:col-span-2 rounded-md border border-dashed border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
              📞 Your phone number is included in the plan and assigned automatically at checkout —
              no separate fee.
            </div>

            <Field
              id="agentName"
              label="Agent name (optional)"
              value={form.agentName}
              onChange={updateInput("agentName")}
              placeholder={form.company ? `${form.company} Receptionist` : "Acme Receptionist"}
              wrapperClassName="md:col-span-2"
            />

            <div className="md:col-span-2">
              <Label htmlFor="greeting" className="mb-1.5 block">
                Greeting / description{" "}
                <span className="font-normal text-muted-foreground">
                  (optional — what your agent says + how it should behave)
                </span>
              </Label>
              <Textarea
                id="greeting"
                rows={5}
                value={form.greeting}
                onChange={updateTextarea("greeting")}
                placeholder={
                  form.company
                    ? `e.g. "Hi, thanks for calling ${form.company}. I can help you book an appointment, share pricing, or take a message. What can I do for you today?"`
                    : 'e.g. "Hi, thanks for calling. I can help you book an appointment, share pricing, or take a message. What can I do for you today?"'
                }
                className="min-h-[120px] resize-y"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Leave blank to use a friendly default. You can refine this from your dashboard later
                under <strong>Knowledge &amp; Agent</strong>.
              </p>
              <div className="h-6" />
            </div>
          </CardContent>
        </Card>

        {/* === RIGHT: order summary (sticky on desktop) ====================== */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="border-sky-200/60 dark:border-sky-800/40">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-300">
                <Sparkles className="h-3.5 w-3.5" />
                Order summary
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <Row label="Plan">
                <div className="text-right">
                  <div className="font-semibold">
                    {selectedPlan?.label} · {cycle === "yearly" ? "yearly" : "monthly"}
                  </div>
                  {selectedPlan && (
                    <div className="text-xs text-muted-foreground">
                      ≈ {selectedPlan.min.toLocaleString("en-US")} min ·{" "}
                      {selectedPlan.agents >= 999 ? "Unlimited" : `${selectedPlan.agents} agents`} ·{" "}
                      {usd(selectedPlan.rate)}/min
                    </div>
                  )}
                </div>
              </Row>

              <Row label="Phone number">
                <span className="text-xs font-medium text-muted-foreground">Assigned at checkout</span>
              </Row>

              <Separator />

              <Row label={`${selectedPlan?.label || "Plan"} credit`}>
                <span className="font-semibold">{usd(planPrice)}</span>
              </Row>

              <Row label="Voice rate">
                <span className="text-xs font-medium text-muted-foreground">
                  {selectedPlan ? `${usd(selectedPlan.rate)} / min` : "—"}
                </span>
              </Row>

              <Separator />

              <Row label="Billed today">
                <span className="text-lg font-bold">{usd(totalAmount)}</span>
              </Row>

              <Separator />

              {error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button type="submit" size="lg" disabled={submitting} className="w-full">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirecting to checkout…
                  </>
                ) : (
                  <>Continue to secure checkout →</>
                )}
              </Button>

              <p className="text-center text-xs leading-relaxed text-muted-foreground">
                Secure Stripe checkout · Cards · Apple Pay · Google Pay.{" "}
                {cycle === "monthly"
                  ? "Plan minutes reset every month."
                  : "Yearly plan minutes reset every month, billed once upfront."}
              </p>
            </CardContent>
          </Card>
        </div>
      </form>
    </>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  wrapperClassName,
}: {
  id: string
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string
  placeholder?: string
  wrapperClassName?: string
}) {
  return (
    <div className={wrapperClassName}>
      <Label htmlFor={id} className="mb-1.5 block">
        {label}
      </Label>
      <Input id={id} type={type} value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  )
}

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <div className="text-right">{children}</div>
    </div>
  )
}
