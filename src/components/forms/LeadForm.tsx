import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowUpRight,
  CheckCircle2,
  LoaderCircle,
  Phone,
  UserRound,
  MapPin,
  ClipboardList,
  LockKeyhole,
  ChevronDown,
} from "lucide-react";
import { leadSchema, submitLead, type Lead } from "../../lib/leads";
import { services, business } from "../../data/content";
import { track } from "../../lib/analytics";
export function LeadForm({ selected }: { selected: string }) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Lead>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      service: "",
      zip: "",
      message: "",
      website: "",
    },
  });
  const [status, setStatus] = useState("");
  const [success, setSuccess] = useState(false);
  const started = useRef(false);
  const key = useRef(crypto.randomUUID());
  useEffect(() => {
    if (selected) setValue("service", selected, { shouldValidate: true });
  }, [selected, setValue]);
  async function send(values: Lead) {
    setStatus("");
    track("lead_form_submit", "estimate");
    try {
      await submitLead({ ...values, email: "", message: "" }, key.current);
      setSuccess(true);
      track("lead_form_success", "estimate");
    } catch (e) {
      setStatus(
        e instanceof Error ? e.message : "Please call us to request help.",
      );
      track("lead_form_error", "estimate");
    }
  }
  if (success)
    return (
      <div className="form-success" role="status">
        <CheckCircle2 size={40} />
        <h3>Request received.</h3>
        <p>
          Thank you for contacting FWC. For urgent help, call {business.phone}.
        </p>
      </div>
    );
  return (
    <form
      onSubmit={handleSubmit(send)}
      onFocus={() => {
        if (!started.current) {
          track("lead_form_start", "estimate");
          started.current = true;
        }
      }}
      noValidate
    >
      <div className="form-heading">
        <div className="form-heading-top">
          <span className="form-kicker">LET’S TALK ABOUT YOUR PROPERTY</span>
          <span className="form-heading-icon">
            <ClipboardList size={22} aria-hidden="true" />
          </span>
        </div>
        <h3>Request a Free Estimate</h3>
        <p>Leave your details and we’ll get back to you quickly.</p>
      </div>
      {!import.meta.env.VITE_LEAD_ENDPOINT && (
        <p className="form-notice">
          Online requests are being set up. For now, call{" "}
          <a href={business.tel}>{business.phone}</a> for an estimate.
        </p>
      )}
      <fieldset className="form-group">
        <legend>
          <span>01</span> Your details
        </legend>
        <div className="form-grid">
          {(
            [
              {
                key: "name",
                label: "Full name",
                auto: "name",
                placeholder: "Your full name",
                type: "text",
              },
              {
                key: "phone",
                label: "Phone number",
                auto: "tel",
                placeholder: "(714) 555-0123",
                type: "tel",
              },
              {
                key: "zip",
                label: "ZIP code",
                auto: "postal-code",
                placeholder: "92870",
                type: "text",
              },
            ] as const
          ).map((f) => (
            <div
              className={`field ${f.key === "name" ? "field-full" : ""}`}
              key={f.key}
            >
              <label htmlFor={f.key}>{f.label}</label>
              <div className="input-shell">
                {f.key === "name" ? (
                  <UserRound size={17} aria-hidden="true" />
                ) : f.key === "phone" ? (
                  <Phone size={17} aria-hidden="true" />
                ) : (
                  <MapPin size={17} aria-hidden="true" />
                )}
                <input
                  id={f.key}
                  type={f.type}
                  required
                  autoComplete={f.auto}
                  inputMode={f.key === "zip" ? "numeric" : undefined}
                  placeholder={f.placeholder}
                  {...register(f.key)}
                  aria-invalid={!!errors[f.key]}
                  aria-describedby={
                    errors[f.key] ? `${f.key}-error` : undefined
                  }
                />
              </div>
              {errors[f.key] && (
                <span className="field-error" id={`${f.key}-error`}>
                  {errors[f.key]?.message}
                </span>
              )}
            </div>
          ))}
        </div>
      </fieldset>
      <fieldset className="form-group project-form-group">
        <legend>
          <span>02</span> Service required
        </legend>
        <div className="field">
          <label htmlFor="service">How can we help?</label>
          <div className="select-shell">
            <select
              id="service"
              required
              {...register("service")}
              aria-invalid={!!errors.service}
              aria-describedby={errors.service ? "service-error" : undefined}
            >
              <option value="">Select a service</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
              <option value="unsure">I’m not sure yet</option>
            </select>
            <ChevronDown size={17} aria-hidden="true" />
          </div>
          {errors.service && (
            <span className="field-error" id="service-error">
              {errors.service.message}
            </span>
          )}
        </div>
      </fieldset>
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          tabIndex={-1}
          autoComplete="off"
          {...register("website")}
        />
      </div>
      {status && (
        <p className="field-error" role="alert">
          {status}
        </p>
      )}
      <button
        className="button button-red form-submit"
        disabled={isSubmitting || !import.meta.env.VITE_LEAD_ENDPOINT}
      >
        {isSubmitting ? (
          <>
            <LoaderCircle className="spin" size={18} />
            Sending…
          </>
        ) : (
          <>
            Request my estimate <ArrowUpRight size={19} />
          </>
        )}
      </button>
      <p className="form-fine">
        <LockKeyhole size={13} aria-hidden="true" />
        <span>
          By submitting, you ask FWC to contact you about this request. See our{" "}
          <a href="#privacy">privacy information</a>.
        </span>
      </p>
      <a className="form-call" href={business.tel}>
        <span className="form-call-icon">
          <Phone size={18} aria-hidden="true" />
        </span>
        <span className="form-call-copy">
          <span>Prefer a conversation?</span>
          <strong>{business.phone}</strong>
        </span>
        <ArrowUpRight size={18} aria-hidden="true" />
      </a>
    </form>
  );
}
