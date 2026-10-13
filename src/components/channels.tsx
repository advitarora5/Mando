"use client";

import { Mail, Phone } from "lucide-react";
import { emailLabel, emailState, type ContactSummary } from "@/domain/contacts/contact-view";
import { safeUrl } from "@/domain/contracts/detail";
import { useCopy } from "./toast";

export function initials(name: string) {
  const words = name.replace(/,.*$/, "").replace(/^(dr|mr|mrs|ms)\.?\s+/i, "").split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words.length > 1 ? words.at(-1)![0] : "")).toUpperCase() || "?";
}

export function Avatar({ name, large }: { name: string; large?: boolean }) {
  return <span className={`avatar${large ? " lg" : ""}`} aria-hidden>{initials(name)}</span>;
}

type Dot = "verified" | "unverified" | "invalid" | "absent";
type Channel = { key: string; label: string; present: boolean; value: string | null; dot: Dot; tip: string; icon: React.ReactNode };

export function channelsFor(contact: ContactSummary & { phone_status?: string | null }): Channel[] {
  const profile = safeUrl(contact.linkedin_url);
  const email = emailState(contact);
  const emailDot: Dot = !contact.email ? "absent" : email === "verified" ? "verified" : email === "invalid" ? "invalid" : "unverified";
  const linkedinDot: Dot = !profile ? "absent" : contact.linkedin_status === "confirmed" || contact.linkedin_status === "provided" ? "verified" : "unverified";
  const phoneDot: Dot = !contact.phone ? "absent" : contact.phone_status === "live" ? "verified" : contact.phone_status === "dead" ? "invalid" : "unverified";
  return [
    { key: "linkedin", label: "LinkedIn", present: !!profile, value: profile, dot: linkedinDot, icon: <span className="mono" aria-hidden>in</span>,
      tip: profile ? `LinkedIn: ${linkedinDot === "verified" ? "profile on record" : "unconfirmed match"} — click to copy` : "No LinkedIn profile recorded" },
    { key: "email", label: "Email", present: !!contact.email, value: contact.email ?? null, dot: emailDot, icon: <Mail aria-hidden />,
      tip: contact.email ? `${contact.email} — ${emailLabel(contact)}. Click to copy` : emailLabel(contact) },
    { key: "phone", label: "Phone", present: !!contact.phone, value: contact.phone ?? null, dot: phoneDot, icon: <Phone aria-hidden />,
      tip: contact.phone ? `${contact.phone} — ${phoneDot === "verified" ? "live line" : phoneDot === "invalid" ? "line reported dead" : "line not verified"}. Click to copy` : "No phone recorded" },
  ];
}

export function ChannelIcons({ contact, tipPosition }: { contact: ContactSummary & { phone_status?: string | null }; tipPosition?: "bottom" | "left" }) {
  const copy = useCopy();
  return <span className="channels" onClick={event => event.stopPropagation()}>
    {channelsFor(contact).map(channel => <button key={channel.key} type="button" className="channel" data-state={channel.present ? "present" : "absent"}
      data-tip={channel.tip} data-tip-pos={tipPosition} aria-label={`${channel.label}: ${channel.tip}`} aria-disabled={!channel.present}
      onClick={() => channel.present && channel.value && copy(channel.value, channel.label)}>
      {channel.icon}<span className={`status ${channel.dot}`} aria-hidden />
    </button>)}
  </span>;
}
