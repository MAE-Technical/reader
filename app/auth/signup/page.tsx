"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getNames } from "country-list";
import { BookOpen, Headphones, Users } from "lucide-react";
import Wordmark from "@/app/components/auth/Wordmark";
import SunriseMark from "@/app/components/auth/SunriseMark";
import AuthButton from "@/app/components/auth/AuthButton";
import BackArrow from "@/app/components/auth/BackArrow";
import TextField from "@/app/components/auth/TextField";
import PasswordField from "@/app/components/auth/PasswordField";
import SelectField from "@/app/components/auth/SelectField";
import NotePreviewCard from "@/app/components/auth/NotePreviewCard";

const INTRO_STEPS = ["intro-library", "intro-features"] as const;
const FORM_STEPS = ["form-account", "form-pseudonym", "form-location"] as const;

const FEATURES = [
  { icon: BookOpen, title: "The full library", desc: "Essential texts from Pan-African and revolutionary thinkers, curated with care." },
  { icon: Headphones, title: "Listen in the Voices of History", desc: "High-quality audio that honors the words and context." },
  { icon: Users, title: "Read Alongside Comrades", desc: "See notes, discussions, and voices from readers across the world." },
];

const COUNTRIES = [...getNames().sort((a, b) => a.localeCompare(b)), "Other"];

/** Continue's moderate desktop width (welcome screen's own button treatment) —
 * full-width stays on mobile, this just reins it in past the 860px split. */
const DESKTOP_AUTO_BUTTON = "shell:w-full shell:px-8";

function StepHeader({ formStepIndex, onBack }: { formStepIndex: number; onBack: () => void }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3">
        <BackArrow onClick={onBack} className="-ml-2" />
        <div className="hidden shell:block">
          <Wordmark />
        </div>
      </div>
      {formStepIndex >= 0 && (
        <div className="mt-6 text-xs font-bold tracking-[0.1em] text-brand-500">
          STEP {formStepIndex + 1} OF {FORM_STEPS.length}
        </div>
      )}
    </div>
  );
}

function FeatureList() {
  return (
    <div className="divide-y divide-[var(--reader-border)]">
      {FEATURES.map(({ icon: Icon, title, desc }) => (
        <div key={title} className="flex gap-4 py-4 first:pt-0">
          <Icon size={22} className="mt-0.5 flex-none text-brand-500" strokeWidth={1.5} />
          <div>
            <div className="font-serif text-base font-semibold text-[var(--reader-text)]">{title}</div>
            <div className="mt-1 text-[13px] leading-relaxed text-[var(--reader-text-muted)]">{desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pseudonym, setPseudonym] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");

  const steps = [...INTRO_STEPS, ...FORM_STEPS];
  const clampedStep = Math.min(step, steps.length - 1);
  const current = steps[clampedStep];
  const formStepIndex = FORM_STEPS.indexOf(current as (typeof FORM_STEPS)[number]);

  const goNext = () => {
    if (clampedStep === steps.length - 1) {
      router.push("/auth/survey");
    } else {
      setStep(clampedStep + 1);
    }
  };
  const goBack = () => {
    if (clampedStep === 0) {
      router.push("/");
    } else {
      setStep(clampedStep - 1);
    }
  };
  // Desktop combines both intro slides into one screen (see below), so its
  // Continue skips straight past the mobile-only second slide.
  const skipIntro = () => setStep(INTRO_STEPS.length);

  return (
    <div className="min-h-screen bg-[var(--reader-bg)] px-6 py-8 shell:px-16 shell:py-16 xl:px-24">
      <StepHeader formStepIndex={formStepIndex} onBack={goBack} />
      <div className="mx-auto w-full max-w-3xl">
        {(current === "intro-library" || current === "intro-features") && (
          <>
            <div className="flex flex-col shell:hidden">
              {current === "intro-library" ? (
                <>
                  <h1 className="font-serif text-3xl leading-tight font-semibold text-[var(--reader-text)]">
                    A library.
                    <br />
                    A space.
                    <br />
                    A movement.
                  </h1>
                  <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-[var(--reader-text-muted)]">
                    <p>Ominira is a curated library of Pan-African and revolutionary political thought.</p>
                    <p>We make these ideas accessible, alive, and in conversation.</p>
                    <p>Together, we raise political consciousness and organize our future.</p>
                  </div>
                  <SunriseMark theme="light" book className="mt-6 w-full" />
                </>
              ) : (
                <>
                  <h1 className="font-serif text-3xl leading-tight font-semibold text-[var(--reader-text)]">
                    What you get with Ominira
                  </h1>
                  <div className="mt-6">
                    <FeatureList />
                  </div>
                </>
              )}
              <AuthButton className="mt-6" onClick={goNext}>
                Continue
              </AuthButton>
            </div>

            <div className="hidden shell:grid shell:grid-cols-2 shell:items-start shell:gap-16">
              <div>
                <h1 className="font-serif text-3xl leading-tight font-semibold text-[var(--reader-text)]">
                  A library.
                  <br />
                  A space.
                  <br />
                  A movement.
                </h1>
                <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-[var(--reader-text-muted)]">
                  <p>Ominira is a curated library of Pan-African and revolutionary political thought.</p>
                  <p>We make these ideas accessible, alive, and in conversation.</p>
                  <p>Together, we raise political consciousness and organize our future.</p>
                </div>
              </div>
              <div>
                <h2 className="font-serif text-2xl leading-tight font-semibold text-[var(--reader-text)]">
                  What you get with Ominira
                </h2>
                <div className="mt-6">
                  <FeatureList />
                </div>
              </div>
            </div>
            <AuthButton className={`mt-8 hidden shell:block ${DESKTOP_AUTO_BUTTON}`} onClick={skipIntro}>
              Continue
            </AuthButton>
          </>
        )}

        {current === "form-account" && (
          <div className="grid gap-8 shell:grid-cols-[minmax(0,1fr)_360px] shell:items-start">
            <div>
              <h1 className="font-serif text-3xl leading-tight font-semibold text-[var(--reader-text)]">
                Let&rsquo;s get
                <br />
                you started.
              </h1>
              <p className="mt-3 font-literata text-[14px] font-medium text-[var(--reader-text-muted)]">
                Enter your details below to create your account.
              </p>
            </div>
            <div className="space-y-5">
              <form
                className="space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  goNext();
                }}
              >
                <TextField
                  label="Full name"
                  placeholder="e.g. Ama Mensah"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <TextField
                  label="Email"
                  type="email"
                  placeholder="e.g. ama@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <PasswordField
                  label="Password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <AuthButton type="submit" className={DESKTOP_AUTO_BUTTON}>
                  Continue
                </AuthButton>
              </form>
              <p className="hidden text-[14px] text-[var(--reader-text-muted)] shell:block">
                Already have an account?{" "}
                <Link href="/auth/login" className="font-bold text-brand-500 no-underline">
                  Log in
                </Link>
              </p>
            </div>
          </div>
        )}

        {current === "form-pseudonym" && (
          <div className="grid gap-8 shell:grid-cols-[minmax(0,1fr)_360px] shell:items-start">
            <h1 className="font-serif text-3xl leading-tight font-semibold text-[var(--reader-text)]">
              Choose the name your comrades will know you by — this is what others see, never your full name.
            </h1>
            <div className="space-y-5">
              <TextField
                label="Pseudonym"
                placeholder="e.g. Kofi Writes"
                maxLength={20}
                hint={`${pseudonym.length}/20`}
                value={pseudonym}
                onChange={(e) => setPseudonym(e.target.value)}
              />
              <NotePreviewCard pseudonym={pseudonym} />
              <AuthButton className={DESKTOP_AUTO_BUTTON} onClick={goNext}>
                Continue
              </AuthButton>
            </div>
          </div>
        )}

        {current === "form-location" && (
          <div className="grid gap-8 shell:grid-cols-[minmax(0,1fr)_360px] shell:items-start">
            <div>
              <h1 className="font-serif text-3xl leading-tight font-semibold text-[var(--reader-text)]">
                Where are you reading from?
              </h1>
              <div className="mt-6 flex gap-3">
                <p className="font-literata text-[14px] font-medium leading-relaxed text-[var(--reader-text-muted)]">
                  We don&rsquo;t track your location. We only ask for your city and country so that we can show comrades that they&rsquo;re studying with other Africans from across the globe.
                </p>
              </div>
            </div>
            <div className="space-y-5">
              <TextField label="City" placeholder="e.g. Accra" value={city} onChange={(e) => setCity(e.target.value)} />
              <SelectField
                label="Country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option value="">Select your country</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </SelectField>
              <AuthButton className={DESKTOP_AUTO_BUTTON} onClick={goNext}>
                Create my account
              </AuthButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
