// Contact title classification for pipeline Authority scoring. Reads the title text only; never infers.

// Functional relevance 0-10: how close the role is to owning Workday or HR systems.
const FUNCTION_RULES: [RegExp, number, string][] = [
  [/\bworkday\b|\bhris\b|\bhcm\b|hr (technology|tech|systems|information)|people (systems|technology|tech)|human resources information/i, 10, "HR systems / Workday"],
  [/enterprise (applications|apps|systems)|business (applications|systems)|erp\b/i, 9, "Enterprise applications"],
  [/hr operations|people operations|total rewards|payroll|talent systems/i, 7, "HR operations"],
  [/\bit\b.*(operations|ops)|it operations|infrastructure and operations|technology operations|information systems/i, 6, "IT operations"],
  [/\bchro\b|chief (people|human resources|hr)|human resources|\bhr\b|people\b|talent/i, 5, "HR leadership"],
  [/\bcio\b|chief (information|technology|digital)|information technology|\bit\b|technology/i, 5, "IT leadership"],
];

// Seniority 0-8 from the title's level words.
const SENIORITY_RULES: [RegExp, number, string][] = [
  [/\bchief\b|\bc[a-z]o\b|\bchro\b|\bcio\b|\bcto\b|\bpresident\b/i, 8, "C-level"],
  [/\b(evp|svp)\b|executive vice president|senior vice president/i, 7, "SVP/EVP"],
  [/\bvp\b|vice president|\bhead of\b|\bhead\b/i, 6, "VP/Head"],
  [/\bdirector\b/i, 5, "Director"],
  [/senior manager|sr\.? manager/i, 4, "Senior manager"],
  [/\bmanager\b|\blead\b|\bprincipal\b/i, 3, "Manager/Lead"],
  [/senior|sr\.?\b|specialist|engineer|architect|consultant/i, 2, "Senior IC"],
  [/analyst|associate|coordinator|administrator|partner/i, 1, "IC"],
];

export type TitleClass = { functional: number; functionLabel: string; seniority: number; seniorityLabel: string; ownsWorkday: number };

export function classifyTitle(title: string | null | undefined): TitleClass {
  // "Office of the CIO" names the org, not the person's level; "Executive Director" is a director.
  const text = (title ?? "").trim().replace(/\boffice of the \w+/gi, "").replace(/\bexecutive director\b/gi, "Director");
  const fn = FUNCTION_RULES.find(([re]) => re.test(text));
  const level = SENIORITY_RULES.find(([re]) => re.test(text));
  // Owns Workday 0-4: the title names Workday (4) or HRIS/HCM (2). Anything else needs a sourced statement.
  const ownsWorkday = /\bworkday\b/i.test(text) ? 4 : /\bhris\b|\bhcm\b/i.test(text) ? 2 : 0;
  return {
    functional: fn?.[1] ?? 0, functionLabel: fn?.[2] ?? "Unrelated or unknown function",
    seniority: level?.[1] ?? 0, seniorityLabel: level?.[2] ?? "Unknown level",
    ownsWorkday,
  };
}

// Titles the enrichment step searches for, in priority order.
export const TARGET_TITLES = ["VP HR", "HRIS lead", "VP Enterprise Applications", "IT operations manager", "Workday lead", "Director HRIS"];
