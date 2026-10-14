import { formatEvidence } from './evidence.ts';

export const CONSULTANT_REACH_POLICY = 'consultant-public-route-v1';
export type ProfessionalRoute = {
  contact_name: string;
  linkedin_url: string;
  source: string;
  reason: string;
  role_source: string;
  current_relevant_role: boolean | null;
  demonstrated_system_action: boolean | null;
};

// Nevin authorized general public professional routes instead of team/Adi mutuals.
// The action criterion is a disclosed historical systems-initiative proxy, not Mando intent.
export function consultantReachability(route: ProfessionalRoute) {
  let url: URL;
  try { url = new URL(route?.linkedin_url); } catch { throw new Error('A public professional profile URL is required.'); }
  if (url.protocol !== 'https:' || !/(^|\.)linkedin\.com$/.test(url.hostname) || !url.pathname.startsWith('/in/')
    || !route.contact_name?.trim() || !formatEvidence(route.source, route.reason)
    || !formatEvidence(route.role_source, 'Role verification')
    || ![true, false, null].includes(route.current_relevant_role)
    || ![true, false, null].includes(route.demonstrated_system_action)) {
    throw new Error('A sourced professional route, identity, role and action state are required.');
  }
  const score = route.current_relevant_role === true
    ? route.demonstrated_system_action === true ? 25 : 15
    : route.current_relevant_role === false ? 0 : 10;
  const status = score === 25 ? 'met' : score === 0 ? 'not_met' : 'partial';
  return { score, status, source: route.source,
    reason: `Assessment status: ${status}. ${route.contact_name}: ${route.reason} Role source: ${route.role_source}. Direct public professional route: ${url.href}. User-authorized interpretation: one-step professional route in general, without a team/Adi mutual requirement. Historical systems action is a willingness proxy, not verified willingness to buy Mando; no email deliverability or response is claimed.` };
}
