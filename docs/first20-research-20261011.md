# First 20 company research — October 11, 2026

The first 20 companies in the Supabase companies table, ordered by ID, were researched and updated in project `fkhychihxpregusklggo`. This is the frozen table selection, not the top 20 dashboard ranks. No companies outside this selection were enriched in this batch.

## Saved coverage

- 20 companies have domain, industry, headquarters, a sourced workforce count, five category evidence fields, buyer persona/level and why-now research. Counts from older case studies remain explicitly dated/approximate in the research notes.
- 28 contacts across all 20 companies: 26 new contacts and 2 preserved existing contacts. Each has a role source; 18 have matching public LinkedIn links. Broader executive equivalents retain their actual titles.
- 4 employer-published work emails and 3 office phone numbers. `email_verified` remains false because publication is not mailbox deliverability verification. Memorial Health’s route is from a September 2023 employer directory and needs reconfirmation.
- 18 customer-story module lists, 1 partial Recruiting confirmation from Memorial Health’s public Workday portal, and 1 unknown product scope at Fresh Del Monte. No new database columns were added; module research is in Authority evidence, why-now notes and the JSON record.
- 2 exact historical HR go-live dates saved: Iowa State July 1, 2019 and RMIT June 7, 2021. Announcement dates, month-only dates and planned dates were kept in evidence rather than converted into exact go-live dates.
- All 20 generated insight timestamps are present. Original assessments, existing contacts and manual insight overrides were preserved. Existing weekly snapshots were not rewritten.

## Scoring and remaining work

The GitHub rubric defines maxima 25/25/20/15/15, thresholds 80/55, exact go-live bands and release bands. Authority, Reachability and Budget are assessment inputs, with no evidence-to-points bands in the code. Their existing numeric values were retained and explicitly marked for scoring-owner review. The two original spreadsheet assessments remain unreviewed; their retained points are not endorsed by this research.

Each of the 20 companies received a new evidence-bearing assessment. Timing is 0 because the only exact go-lives are older than 365 days and other exact dates are unavailable. The repository calendar estimates March 13, 2027 for 2027R1; 153 days out on the research date earns 5 release points. Fresh Del Monte received no release points because the announcement does not disclose its product scope. The shared release score is not a company-specific buying trigger.

These records are enriched, not fully qualified. All 20 still need scoring-owner review of the first three categories, warm-channel/conviction evidence and purchase timing. Eighteen lack exact go-live dates; 24 of 28 contacts lack sourced direct email and 25 lack sourced direct office phone. Mutual connections were not visible and remain unknown. A missing fact means not available in reviewed public evidence, not proof that it does not exist.

The production dashboard still displays Disqualified. The earlier wording PR #13 was closed without merge; the team’s [PR #14](https://github.com/advitarora5/Mando-CUBE/pull/14) proposes Needs evidence. This research batch does not reopen or duplicate that UI PR.

## Companies and contacts

| Company | Employees / snapshot | Contacts | Exact HR go-live | Module coverage |
|---|---:|---|---|---|
| Mondelēz International | 90,000 | Stephanie Lilak | Not available | Confirmed in customer story |
| St John of God Health Care | 17,000 | Carla Bonev, Sidone Thomas | Not available | Confirmed in customer story |
| First National Bank of Omaha | 4,000 | Matt Spyers | Not available | Confirmed in customer story |
| Banner Health | 55,000 | Julie Ann Alvarado-Dubek | Not available | Confirmed in customer story |
| Iowa State University | 6,000 | Kristi Darr, Kristen Constant | 2019-07-01 | Confirmed in customer story |
| Bronson Healthcare | 8,500 | Cheryl Johnson | Not available | Confirmed in customer story |
| Thermo Fisher Scientific | 120,000 | Lisa P. Britt, Ryan Snyder | Not available | Confirmed in customer story |
| Tokyo Electron | 20,812 | Tatsuya Aso, Takashi Mineshima | Not available | Confirmed in customer story |
| RMIT University | 12,000 | Gaynor Witts | 2021-06-07 | Confirmed in customer story |
| Jardine Matheson | 400,000 | Raymond Co | Not available | Confirmed in customer story |
| English Schools Foundation | 3,000 | Kunal Mulchandani | Not available | Confirmed in customer story |
| Sun Life | 68,000 | Helena Pagano | Not available | Confirmed in customer story |
| Signify | 25,866 | Kiran Brar | Not available | Confirmed in customer story |
| Roswell Park Comprehensive Cancer Center | 3,900 | Errol A. Douglas | Not available | Confirmed in customer story |
| Del Monte Fresh Produce Company | 8,562 | Louie Tenazas, Murtaza Habib | Not available | Scope not disclosed |
| Scandic | 18,000 | Elin Ekrol | Not available | Confirmed in customer story |
| St. Luke's University Health Network | 18,000 | Evan Ochs | Not available | Confirmed in customer story |
| Memorial Health | 6,700 | Elisabeth Klar, Suresh Krishnan, Jeff Sass | Not available | Partial (Recruiting portal) |
| Topcon | 4,909 | Reiko Watanabe, Yoshikuni Ito | Not available | Confirmed in customer story |
| Hilti Aktiengesellschaft | 34,000 | Natasha Singh | Not available | Confirmed in customer story |

## Sources and field-level notes

The complete source-linked record is in [`src/data/research/first20-enrichment-20261011.json`](../src/data/research/first20-enrichment-20261011.json). It includes workforce scope, modules, category evidence, contact source/profile links, email/phone provenance, dated budget proxies, event status and remaining gaps.

### Mondelēz International

[Company / Workday source](https://www.workday.com/en-us/customer-stories/i-p/mondelez-faster-integrations-make-tasty-profits.html). Primary Workday customer story confirms use.
[Workforce source](https://www.mondelezinternational.com/about-us/leadership/executive-team/stephanie-lilak/). More than 90,000 global colleagues; lower bound from current leadership biography.

Documented use of Tricentis testing and a Workday estate with more than 90 integrations make integration quality relevant. A new Workday project or purchase window has not been confirmed.

- **Stephanie Lilak — Executive Vice President and Chief People Officer**. [Role source](https://www.mondelezinternational.com/about-us/leadership/executive-team/stephanie-lilak/); [public LinkedIn profile](https://www.linkedin.com/in/stephanielilak). Employer/role checked; purchase authority and warm introduction not established.

https://www.sap.com/assetdetail/2025/05/bc422555-077f-0010-bca6-c68f7e60039b.html | SAP customer session documents use of Tricentis testing across SAP and non-SAP environments; adjacent testing investment proxy, not a current purchasing timeline. Existing numeric score retained pending scoring-owner assessment; zero does not mean evidence disproves fit.

https://www.workday.com/en-us/customer-stories/i-p/mondelez-faster-integrations-make-tasty-profits.html | Workday use confirmed by customer story, but an exact go-live date or dated new trigger was not verified; no date inferred.

### St John of God Health Care

[Company / Workday source](https://www.workday.com/en-us/customer-stories/q-z/st-john-of-god-health-care-honors-its-evp.html). Primary Workday customer story confirms use.
[Workforce source](https://www.workday.com/en-us/customer-stories/q-z/st-john-of-god-health-care-honors-its-evp.html). Dated Workday customer-story workforce snapshot; current exact headcount not verified.

Workday automates high-volume caregiver HR processes, and the documented 2025 MyPolicy Library/Lippincott integration adds a connected clinical training workflow. No exact Workday go-live or new purchasing deadline was verified.

- **Carla Bonev — Chief People Officer**. [Role source](https://www.sjog.org.au/about-us/leadership/executives); [public LinkedIn profile](https://www.linkedin.com/in/carla-salvador-bonev-b4537216). Employer/role checked; purchase authority and warm introduction not established.
- **Sidone Thomas — Chief Technology Officer and Corporate Services Officer**. [Role source](https://www.sjog.org.au/about-us/leadership/executives). Employer/role checked; purchase authority and warm introduction not established.

https://www.rldatix.com/en-apac/resources/single-source-of-truth-integrated-the-mypolicy-library-lippincott-project/ | Vendor reports MyPolicy Library/Lippincott integration live in October 2025 and aligned with Workday competency assessments; adjacent tool adoption proxy, with no current purchase deadline. Existing numeric score retained pending scoring-owner assessment; zero does not mean evidence disproves fit.

https://www.workday.com/en-us/customer-stories/q-z/st-john-of-god-health-care-honors-its-evp.html | Workday use confirmed by customer story, but an exact go-live date or dated new trigger was not verified; no date inferred.

### First National Bank of Omaha

[Company / Workday source](https://www.workday.com/en-us/customer-stories/a-h/fnbo-increases-efficiency-improves-employee-experience.html). Primary Workday customer story confirms use.
[Workforce source](https://www.workday.com/en-us/customer-stories/a-h/fnbo-increases-efficiency-improves-employee-experience.html). Dated Workday customer-story workforce snapshot; current exact headcount not verified.

Workday consolidated six legacy HR systems and supports learning, payroll and workforce planning. This establishes operational fit; a recent implementation or purchase window was not found.

- **Matt Spyers — Executive Vice President and Chief Information Officer**. [Role source](https://www.card.fnbo.com/landing/the-experience); [public LinkedIn profile](https://www.linkedin.com/in/mattspyers). Employer/role checked; purchase authority and warm introduction not established.

https://www.workday.com/en-us/customer-stories/a-h/fnbo-increases-efficiency-improves-employee-experience.html | No verified adjacent testing/automation purchase or current purchase timeline found in reviewed sources; budget remains unconfirmed. Existing numeric score retained pending scoring-owner assessment; zero does not mean evidence disproves fit.

https://www.workday.com/en-us/customer-stories/a-h/fnbo-increases-efficiency-improves-employee-experience.html | Workday use confirmed by customer story, but an exact go-live date or dated new trigger was not verified; no date inferred.

### Banner Health

[Company / Workday source](https://www.workday.com/en-us/customer-stories/a-h/banner-health-efficient-workforce-with-workday-vndly.html). Primary Workday customer story confirms use.
[Workforce source](https://www.bannerhealth.com/about/leadership/executive/julie-ann-alvarado-dubek). 55,000+ team members; lower bound in current executive biography.

Banner already uses HCM and VNDLY. A public supply-chain leader describes a planned January 2027 Workday ERP go-live, which could create implementation testing needs; the exact date and scope require confirmation.

- **Julie Ann Alvarado-Dubek — Executive Vice President, Chief Administrative and People Officer**. [Role source](https://www.bannerhealth.com/about/leadership/executive/julie-ann-alvarado-dubek); [public LinkedIn profile](https://www.linkedin.com/in/julie-ann-alvarado-dubek). Employer/role checked; purchase authority and warm introduction not established.

https://www.workday.com/en-us/customer-stories/a-h/banner-health-efficient-workforce-with-workday-vndly.html | Workday documents adoption of VNDLY for external contract labor; adjacent workforce tool adoption proxy, not evidence of a new budget. Existing numeric score retained pending scoring-owner assessment; zero does not mean evidence disproves fit.

https://blog.workday.com/en-us/2023/celebrating-healthcare-innovation-award-winners.html | HCM went live in August 2020; month only. Public employee post describes a separate planned January 2027 ERP go-live; no exact date or HCM scope verified.

### Iowa State University

[Company / Workday source](https://www.workday.com/en-us/customer-stories/i-p/iowa-state-university-graduate-green-screens-cloud.html). Primary Workday customer story confirms use.
[Workforce source](https://www.workday.com/en-us/customer-stories/i-p/iowa-state-university-graduate-green-screens-cloud.html). Dated Workday customer-story workforce snapshot; current exact headcount not verified.

Iowa State has documented Kainos testing for Workday changes, and its HR vice president publicly reports plans to attend Rising. Its HCM/Finance/Payroll go-live was July 1, 2019, so this is an existing customer with testing needs, not a recent go-live.

- **Kristi Darr — Vice President, University Human Resources**. [Role source](https://www.provost.iastate.edu/about/administrative-officers); [public LinkedIn profile](https://www.linkedin.com/in/kristi-darr-b7578012). Work email: kdarr@iastate.edu ([source](https://www.provost.iastate.edu/about/administrative-officers)); deliverability unverified. Office phone: +1 515-294-6458 ([source](https://www.provost.iastate.edu/about/administrative-officers)). Employer/role checked; purchase authority and warm introduction not established.
- **Kristen Constant — Vice President, Information Technology Services and Chief Information Officer**. [Role source](https://www.provost.iastate.edu/about/administrative-officers); [public LinkedIn profile](https://www.linkedin.com/in/kristen-constant-83b06919). Work email: constant@iastate.edu ([source](https://www.provost.iastate.edu/about/administrative-officers)); deliverability unverified. Office phone: +1 515-294-3337 ([source](https://www.provost.iastate.edu/about/administrative-officers)). Employer/role checked; purchase authority and warm introduction not established.

https://internalaudit.iastate.edu/files/documents/0923%20AC%20VIII.E.%20Internal%20Audit%20Reports%20Issued.pdf | 2023 university audit documents Kainos testing and auditing services for Workday changes; direct adjacent testing investment proxy, historically dated. Existing numeric score retained pending scoring-owner assessment; zero does not mean evidence disproves fit.

https://www.provost.iastate.edu/files/documents/2024-04/HLC%20Year%204%20Assurance%20Review.pdf | University accreditation report confirms HCM, Finance and Payroll implemented July 1, 2019; older than 365 days.

Rising: Current public profile includes a recent post saying she is heading to Workday Rising. Year inferred from current post context; speaker status not verified. [Public source](https://www.linkedin.com/in/kristi-darr-b7578012).

### Bronson Healthcare

[Company / Workday source](https://www.workday.com/en-us/customer-stories/a-h/bronson-healthcare-boosts-training-agility-workday-learning.html). Primary Workday customer story confirms use.
[Workforce source](https://www.workday.com/en-us/customer-stories/a-h/bronson-healthcare-boosts-training-agility-workday-learning.html). Dated Workday customer-story workforce snapshot; current exact headcount not verified.

Bronson uses integrated Workday HCM and Learning, and Kognitiv describes benefits and compliance support for its Workday environment. That establishes a support need; a new purchase deadline was not verified.

- **Cheryl Johnson — Senior Vice President, Chief People Officer**. [Role source](https://www.linkedin.com/in/cheryl-johnson-sphr-2795535); [public LinkedIn profile](https://www.linkedin.com/in/cheryl-johnson-sphr-2795535). Current public employer profile; 2026 company release quoted via Publicnow calls her chief human resources officer. No direct route verified.

https://kognitivinc.com/workday-services/hcm | Workday services vendor identifies Bronson as a customer for benefits configuration, compliance and COBRA support; adjacent services investment proxy, without purchase date or amount. Existing numeric score retained pending scoring-owner assessment; zero does not mean evidence disproves fit.

https://www.workday.com/en-us/customer-stories/a-h/bronson-healthcare-boosts-training-agility-workday-learning.html | Workday use confirmed by customer story, but an exact go-live date or dated new trigger was not verified; no date inferred.

### Thermo Fisher Scientific

[Company / Workday source](https://www.workday.com/en-us/customer-stories/q-z/thermo-fisher-empowers-employees-to-do-their-best-work.html). Primary Workday customer story confirms use.
[Workforce source](https://corporate.thermofisher.com/content/dam/tfcorpsite/documents/corporate-social-responsibility/2024-report/Colleagues.pdf). More than 120,000 colleagues, 2024 CSR snapshot; lower bound, not an exact October 2026 count.

WalkMe documents Workday adoption support, and Tricentis reports Tosca and Data Integrity used for ERP testing. These show prior investment in adjacent automation; current Workday purchase timing remains unverified.

- **Lisa P. Britt — Senior Vice President and Chief Human Resource Officer**. [Role source](https://corporate.thermofisher.com/us/en/index/about.html); [public LinkedIn profile](https://www.linkedin.com/in/lbritt). Employer/role checked; purchase authority and warm introduction not established.
- **Ryan Snyder — Senior Vice President and Chief Information Officer**. [Role source](https://corporate.thermofisher.com/us/en/index/about.html). Employer/role checked; purchase authority and warm introduction not established.

https://www.walkme.com/customer-stories/thermofisherscientific/ | WalkMe customer story documents digital adoption and automation for Thermo Fisher's Workday rollout and ongoing releases; adjacent tool adoption proxy, without current purchasing window. Existing numeric score retained pending scoring-owner assessment; zero does not mean evidence disproves fit.

https://www.workday.com/en-us/customer-stories/q-z/thermo-fisher-empowers-employees-to-do-their-best-work.html | Workday use confirmed by customer story, but an exact go-live date or dated new trigger was not verified; no date inferred.

### Tokyo Electron

[Company / Workday source](https://www.workday.com/en-us/customer-stories/q-z/tokyo-electron-ensures-global-consistency-global-hr-system.html). Primary Workday customer story confirms use.
[Workforce source](https://www.tel.com/sustainability/management-foundation/human-resource/). Consolidated headcount as of April 1, 2026.

Tokyo Electron uses a common Workday HCM and Learning platform across regions. Expansion of its Workday relationship was reported in fiscal 2025, but a recent dated rollout or testing purchase was not established.

- **Tatsuya Aso — Senior Vice President and General Manager, Global Business Platform; Chief Administrative Officer**. [Role source](https://www.tel.com/about/leader/). Employer/role checked; purchase authority and warm introduction not established.
- **Takashi Mineshima — Vice President and General Manager, Information Security Unit; Chief Information Security Officer**. [Role source](https://www.tel.com/about/leader/). Employer/role checked; purchase authority and warm introduction not established.

https://www.workday.com/en-us/customer-stories/q-z/tokyo-electron-ensures-global-consistency-global-hr-system.html | No verified adjacent testing/automation purchase or current purchase timeline found in reviewed sources; budget remains unconfirmed. Existing numeric score retained pending scoring-owner assessment; zero does not mean evidence disproves fit.

https://www.workday.com/en-us/customer-stories/q-z/tokyo-electron-ensures-global-consistency-global-hr-system.html | Case study describes Workday relationship from 2016 and employee access expansion in 2019; no exact go-live date verified.

### RMIT University

[Company / Workday source](https://www.workday.com/en-us/customer-stories/q-z/rmit-leads-with-intelligent-digital-infrastructure.html). Primary Workday customer story confirms use.
[Workforce source](https://www.workday.com/en-us/customer-stories/q-z/rmit-leads-with-intelligent-digital-infrastructure.html). Dated Workday customer-story workforce snapshot; current exact headcount not verified.

RMIT has a unified Workday HR and finance environment with planning, learning and recruitment capabilities. Its HR system went live June 7, 2021; current optimization is relevant, but a new buying window is unconfirmed.

- **Gaynor Witts — Vice President, People and Culture**. [Role source](https://policies.rmit.edu.au/document/status-and-details.php?id=324). Work email: gaynor.witts@rmit.edu.au ([source](https://policies.rmit.edu.au/document/status-and-details.php?id=324)); deliverability unverified. Employer/role checked; purchase authority and warm introduction not established.

https://www.workday.com/en-us/customer-stories/q-z/rmit-leads-with-intelligent-digital-infrastructure.html | No verified adjacent testing/automation purchase or current purchase timeline found in reviewed sources; budget remains unconfirmed. Existing numeric score retained pending scoring-owner assessment; zero does not mean evidence disproves fit.

https://www.rmit.edu.au/news/academic-judgment | University explains that it moved to the Workday HR system June 7, 2021; older than 365 days.

### Jardine Matheson

[Company / Workday source](https://www.workday.com/en-us/customer-stories/i-p/jardine-matheson-data-driven-excellence.html). Primary Workday customer story confirms use.
[Workforce source](https://www.workday.com/en-us/customer-stories/i-p/jardine-matheson-data-driven-excellence.html). Approximately 400,000 people in Workday case-study group footprint; includes the diversified portfolio and is not a current parent-only headcount.

Jardines uses Workday for shared workforce data and documents investment in Skillsoft learning technology in 2024. These support workforce technology relevance; a new implementation deadline remains unverified.

- **Raymond Co — Chief People and Culture Officer**. [Role source](https://www.jardines.com/about-jardines/our-leadership); [public LinkedIn profile](https://www.linkedin.com/in/raymond-c-a60b1617). Employer/role checked; purchase authority and warm introduction not established.

https://sustainability.jardines.com/2024/caring_for_our_colleagues.html | Group sustainability report documents Skillsoft platform launch in 2024; adjacent learning technology investment proxy, with no new purchase window. Existing numeric score retained pending scoring-owner assessment; zero does not mean evidence disproves fit.

https://www.workday.com/en-us/customer-stories/i-p/jardine-matheson-data-driven-excellence.html | Workday use confirmed by customer story, but an exact go-live date or dated new trigger was not verified; no date inferred.

### English Schools Foundation

[Company / Workday source](https://www.workday.com/en-us/customer-stories/a-h/esf-unifies-hr-to-shape-future-of-education.html). Primary Workday customer story confirms use.
[Workforce source](https://www.workday.com/en-us/customer-stories/a-h/esf-unifies-hr-to-shape-future-of-education.html). Dated Workday customer-story workforce snapshot; current exact headcount not verified.

ESF adopted Paradox alongside Workday HCM and Recruiting and plans to extend AI and predictive analytics across its employee lifecycle. This creates a documented expansion context, although no exact purchase deadline is public.

- **Kunal Mulchandani — Director of Human Resources**. [Role source](https://www.esf.edu.hk/senior-management/); [public LinkedIn profile](https://www.linkedin.com/in/kunal-mulchandani-sphri-phri-8a705729). Employer/role checked; purchase authority and warm introduction not established.

https://www.workday.com/en-us/customer-stories/a-h/esf-unifies-hr-to-shape-future-of-education.html | Workday customer story explicitly describes adopting Paradox alongside HCM and Recruiting to automate recruitment; adjacent tool adoption proxy, without purchase amount or exact date. Existing numeric score retained pending scoring-owner assessment; zero does not mean evidence disproves fit.

https://www.workday.com/en-us/customer-stories/a-h/esf-unifies-hr-to-shape-future-of-education.html | Workday use confirmed by customer story, but an exact go-live date or dated new trigger was not verified; no date inferred.

### Sun Life

[Company / Workday source](https://www.workday.com/en-us/customer-stories/q-z/sun-life-enhances-employee-experience.html). Primary Workday customer story confirms use.
[Workforce source](https://www.sunlife.com/en/about-us/leadership/helena-pagano/). More than 68,000 employees in current leadership biography; lower bound.

Sun Life has documented Kainos test automation for Workday releases and security controls plus Workday Extend applications. That supports ongoing testing fit; the dated case study does not establish a new purchase window.

- **Helena Pagano — Executive Vice-President and Chief People and Culture Officer**. [Role source](https://www.sunlife.com/en/about-us/leadership/helena-pagano/); [public LinkedIn profile](https://www.linkedin.com/in/helenapagano). Employer/role checked; purchase authority and warm introduction not established.

https://www.kainos.com/insights/success-stories/sun-life-takes-control-of-workday-security-updates-expansion-with-test-automation | Kainos customer story dated April 26, 2020 documents Workday test automation and security testing; strong historical adjacent tool adoption proxy, not a current purchase timeline. Existing numeric score retained pending scoring-owner assessment; zero does not mean evidence disproves fit.

https://www.workday.com/en-us/customer-stories/q-z/sun-life-enhances-employee-experience.html | Workday use confirmed by customer story, but an exact go-live date or dated new trigger was not verified; no date inferred.

### Signify

[Company / Workday source](https://www.workday.com/en-us/customer-stories/q-z/signify-illuminates-hr-transformation-with-workday.html). Primary Workday customer story confirms use.
[Workforce source](https://www.signify.com/global/our-company/investors/contact/faq/faq-items-general/faq-2). 25,866 employees at the end of Q2 2026, from current investor FAQ.

Signify describes active HR AI use cases, Workday workforce planning and collaboration with Paradox on interview scheduling. This establishes a transformation context, with the procurement window still unverified.

- **Kiran Brar — Chief Human Resources Officer**. [Role source](https://www.workday.com/en-us/customer-stories/q-z/signify-illuminates-hr-transformation-with-workday.html); [public LinkedIn profile](https://www.linkedin.com/in/kiran-brar-904289a). Employer/role checked; purchase authority and warm introduction not established.

https://www.workday.com/en-us/customer-stories/q-z/signify-illuminates-hr-transformation-with-workday.html | Customer story describes collaboration with Paradox for automated interview scheduling; deployment/purchase status and date not fully confirmed. Existing numeric score retained pending scoring-owner assessment; zero does not mean evidence disproves fit.

https://www.workday.com/en-us/customer-stories/q-z/signify-illuminates-hr-transformation-with-workday.html | Workday use confirmed by customer story, but an exact go-live date or dated new trigger was not verified; no date inferred.

### Roswell Park Comprehensive Cancer Center

[Company / Workday source](https://www.workday.com/en-us/customer-stories/q-z/roswell-park-discovers-better-processes-insight-outcomes.html). Primary Workday customer story confirms use.
[Workforce source](https://www.workday.com/en-us/customer-stories/q-z/roswell-park-discovers-better-processes-insight-outcomes.html). Dated Workday customer-story workforce snapshot; current exact headcount not verified.

Roswell Park has Workday HCM, Finance and Supply Chain with automated procurement controls and operational dashboards. Those workflows suggest ongoing validation needs; no dated new rollout or adjacent testing purchase was verified.

- **Errol A. Douglas — Senior Vice President and Chief Human Resources Officer**. [Role source](https://www.roswellpark.org/errol-douglas). Employer/role checked; purchase authority and warm introduction not established.

https://www.workday.com/en-us/customer-stories/q-z/roswell-park-discovers-better-processes-insight-outcomes.html | No verified adjacent testing/automation purchase or current purchase timeline found in reviewed sources; budget remains unconfirmed. Existing numeric score retained pending scoring-owner assessment; zero does not mean evidence disproves fit.

https://www.workday.com/en-us/customer-stories/q-z/roswell-park-discovers-better-processes-insight-outcomes.html | Workday use confirmed by customer story, but an exact go-live date or dated new trigger was not verified; no date inferred.

### Del Monte Fresh Produce Company

[Company / Workday source](https://en-gb.newsroom.workday.com/2026-05-21-Workday-Announces-Fiscal-2027-First-Quarter-Financial-Results). Workday names Del Monte Fresh Produce Company as a new customer May 21, 2026. Product scope and exact go-live are not disclosed; distinguish Fresh Del Monte from Del Monte Foods.
[Workforce source](https://freshdelmonte.com/wp-content/uploads/2026/06/2025-Annual-Report.pdf). 8,562 full-time employees plus more than 31,466 daily, seasonal and temporary workers at December 26, 2025; database count uses full-time workforce only.

Workday named Fresh Del Monte as a new customer May 21, 2026. This provides a recent customer adoption signal and possible implementation context; exact go-live, modules and purchase timeline remain undisclosed.

- **Louie Tenazas — Chief Human Resources Officer**. [Role source](https://freshdelmonte.com/our-people/louie-tenazas/); [public LinkedIn profile](https://www.linkedin.com/in/louie-tenazas-42b5184). Employer/role checked; purchase authority and warm introduction not established.
- **Murtaza Habib — Vice President, Corporate Information Technology**. [Role source](https://freshdelmonte.com/people/leadership/). Employer/role checked; purchase authority and warm introduction not established.

https://en-gb.newsroom.workday.com/2026-05-21-Workday-Announces-Fiscal-2027-First-Quarter-Financial-Results | No verified adjacent testing/automation purchase or current purchase timeline found in reviewed sources; budget remains unconfirmed. Existing 14 points were retained from an unreviewed spreadsheet; new evidence does not validate those points.

https://en-gb.newsroom.workday.com/2026-05-21-Workday-Announces-Fiscal-2027-First-Quarter-Financial-Results | New customer announcement dated May 21, 2026 is a verified signal, not an exact go-live. Kept outside the go-live date field.

### Scandic

[Company / Workday source](https://www.workday.com/en-us/customer-stories/q-z/scandic-standardizes-hr-processes-scales.html). Primary Workday customer story confirms use.
[Workforce source](https://www.workday.com/en-us/customer-stories/q-z/scandic-standardizes-hr-processes-scales.html). Dated Workday customer-story workforce snapshot; current exact headcount not verified.

Scandic uses Workday HCM, Talent Management and Compensation to standardize HR across a growing hotel organization. Current HR leadership is identified; a recent deployment or buying deadline was not verified.

- **Elin Ekrol — Interim Chief HR Officer and Director of HR Operations**. [Role source](https://www.scandichotelsgroup.com/our-company/organisation-and-management/executive-committee/); [public LinkedIn profile](https://www.linkedin.com/in/elin-ekrol-6b803319). Employer/role checked; purchase authority and warm introduction not established.

https://www.workday.com/en-us/customer-stories/q-z/scandic-standardizes-hr-processes-scales.html | No verified adjacent testing/automation purchase or current purchase timeline found in reviewed sources; budget remains unconfirmed. Existing numeric score retained pending scoring-owner assessment; zero does not mean evidence disproves fit.

https://www.workday.com/en-us/customer-stories/q-z/scandic-standardizes-hr-processes-scales.html | Workday use confirmed by customer story, but an exact go-live date or dated new trigger was not verified; no date inferred.

### St. Luke's University Health Network

[Company / Workday source](https://www.workday.com/en-us/customer-stories/q-z/st-lukes-university-health-network-improve-retention.html). Primary Workday customer story confirms use.
[Workforce source](https://www.workday.com/en-us/customer-stories/q-z/st-lukes-university-health-network-improve-retention.html). Dated Workday customer-story workforce snapshot; current exact headcount not verified.

St. Luke's has developed Workday Extend applications for retention bonuses and time tracking integrated with HCM and payroll. This provides an ongoing app quality and workforce operations use case, without a verified new purchase window.

- **Evan Ochs — Senior Vice President and Chief Human Resources Officer**. [Role source](https://www.slhn.org/about/leadership/executive-leadership); [public LinkedIn profile](https://www.linkedin.com/in/evanbeererochs). Employer/role checked; purchase authority and warm introduction not established.

https://www.workday.com/en-us/customer-stories/q-z/st-lukes-university-health-network-improve-retention.html | No verified adjacent testing/automation purchase or current purchase timeline found in reviewed sources; budget remains unconfirmed. Existing numeric score retained pending scoring-owner assessment; zero does not mean evidence disproves fit.

https://www.workday.com/en-us/customer-stories/q-z/st-lukes-university-health-network-improve-retention.html | Workday use confirmed by customer story, but an exact go-live date or dated new trigger was not verified; no date inferred.

### Memorial Health

[Company / Workday source](https://memorial.health/about-us/leadership/mandy-c-eaton/). Current HRIS director publicly recruits for the Springfield, Illinois Workday HRIS team. This supports Workday adoption; exact go-live and module scope remain unconfirmed.
[Workforce source](https://memorial.health/about-us/leadership/mandy-c-eaton/). Dated Workday customer-story workforce snapshot; current exact headcount not verified.

Memorial's People Operations leadership vacancy covers HRIS and analytics, while a public CEO interview describes a planned late-September Workday go-live. Completion, exact date and module scope need primary-source confirmation; this is the Springfield, Illinois health system.

- **Elisabeth Klar — Senior Vice President and Chief Human Resources Officer**. [Role source](https://memorial.health/about-us/leadership/elisabeth-klar/); [public LinkedIn profile](https://www.linkedin.com/in/elisabeth-klar-phd-cpc-sphr-5b54938). Work email: klar.elisabeth@mhsil.com ([source](https://memorial.health/Resources/29f57f04-0b2a-4908-838c-875b76d1feb3/163-0747-MH-SLT-Contact-Sheet.pdf)); deliverability unverified. Office phone: +1 217-588-2408 ([source](https://memorial.health/Resources/29f57f04-0b2a-4908-838c-875b76d1feb3/163-0747-MH-SLT-Contact-Sheet.pdf)). Role confirmed in current biography/profile. Work email and office phone published in September 2023 employer contact sheet; stale-route risk, mailbox not deliverability-verified.
- **Suresh Krishnan — Senior Vice President and Chief Information Officer**. [Role source](https://memorial.health/about-us/leadership/). Employer/role checked; purchase authority and warm introduction not established.
- **Jeff Sass — System Director, HRIS**. [Role source](https://www.linkedin.com/in/jeff-sass-21528316); [public LinkedIn profile](https://www.linkedin.com/in/jeff-sass-21528316). Self-announced HRIS director appointment and recent public recruitment for Springfield Memorial's Workday HRIS team; no direct email or office phone verified.

https://memorial.health/about-us/leadership/mandy-c-eaton/ | No verified adjacent testing/automation purchase or current purchase timeline found in reviewed sources; budget remains unconfirmed. Existing 8 points were retained from an unreviewed spreadsheet; new evidence does not validate those points.

https://jobs.memorial.health/job/jr101137/ | People Operations leadership requisition covers HRIS, analytics and shared services. No exact Workday go-live date confirmed; archived Workday analyst listing is no longer active.

### Topcon

[Company / Workday source](https://www.workday.com/en-us/customer-stories/q-z/topcon-transforming-hr-visualizing-democratizing-data.html). Primary Workday customer story confirms use.
[Workforce source](https://global.topcon.com/about/overview/). 4,909 employees as of March 31, 2026; corporate profile.

Topcon uses Workday HCM and Learning to standardize and share workforce data. Its July 2026 management list identifies HR and IT leaders; a recent deployment or purchasing trigger was not verified.

- **Reiko Watanabe — Senior Executive, Chief Human Resource Officer and Chief Sustainability Officer**. [Role source](https://global.topcon.com/about/officer/). Employer/role checked; purchase authority and warm introduction not established.
- **Yoshikuni Ito — Senior Executive, Chief Information Officer**. [Role source](https://global.topcon.com/about/officer/). Employer/role checked; purchase authority and warm introduction not established.

https://www.workday.com/en-us/customer-stories/q-z/topcon-transforming-hr-visualizing-democratizing-data.html | No verified adjacent testing/automation purchase or current purchase timeline found in reviewed sources; budget remains unconfirmed. Existing numeric score retained pending scoring-owner assessment; zero does not mean evidence disproves fit.

https://www.workday.com/en-us/customer-stories/q-z/topcon-transforming-hr-visualizing-democratizing-data.html | Workday use confirmed by customer story, but an exact go-live date or dated new trigger was not verified; no date inferred.

### Hilti Aktiengesellschaft

[Company / Workday source](https://www.workday.com/en-us/customer-stories/a-h/hilti-one-global-system-for-all.html). Primary Workday customer story confirms use.
[Workforce source](https://www.workday.com/en-us/customer-stories/a-h/hilti-one-global-system-for-all.html). Dated Workday customer-story workforce snapshot; current exact headcount not verified.

Hilti has documented Kainos EDM adoption and a newly announced global HR operations leader. That creates an operational transition context for its Workday environment; no new testing purchase deadline is confirmed.

- **Natasha Singh — Global Head of HR Operations**. [Role source](https://www.linkedin.com/posts/natasha-singh-mba-shrm-scp-pmp-9a39b642_excited-to-share-that-ive-stepped-into-a-activity-7433960329618841600-03rz); [public LinkedIn profile](https://www.linkedin.com/in/natasha-singh-mba-shrm-scp-pmp-9a39b642). Self-announced current global HR operations role; predecessor publicly names her in handover. Direct contact route and buying mandate unverified.

https://www.kainos.com/insights/webinars/from-paper-to-productivity-digitizing-frontline-onboarding-with-hilti--kainos-edm | March 19, 2026 vendor webinar documents Hilti using Kainos EDM inside Workday for document and onboarding automation; adjacent tool adoption proxy, no new purchase deadline. Existing numeric score retained pending scoring-owner assessment; zero does not mean evidence disproves fit.

https://blog.workday.com/en-hk/hiltis-hr-transformation-unlocks-end-to-end-efficiencies.html | Workday blog describes HCM implementation in 2018; year only. New HR operations leader self-announces in 2026; no exact Workday go-live date.

## Validation receipt

A rollback preview completed before commit. Subsequent readback verified all 20 company records, all 20 new assessment rows and all 20 generated insights against the prepared records, with Windows newline normalization. The 26 new contacts matched field-for-field; the 2 original contacts were preserved. Every scored category has an HTTP(S) source and a reason. All original cohort assessment rows and manual insight overrides remained intact.

Production UI verification showed saved company facts, evidence, go-live calculations and sourced contact details for Iowa State. The database’s overall counts at readback were 127 real companies, 56 contacts, 147 assessment rows and 17 snapshots; 28 contacts belong to this cohort.

The existing scoring/tier test run passed 19 of 20 checks. The pre-existing date-sensitive demo-sheet expected-total test failed (also documented on the team’s earlier PR #9); this batch does not modify scoring code, thresholds or fixtures. The prior display-only patch passed TypeScript, but it was closed and is not included in this research PR.
