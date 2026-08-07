"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Wordmark from "./Wordmark";
import AuthButton from "./AuthButton";
import BackArrow from "./BackArrow";
import PillGroup from "@/app/components/PillGroup";
import type { MaterialSummary } from "@/lib/api/types";
import { useSurveySubmit } from "@/lib/auth/useSurveySubmit";
import { onboardingRoute } from "@/lib/auth/onboardingRoute";

const TOTAL_STEPS = 2;

const INTERESTS = [
  { value: "pan-africanism", label: "Pan-Africanism" },
  { value: "marxism", label: "Marxism" },
  { value: "feminism", label: "Feminism" },
  { value: "decolonial-theory", label: "Decolonial Theory" },
  { value: "black-liberation", label: "Black Liberation" },
  { value: "political-economy", label: "Political Economy" },
  { value: "african-history", label: "African History" },
  { value: "psychology", label: "Psychology" },
  { value: "literature-culture", label: "Literature & Culture" },
  { value: "philosophy", label: "Philosophy" },
  { value: "science-technology", label: "Science & Technology" },
  { value: "education", label: "Education" },
  { value: "environment-climate", label: "Environment & Climate" },
  { value: "spirituality", label: "Spirituality" },
];

export default function SurveyWizard({ materials }: { materials: MaterialSummary[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [readMaterialIds, setReadMaterialIds] = useState<Set<string>>(new Set());
  const [interests, setInterests] = useState<Set<string>>(new Set());
  const survey = useSurveySubmit();

  const toggleRead = (materialId: string) =>
    setReadMaterialIds((prev) => {
      const next = new Set(prev);
      if (next.has(materialId)) next.delete(materialId);
      else next.add(materialId);
      return next;
    });
  const toggleInterest = (value: string) =>
    setInterests((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });

  const goNext = () => {
    if (step === 1) {
      survey.mutate(
        { interests: Array.from(interests), readMaterialIds: Array.from(readMaterialIds) },
        { onSuccess: ({ reader }) => router.push(onboardingRoute(reader)) }
      );
    } else {
      setStep(1);
    }
  };
  const goBack = () => {
    if (step === 0) {
      router.back();
    } else {
      setStep(0);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--reader-bg)] px-6 py-8 shell:px-16 shell:py-16 xl:px-24">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <BackArrow onClick={goBack} className="-ml-2" />
          <div className="hidden shell:block">
            <Wordmark />
          </div>
        </div>
        <div className="mt-6 text-xs font-bold tracking-[0.1em] text-brand-500">
          STEP {step + 1} OF {TOTAL_STEPS}
        </div>
      </div>

      <div className="mx-auto w-full max-w-sm shell:max-w-2xl">
        {step === 0 ? (
          <div>
            <h1 className="font-serif text-3xl leading-tight font-semibold text-[var(--reader-text)]">
              Have you read any of these books?
            </h1>
            <p className="mt-3 font-literata text-[14px] text-[var(--reader-text-muted)]">
              You can choose as many as you&rsquo;ve read or none if you haven&rsquo;t read any.
            </p>

            <div className="om-scroll mt-6 max-h-[50vh] overflow-y-auto pr-1">
              <div className="flex flex-col gap-3">
                {materials.map((material) => {
                  const checked = readMaterialIds.has(material.id);
                  return (
                    <label
                      key={material.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-sm border p-3 transition-colors ${
                        checked ? "border-brand-400 bg-brand-50/40" : "border-sand-300"
                      }`}
                    >
                      <img src={material.cover ?? ""} alt="" className="h-14 w-10 flex-none rounded-sm object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-serif text-[15px] font-semibold text-[var(--reader-text)]">
                          {material.title}
                        </div>
                        <div className="truncate text-xs text-[var(--reader-text-muted)]">{material.author}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRead(material.id)}
                        className="h-5 w-5 flex-none accent-brand-500"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="mt-8 flex justify-center">
              <AuthButton className="shell:w-60 shell:px-10" onClick={goNext}>
                Continue
              </AuthButton>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="font-serif text-3xl leading-tight font-semibold text-[var(--reader-text)]">
              What are you interested in reading?
            </h1>
            <p className="mt-3 font-literata text-[14px] text-[var(--reader-text-muted)]">
              Select the categories you&rsquo;re most interested in.
            </p>

            <div className="mt-6">
              <PillGroup options={INTERESTS} selected={Array.from(interests)} onSelect={toggleInterest} />
            </div>

            {survey.error && (
              <p className="mt-4 text-center text-[13px] font-medium text-red-500">{survey.error.message}</p>
            )}

            <div className="mt-6 flex justify-center">
              <AuthButton className="shell:w-60 shell:px-10" onClick={goNext} disabled={survey.isPending}>
                {survey.isPending ? "Saving…" : "Continue"}
              </AuthButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
