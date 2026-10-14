"use client";

import { useActionState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { OutreachSettings } from "@/domain/outreach/customization";
import { saveSettings, type SettingsSaveState } from "./settings-actions";

function Text({ name, label, help, value, rows = 4 }: { name: keyof OutreachSettings; label: string; help?: string; value: string; rows?: number }) {
  return <label className="settings-field">{label}{help && <small>{help}</small>}<textarea name={name} defaultValue={value} rows={rows} /></label>;
}
function Num({ name, label, help, value }: { name: keyof OutreachSettings; label: string; help: string; value: number }) {
  return <label className="settings-field">{label}<small>{help}</small><input name={name} type="number" defaultValue={value} min={1} step={1} required /></label>;
}
function Section({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return <section className="panel detail-section"><h2>{title}</h2><p className="muted">{intro}</p><div className="settings-grid">{children}</div></section>;
}

export function SettingsForm({ settings: s, updatedAt }: { settings: OutreachSettings; updatedAt: string | null }) {
  const router = useRouter();
  const [state, submit, pending] = useActionState(async (previous: SettingsSaveState, form: FormData) => {
    const result = await saveSettings(previous, form);
    if (result.saved) router.refresh();
    return result;
  }, {});

  return <form action={submit}>
    <input type="hidden" name="updated_at" value={updatedAt ?? ""} />

    <Section title="Mando context" intro="Facts the drafting model may use about Mando. It is told to say nothing about Mando beyond these facts and the angle for the trigger, so keep this accurate and factual.">
      <Text name="mando_facts" label="Mando facts" value={s.mando_facts} rows={14} help="One fact or short paragraph per line." />
      <Text name="hooks" label="Hooks" value={s.hooks} rows={5} help="Opening lines the model may adapt when they fit. One per line." />
    </Section>

    <Section title="Angles" intro="The pitch for each situation. The script picks one per company from its stored signals.">
      <Text name="angle_go_live" label="Recent go-live" value={s.angle_go_live} />
      <Text name="angle_job_posting" label="Hiring for Workday roles" value={s.angle_job_posting} />
      <Text name="angle_release" label="Preparing for a Workday release" value={s.angle_release} />
      <Text name="angle_general" label="No specific trigger" value={s.angle_general} />
    </Section>

    <Section title="Voice and the ask" intro="How messages sound, what they ask for, and what to avoid.">
      <Text name="voice" label="Voice and tone" value={s.voice} help="Plain sentences work best." />
      <Text name="ask" label="The ask" value={s.ask} />
      <Text name="avoid" label="Things to avoid" value={s.avoid} rows={5} help="One per line." />
      <Text name="example" label="Example email" value={s.example} rows={10} help="Optional but the biggest quality boost. Paste an email Adi has sent and liked. The model matches its style and length without copying it. Clear this box to turn it off." />
    </Section>

    <Section title="Sign-off and templates" intro="Used by the Write email and Write LinkedIn message buttons on a contact. Placeholders: {first_name}, {company}, {sign_off}.">
      <label className="settings-field">Sign-off<small>The name at the bottom of an email.</small><input name="sign_off" defaultValue={s.sign_off} required maxLength={200} /></label>
      <Text name="linkedin_template" label="LinkedIn starter" value={s.linkedin_template} rows={3} />
      <Text name="email_template" label="Email starter" value={s.email_template} rows={6} />
    </Section>

    <Section title="Limits" intro="LinkedIn messages are fixed at 300 characters, LinkedIn's own connection-note limit.">
      <Num name="email_max_words" label="Email length (words)" value={s.email_max_words} help="Longer generated drafts are rejected." />
      <Num name="subject_max_words" label="Subject length (words)" value={s.subject_max_words} help="Guidance to the model." />
      <Num name="go_live_window_days" label="Go-live window (days)" value={s.go_live_window_days} help="A go-live this recent counts as the go-live trigger." />
    </Section>

    <Section title="Mando research notes" intro="Reference for the team. These notes are not sent to the model; move anything you want used into Mando facts above.">
      <Text name="research_notes" label="Research notes" value={s.research_notes} rows={28} />
    </Section>

    <div className="settings-save">
      <button className="button" type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</button>
      {state.saved && <p role="status" className="success">Saved. New drafts and starters use these settings; existing drafts do not change.</p>}
      {state.error && <p role="alert" className="error">{state.error}</p>}
    </div>
  </form>;
}
