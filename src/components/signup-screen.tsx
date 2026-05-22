"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ApiError, fetchPublicPlans } from "@/lib/solva-api";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

const MODULE_OPTIONS = [
  "people",
  "payroll",
  "leave",
  "ess",
  "reports",
  "administration",
  "recruitment",
  "performance",
  "training",
  "assets",
  "integrations",
] as const;

async function withAuthTimeout<T>(promise: Promise<T>, actionLabel: string) {
  return await Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      window.setTimeout(() => {
        reject(new Error(`${actionLabel} timed out. Please try again.`));
      }, 15000);
    }),
  ]);
}

function parseSignupError(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "We could not create your account right now.";
}

export function SignupScreen() {
  const searchParams = useSearchParams();
  const [organizationName, setOrganizationName] = useState("");
  const [employerIdentifier, setEmployerIdentifier] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [adminFullName, setAdminFullName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [country, setCountry] = useState("Kenya");
  const [timezone, setTimezone] = useState("Africa/Nairobi");
  const [payrollCurrency, setPayrollCurrency] = useState("KES");
  const [planId, setPlanId] = useState(searchParams.get("plan") ?? "growth");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [estimatedEmployeeCount, setEstimatedEmployeeCount] = useState("50");
  const [trialDays, setTrialDays] = useState("14");
  const [plans, setPlans] = useState<Array<Record<string, unknown>>>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedModules, setSelectedModules] = useState<string[]>(["people", "payroll", "leave", "ess", "reports", "administration"]);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const activePlan = useMemo(
    () => plans.find((entry) => String(entry.id ?? "") === planId) ?? plans[0] ?? null,
    [planId, plans]
  );

  useEffect(() => {
    let mounted = true;

    async function loadPlans() {
      try {
        const payload = await fetchPublicPlans();
        if (!mounted) {
          return;
        }

        setPlans(payload.plans);
        const defaultPlan = payload.plans.find((entry) => String(entry.id ?? "") === (searchParams.get("plan") ?? "growth")) ?? payload.plans[0] ?? null;
        if (defaultPlan) {
          setPlanId(String(defaultPlan.id ?? "growth"));
          const planModules = Array.isArray(defaultPlan.modules)
            ? defaultPlan.modules.filter((item): item is string => typeof item === "string")
            : [];
          setSelectedModules(planModules.length ? planModules : ["people", "payroll", "ess", "reports"]);
          setTrialDays(String(defaultPlan.trialDays ?? 14));
        }
      } catch (error) {
        if (mounted) {
          setMessage(parseSignupError(error));
        }
      } finally {
        if (mounted) {
          setPlansLoading(false);
        }
      }
    }

    void loadPlans();

    return () => {
      mounted = false;
    };
  }, [searchParams]);

  function toggleModule(moduleKey: string) {
    setSelectedModules((current) =>
      current.includes(moduleKey) ? current.filter((item) => item !== moduleKey) : [...current, moduleKey]
    );
  }

  function handlePlanChange(nextPlanId: string) {
    setPlanId(nextPlanId);
    const nextPlan = plans.find((entry) => String(entry.id ?? "") === nextPlanId) ?? null;
    if (!nextPlan) {
      return;
    }

    const planModules = Array.isArray(nextPlan.modules)
      ? nextPlan.modules.filter((item): item is string => typeof item === "string")
      : [];
    setSelectedModules(planModules.length ? planModules : selectedModules);
    setTrialDays(String(nextPlan.trialDays ?? 14));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.set("organizationName", organizationName);
      formData.set("employerIdentifier", employerIdentifier);
      formData.set("companyEmail", companyEmail);
      formData.set("phone", phone);
      formData.set("address", address);
      formData.set("country", country);
      formData.set("timezone", timezone);
      formData.set("payrollCurrency", payrollCurrency);
      formData.set("planId", planId);
      formData.set("billingCycle", billingCycle);
      formData.set("estimatedEmployeeCount", estimatedEmployeeCount);
      formData.set("trialDays", trialDays);
      formData.set("selectedModules", JSON.stringify(selectedModules));
      formData.set("adminFullName", adminFullName);
      formData.set("adminEmail", adminEmail);
      formData.set("adminPassword", adminPassword);
      if (logoFile) {
        formData.set("logo", logoFile);
      }

      const response = await fetch("/api/auth/employer-signup", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new ApiError(response.status, payload.error ?? "signup_failed");
      }

      const supabase = getSupabaseBrowserClient();
      const signInResult = await withAuthTimeout(
        supabase.auth.signInWithPassword({
          email: adminEmail,
          password: adminPassword,
        }),
        "Organization sign in"
      );

      if (signInResult.error) {
        throw signInResult.error;
      }

      setMessage("Your organization has been submitted for review. You can sign in, but the workspace will stay in pending approval until a Super Admin activates it.");
      window.location.assign("/pending-approval");
    } catch (error) {
      setMessage(parseSignupError(error));
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-card">
      <div className="auth-card-header">
        <p className="section-eyebrow">Employer onboarding</p>
        <h2>Create your organization workspace</h2>
        <p className="section-description">
          Choose a plan, set up your branded Solva HR organization, create the first admin, and land in your private tenant with a guided launch checklist.
        </p>
      </div>
      <form className="action-form" onSubmit={handleSubmit}>
        <section className="form-section-card">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">Plan</p>
              <h3>Pick your starting plan</h3>
            </div>
          </div>
          {plansLoading ? (
            <p className="section-description">Loading plans...</p>
          ) : (
            <div className="selection-card-grid">
              {plans.map((plan) => {
                const isActive = String(plan.id ?? "") === planId;
                const features = Array.isArray(plan.features) ? plan.features.slice(0, 4) : [];
                return (
                  <button
                    className={`selection-card ${isActive ? "is-active" : ""}`}
                    key={String(plan.id ?? "")}
                    onClick={() => handlePlanChange(String(plan.id ?? ""))}
                    type="button"
                  >
                    <strong>{String(plan.name ?? "")}</strong>
                    <span>{String(plan.monthlyPriceLabel ?? "Custom")}</span>
                    <small>{String(plan.description ?? "")}</small>
                    <small>{String(plan.trialDays ?? 14)} day trial</small>
                    <ul>
                      {features.map((feature) => (
                        <li key={String(feature)}>{String(feature)}</li>
                      ))}
                    </ul>
                  </button>
                );
              })}
            </div>
          )}
          <div className="form-grid-two">
            <label>
              <span>Billing cycle</span>
              <select onChange={(event) => setBillingCycle(event.target.value === "annual" ? "annual" : "monthly")} value={billingCycle}>
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
              </select>
            </label>
            <label>
              <span>Estimated employees</span>
              <input min={1} onChange={(event) => setEstimatedEmployeeCount(event.target.value)} type="number" value={estimatedEmployeeCount} />
            </label>
          </div>
          <label>
            <span>Modules needed at launch</span>
            <small className="field-helper-text">Pick the modules you want active from day one. Your plan still controls what is available.</small>
            <div className="selection-pill-grid">
              {MODULE_OPTIONS.map((moduleKey) => (
                <button
                  className={`selection-pill ${selectedModules.includes(moduleKey) ? "is-active" : ""}`}
                  key={moduleKey}
                  onClick={() => toggleModule(moduleKey)}
                  type="button"
                >
                  {moduleKey}
                </button>
              ))}
            </div>
          </label>
          {activePlan ? (
            <div className="task-banner">
              {String(activePlan.name ?? "Plan")} trial for {trialDays} days. {String(activePlan.employeeLimit ?? "Unlimited")} employee guidance and{" "}
              {activePlan.adminLimit == null ? "unlimited" : String(activePlan.adminLimit)} admin seats on this plan.
            </div>
          ) : null}
        </section>
        <section className="form-section-card">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">Organization</p>
              <h3>Set up your workspace identity</h3>
            </div>
          </div>
        <label>
          <span>Organization name</span>
          <input
            onChange={(event) => setOrganizationName(event.target.value)}
            placeholder="Northwind Logistics Ltd"
            required
            type="text"
            value={organizationName}
          />
        </label>
        <label>
          <span>Employer identifier</span>
          <input
            onChange={(event) => setEmployerIdentifier(event.target.value.toUpperCase())}
            placeholder="NWL"
            type="text"
            value={employerIdentifier}
          />
        </label>
        <label>
          <span>Company email</span>
          <input
            autoComplete="email"
            onChange={(event) => setCompanyEmail(event.target.value)}
            placeholder="hr@northwind.co.ke"
            required
            type="email"
            value={companyEmail}
          />
        </label>
        <label>
          <span>Phone</span>
          <input
            autoComplete="tel"
            onChange={(event) => setPhone(event.target.value)}
            placeholder="+254 700 000000"
            type="tel"
            value={phone}
          />
        </label>
        <label>
          <span>Address</span>
          <input
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Upper Hill, Nairobi"
            type="text"
            value={address}
          />
        </label>
        <label>
          <span>Country</span>
          <input onChange={(event) => setCountry(event.target.value)} type="text" value={country} />
        </label>
        <label>
          <span>Timezone</span>
          <input onChange={(event) => setTimezone(event.target.value)} type="text" value={timezone} />
        </label>
        <label>
          <span>Payroll currency</span>
          <input onChange={(event) => setPayrollCurrency(event.target.value.toUpperCase())} type="text" value={payrollCurrency} />
        </label>
        <label>
          <span>Organization logo</span>
          <input accept="image/png,image/jpeg" onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)} type="file" />
        </label>
        </section>
        <section className="form-section-card">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">Admin</p>
              <h3>Create the first admin</h3>
            </div>
          </div>
        <label>
          <span>Admin full name</span>
          <input
            autoComplete="name"
            onChange={(event) => setAdminFullName(event.target.value)}
            placeholder="Jane Njeri"
            required
            type="text"
            value={adminFullName}
          />
        </label>
        <label>
          <span>Admin email</span>
          <input
            autoComplete="email"
            onChange={(event) => setAdminEmail(event.target.value)}
            placeholder="jane@northwind.co.ke"
            required
            type="email"
            value={adminEmail}
          />
        </label>
        <label>
          <span>Admin password</span>
          <input
            autoComplete="new-password"
            minLength={8}
            onChange={(event) => setAdminPassword(event.target.value)}
            placeholder="At least 8 characters"
            required
            type="password"
            value={adminPassword}
          />
        </label>
        </section>
        <button className="primary-button" disabled={submitting} type="submit">
          {submitting ? "Creating workspace..." : "Start free trial"}
        </button>
      </form>
      <div className="auth-links">
        <Link href="/login">Already have an account? Sign in</Link>
      </div>
      {message ? <div className="task-banner">{message}</div> : null}
    </section>
  );
}
