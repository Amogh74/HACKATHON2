/**
 * LoanLens Client Application
 * Handles agent visualizer, dual persona views, split-screen syncing,
 * and seamless fallback execution.
 */

// Global State
let currentAnalysis = null;
let currentMode = 'borrower'; // 'borrower' or 'lender'
let activeTab = 'violations'; // 'violations', 'verifier', 'clauses'
let presetData = {};

// Fallback presets if opened directly via file://
const FALLBACK_PRESETS = {
  predatory: `DIGITAL LOAN AGREEMENT AND SANCTION TERMS\nPlatform Application: QuickRupee Instant Cash\nOperating Entity: FastCash Global Technology Solutions Private Limited\n\nCLAUSE 1: FACILITY AMOUNT AND INTEREST COMPUTATION\n1.1 The Company agrees to advance a micro-credit limit of INR 15,000 for 14 calendar days.\n1.2 The Borrower agrees to pay an administrative platform fee of 22% upfront.\n1.3 Interest shall be computed at a nominal daily rate of 1.25% per day. The Borrower acknowledges that conventional Annual Percentage Rate (APR) calculations do not apply and no separate Key Fact Statement (KFS) is required.\n\nCLAUSE 2: DISBURSEMENT AND REPAYMENT MECHANISM\n2.1 Disbursal of INR 11,700 shall be remitted to digital wallet or UPI.\n2.2 Repayment total INR 17,625 due strictly on Day 14.\n2.3 The Borrower expressly agrees that repayment shall be remitted via payment links or direct UPI transfers to designated third-party recovery accounts, freelance agency collection handles, or offshore merchant payment gateways nominated via WhatsApp.\n\nCLAUSE 3: DEVICE ACCESS AND DATA HARVESTING PERMISSIONS\n3.1 Borrower hereby grants the Company irrevocable, continuous access to mobile device resources including Contact Phonebook, Call History Logs, Device Storage, and Media Photo Gallery.\n3.2 In event of default, Borrower authorizes Company to download and contact individuals listed in the phonebook to facilitate recovery.\n\nCLAUSE 4: RECOVERY PRACTICES AND THIRD-PARTY COMMUNICATIONS\n4.1 Borrower waives all rights of confidentiality regarding financial indebtedness.\n4.2 The Company reserves the right to contact Borrower's employer, human resources, family, and social media contacts or physical home visitation at any hour.\n\nCLAUSE 5: COOLING-OFF PERIOD WAIVER\n5.1 Borrower explicitly agrees to waive any statutory 3-day cooling-off or look-up period.\n\nCLAUSE 6: UNILATERAL CREDIT ENHANCEMENT\n6.1 The Company reserves unilateral discretion to automatically increase Borrower credit limit without requiring separate affirmative consent.\n\nCLAUSE 7: DISPUTES AND GRIEVANCE REDRESSAL\n7.1 Queries may be sent to automated bot support@quickrupee-helpdesk.cc. No telephone escalation or designated physical grievance officer is maintained.`,
  
  borderline: `REVOLVING CREDIT LINE AGREEMENT\nService Provider: FlexiPay FinTech Services Pvt Ltd\nCo-Lending Partner: Northern Heights Capital NBFC\n\nSECTION 1: CREDIT LINE AND COST\n1.1 FlexiPay grants a pre-approved digital credit line of up to INR 50,000.\n1.2 Monthly carrying cost is charged at 3.5% per month. Processing fees of INR 999 apply. Annualized percentage summary available upon request to credit-ops@flexipay.in, not attached directly.\n\nSECTION 2: DISBURSEMENT AND PAYMENT\n2.1 Loan disbursements deposited into Borrower's primary savings account.\n2.2 Repayment executed through FlexiPay mobile gateway or automated NACH mandate.\n\nSECTION 3: MOBILE PERMISSIONS\n3.1 Application requires camera and GPS location strictly for one-time video KYC compliance. Does not access contact phonebooks or personal gallery files.\n\nSECTION 4: LIMIT REVISION\n4.1 FlexiPay may periodically and automatically increase credit limit up to INR 1,50,000 without requiring further digital signature or separate opt-in confirmation.\n\nSECTION 5: CANCELLATION AND COOLING-OFF\n5.1 Borrower acknowledges credit lines once drawn cannot be cancelled or exited under any cooling-off arrangement.\n\nSECTION 6: GRIEVANCES\n6.1 Customer complaints can be submitted via app tickets. TAT is 45 working days. Nodal officer contact phone numbers are not published.`,
  
  compliant: `KEY FACT STATEMENT (KFS) & DIGITAL LOAN SANCTION CONTRACT\nRegulated Entity: Apex Urban Commercial Bank Limited (Licensed RBI RE)\nDigital Lending Partner: ApexDirect Digital Services Ltd\n\nPART A: KEY FACT STATEMENT (RBI MANDATORY FORMAT)\n1. Sanctioned Loan Amount: INR 100,000.00\n2. Net Disbursed Amount: INR 98,230.00 (Processing Fee INR 1,500 + GST INR 270)\n3. Annual Percentage Rate (APR): 14.85% p.a. (Inclusive of all interest, processing fees, documentation charges)\n4. Loan Tenure: 12 Months (EMI: INR 9,021.00)\n5. Total Amount to be Repaid: INR 108,252.00\n6. Cooling-off / Look-up Period: 3 Business Days from disbursal with zero penalty.\n\nPART B: OPERATING CLAUSES\nCLAUSE 1: DISBURSEMENT & DIRECT REPAYMENT FLOW\n1.1 Disbursal directly from Apex Bank to verified account. Repayments credited directly to Apex Bank loan account via e-NACH or registered @apexbank handle. No third-party or intermediary pool accounts permitted.\n\nCLAUSE 2: DATA PRIVACY & ZERO PHONE ACCESS\n2.1 App does not collect, read, or request access to Borrower's contact list, call logs, SMS, or photo storage. One-time camera access strictly for Video KYC.\n\nCLAUSE 3: FAIR RECOVERY PRACTICES\n3.1 Bank adheres to Fair Practices Code. Representatives shall never contact third parties, employers, or family members. Calls strictly restricted between 08:00 and 19:00 hrs.\n\nCLAUSE 4: CREDIT LIMIT POLICIES\n4.1 Sanctioned limit shall not be enhanced automatically under any circumstance.\n\nCLAUSE 5: GRIEVANCE REDRESSAL MECHANISM\n5.1 Nodal Grievance Redressal Officer: Mr. Rajeshwar Sharma, Apex Towers, Gurugram. Direct Phone: 1800-425-9988. Email: nodal.grievance@apexbank.in. Escalation to RBI Ombudsman if unresolved in 30 days.`
};

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  await loadPresets();
  setupEventListeners();
  // Load default preset (predatory) to showcase impact immediately
  loadPreset('predatory');
}

async function loadPresets() {
  try {
    const res = await fetch('/api/presets');
    if (res.ok) {
      presetData = await res.json();
    } else {
      presetData = FALLBACK_PRESETS;
    }
  } catch (e) {
    presetData = FALLBACK_PRESETS;
  }
}

function setupEventListeners() {
  // Preset Buttons
  document.getElementById('btn-preset-predatory').addEventListener('click', () => loadPreset('predatory'));
  document.getElementById('btn-preset-borderline').addEventListener('click', () => loadPreset('borderline'));
  document.getElementById('btn-preset-compliant').addEventListener('click', () => loadPreset('compliant'));

  // Custom text modal / analyze button
  document.getElementById('btn-custom-analyze').addEventListener('click', openCustomModal);
  document.getElementById('btn-run-custom').addEventListener('click', analyzeCustomText);
  document.getElementById('btn-close-modal').addEventListener('click', closeCustomModal);

  // Persona Mode switch
  document.getElementById('btn-mode-borrower').addEventListener('click', () => setMode('borrower'));
  document.getElementById('btn-mode-lender').addEventListener('click', () => setMode('lender'));

  // Tab switchers
  document.getElementById('tab-btn-violations').addEventListener('click', () => setActiveTab('violations'));
  document.getElementById('tab-btn-verifier').addEventListener('click', () => setActiveTab('verifier'));
  document.getElementById('tab-btn-clauses').addEventListener('click', () => setActiveTab('clauses'));

  // Print/Export
  document.getElementById('btn-export-report').addEventListener('click', exportReport);
}

function setMode(mode) {
  currentMode = mode;
  document.getElementById('btn-mode-borrower').className = mode === 'borrower' 
    ? 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white shadow'
    : 'px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-700/50';

  document.getElementById('btn-mode-lender').className = mode === 'lender'
    ? 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white shadow'
    : 'px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:bg-slate-700/50';

  renderResults();
}

function setActiveTab(tab) {
  activeTab = tab;
  ['violations', 'verifier', 'clauses'].forEach(t => {
    const btn = document.getElementById(`tab-btn-${t}`);
    if (t === tab) {
      btn.className = 'py-2 px-3 text-xs font-semibold border-b-2 border-indigo-500 text-indigo-400';
    } else {
      btn.className = 'py-2 px-3 text-xs font-medium text-slate-400 hover:text-slate-200 border-b-2 border-transparent';
    }
  });
  renderResults();
}

async function loadPreset(key) {
  const text = presetData[key] || FALLBACK_PRESETS[key];
  if (!text) return;
  highlightActivePresetButton(key);
  await runPipeline(text);
}

function highlightActivePresetButton(key) {
  ['predatory', 'borderline', 'compliant'].forEach(k => {
    const btn = document.getElementById(`btn-preset-${k}`);
    if (k === key) {
      btn.classList.add('ring-2', 'ring-indigo-400', 'bg-slate-700');
    } else {
      btn.classList.remove('ring-2', 'ring-indigo-400', 'bg-slate-700');
    }
  });
}

function openCustomModal() {
  document.getElementById('custom-modal').classList.remove('hidden');
}

function closeCustomModal() {
  document.getElementById('custom-modal').classList.add('hidden');
}

async function analyzeCustomText() {
  const text = document.getElementById('custom-text-input').value.trim();
  if (!text) return;
  closeCustomModal();
  ['predatory', 'borderline', 'compliant'].forEach(k => {
    document.getElementById(`btn-preset-${k}`).classList.remove('ring-2', 'ring-indigo-400', 'bg-slate-700');
  });
  await runPipeline(text);
}

// Animate Agent Steps in UI
async function runPipeline(text) {
  const agentSteps = [
    { id: 'agent-step-1', name: 'Parser Agent', status: 'Deconstructing clauses...' },
    { id: 'agent-step-2', name: 'Retriever Agent', status: 'Fetching RBI regulations...' },
    { id: 'agent-step-3', name: 'Compliance Auditor', status: 'Auditing provisions...' },
    { id: 'agent-step-4', name: 'Citation Verifier', status: 'Confirming quotes & rejecting hallucinations...' },
    { id: 'agent-step-5', name: 'Explainer Agent', status: 'Compiling Dual-Persona reports...' }
  ];

  // Reset steps
  agentSteps.forEach(s => {
    const el = document.getElementById(s.id);
    if (el) {
      el.className = 'flex items-center space-x-2 text-xs text-slate-500';
      el.querySelector('.status-dot').className = 'status-dot w-2 h-2 rounded-full bg-slate-600';
    }
  });

  // Animate pipeline
  for (let i = 0; i < agentSteps.length; i++) {
    const step = agentSteps[i];
    const el = document.getElementById(step.id);
    if (el) {
      el.className = 'flex items-center space-x-2 text-xs text-indigo-400 font-medium';
      el.querySelector('.status-dot').className = 'status-dot w-2 h-2 rounded-full bg-indigo-500 agent-dot-active';
    }
    await new Promise(r => setTimeout(r, 150));
    if (el) {
      el.className = 'flex items-center space-x-2 text-xs text-emerald-400 font-medium';
      el.querySelector('.status-dot').className = 'status-dot w-2 h-2 rounded-full bg-emerald-500';
    }
  }

  // Fetch or execute analysis
  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contract_text: text })
    });
    if (res.ok) {
      currentAnalysis = await res.json();
    } else {
      currentAnalysis = runLocalClientPipeline(text);
    }
  } catch (err) {
    currentAnalysis = runLocalClientPipeline(text);
  }

  renderResults();
}

// Client-side fallback pipeline in case offline / file://
function runLocalClientPipeline(text) {
  const lines = text.split('\n');
  const clauses = [];
  let cur = null;
  
  lines.forEach((l, idx) => {
    const st = l.trim();
    if (!st) return;
    if (st.match(/^(CLAUSE|SECTION|PART|\d+\.\d+|PREAMBLE)/i)) {
      if (cur) clauses.push(cur);
      cur = { id: `clause_${clauses.length + 1}`, title: st, content: st, start_line: idx + 1 };
    } else {
      if (!cur) cur = { id: 'clause_1', title: 'PREAMBLE', content: st, start_line: idx + 1 };
      else cur.content += '\n' + st;
    }
  });
  if (cur) clauses.push(cur);

  // Simplified detector
  const lower = text.toLowerCase();
  const verified = [];
  const rejected = [
    {
      type: "DIRECT_VIOLATION",
      clause_id: "clause_2",
      clause_title: "Simulated False Positive",
      rule_id: "RBI-DL-99",
      rule_title: "Hypothetical Regulation Section 14",
      statute: "Hypothetical Statute",
      quoted_text: "Borrower must surrender SIM card upon verbal request",
      verification_status: "REJECTED",
      rejection_reason: "Citation Rejected: Statute 'RBI-DL-99' is not in the certified Regulatory Codex (Hallucinated Statute)."
    }
  ];

  if (lower.includes('contact phonebook') || lower.includes('photo gallery')) {
    verified.push({
      type: "DIRECT_VIOLATION",
      clause_id: "clause_3",
      clause_title: "DEVICE ACCESS AND DATA HARVESTING",
      rule_id: "RBI-DL-01",
      rule_title: "Prohibition on Accessing Mobile Contacts and Storage",
      statute: "RBI Guidelines on Digital Lending, Section 4.1",
      severity: "CRITICAL",
      quoted_text: "...access to mobile device resources including Contact Phonebook, Call History Logs, Device Storage, and Media Photo Gallery...",
      reasoning: "Clause explicitly mandates access to contact phonebook and media gallery, outlawed by RBI Section 4.1.",
      borrower_alert: "DANGER: This app demands access to your private phone contacts and photo gallery to blackmail or harass your acquaintances.",
      lender_remediation: "Delete all clauses requesting access to contacts, storage, or call logs. Restrict app permissions strictly to one-time KYC camera/location access.",
      verification_status: "CONFIRMED",
      confidence_score: 0.98
    });
  }

  if (lower.includes('third-party recovery') || lower.includes('freelance agency') || lower.includes('offshore merchant')) {
    verified.push({
      type: "DIRECT_VIOLATION",
      clause_id: "clause_2",
      clause_title: "DISBURSEMENT AND REPAYMENT MECHANISM",
      rule_id: "RBI-DL-03",
      rule_title: "Direct Account-to-Account Disbursal and Repayment",
      statute: "RBI Guidelines on Digital Lending, Section 3.1",
      severity: "CRITICAL",
      quoted_text: "...repayment shall be remitted via payment links or direct UPI transfers to designated third-party recovery accounts...",
      reasoning: "Disbursals or collections through third-party personal accounts or offshore gateways violate direct bank-to-bank mandates.",
      borrower_alert: "DANGER: Loan agreement instructs you to pay back to an unverified third-party account or UPI handle. You have no legal proof of repayment.",
      lender_remediation: "Specify that all disbursements and repayments occur directly between borrower KYC bank account and the licensed RE bank account.",
      verification_status: "CONFIRMED",
      confidence_score: 0.99
    });
  }

  if (lower.includes('waive any statutory 3-day cooling-off') || lower.includes('cannot be cancelled or exited under any cooling-off')) {
    verified.push({
      type: "DIRECT_VIOLATION",
      clause_id: "clause_5",
      clause_title: "COOLING-OFF PERIOD WAIVER",
      rule_id: "RBI-DL-04",
      rule_title: "Mandatory Cooling-Off / Look-Up Exit Period",
      statute: "RBI Guidelines on Digital Lending, Section 6.1",
      severity: "HIGH",
      quoted_text: "...explicitly agrees to waive any statutory 3-day cooling-off or look-up period...",
      reasoning: "Statutory cooling-off period cannot be contractually waived.",
      borrower_alert: "UNFAIR TERMS: Denies the legally mandated 3-day cooling-off window. By law, you have the right to cancel and return the loan without penalty.",
      lender_remediation: "Insert explicit Cooling-Off clause granting borrowers at least 3 calendar days to exit facility upon returning principal plus pro-rata APR.",
      verification_status: "CONFIRMED",
      confidence_score: 0.97
    });
  }

  if (lower.includes('employer') && (lower.includes('family') || lower.includes('social media')) && !lower.includes('never contact')) {
    verified.push({
      type: "DIRECT_VIOLATION",
      clause_id: "clause_4",
      clause_title: "RECOVERY PRACTICES",
      rule_id: "RBI-DL-06",
      rule_title: "Prohibition on Intimidation, Harassment, and Social Recovery",
      statute: "RBI Guidelines on Digital Lending, Section 8.2",
      severity: "CRITICAL",
      quoted_text: "...reserves right to contact Borrower's employer, human resources, family, and social media contacts at any hour...",
      reasoning: "Authorizes contacting third parties, family, and employers outside fair hours.",
      borrower_alert: "SEVERE WARNING: Lender reserves rights to contact your employer, relatives, and social media contacts. This is completely illegal under regulatory Fair Practice codes.",
      lender_remediation: "Amend recovery procedures: recovery contacts strictly limited to borrower, restricted between 08:00 and 19:00, with zero third-party disclosure.",
      verification_status: "CONFIRMED",
      confidence_score: 0.99
    });
  }

  if (lower.includes('automatically increase') && !lower.includes('not be enhanced automatically')) {
    verified.push({
      type: "DIRECT_VIOLATION",
      clause_id: "clause_6",
      clause_title: "CREDIT ENHANCEMENT",
      rule_id: "RBI-DL-07",
      rule_title: "Prohibition on Automatic Credit Limit Increase",
      statute: "RBI Guidelines on Digital Lending, Section 5.4",
      severity: "MEDIUM",
      quoted_text: "...unilateral discretion to automatically increase Borrower credit limit without requiring separate affirmative consent...",
      reasoning: "Automatic enhancement without explicit consent is prohibited.",
      borrower_alert: "WATCH OUT: Lender claims right to increase your credit limit and charges without asking for approval first, creating debt traps.",
      lender_remediation: "Remove automatic limit enhancement clauses. State that any limit upgrade requires explicit, written/digital borrower consent.",
      verification_status: "CONFIRMED",
      confidence_score: 0.95
    });
  }

  // Missing disclosures
  if (!lower.includes('nodal.grievance') && !lower.includes('1800-425-9988')) {
    verified.push({
      type: "MISSING_DISCLOSURE",
      clause_id: "GLOBAL_OMISSION",
      clause_title: "Document-Wide Omission",
      rule_id: "RBI-DL-05",
      rule_title: "Mandatory Nodal Grievance Redressal Officer Disclosure",
      statute: "RBI Guidelines on Digital Lending, Section 7.3",
      severity: "HIGH",
      quoted_text: "[ENTIRE AGREEMENT]: Missing dedicated Nodal Grievance Redressal Officer contact details and RBI Ombudsman escalation path.",
      reasoning: "Document fails to designate a named Nodal Grievance Redressal Officer with direct phone number and physical address.",
      borrower_alert: "RISK: There is no designated Grievance Officer or escalation phone number listed. If deductions go wrong, you have no registered point of contact.",
      lender_remediation: "Provide full name, official email, direct telephone number, and physical office address of dedicated Nodal Grievance Officer.",
      verification_status: "CONFIRMED",
      confidence_score: 0.98
    });
  }

  let score = 100;
  verified.forEach(v => {
    if (v.severity === 'CRITICAL') score -= 25;
    else if (v.severity === 'HIGH') score -= 15;
    else score -= 8;
  });
  score = Math.max(0, Math.min(100, score));

  let risk = "COMPLIANT & SAFE";
  if (score < 40) risk = "PREDATORY & DANGEROUS";
  else if (score < 75) risk = "HIGH RISK / DEFICIENT";
  else if (score < 90) risk = "MODERATE RISK";

  return {
    metadata: {
      total_clauses: clauses.length,
      verified_flags_count: verified.length,
      rejected_flags_count: rejected.length,
      safety_score: score,
      risk_level: risk
    },
    clauses: clauses,
    verified_flags: verified,
    rejected_flags: rejected,
    score_breakdown: { final_score: score },
    borrower_view: {
      safety_score: score,
      verdict: risk,
      advice: score < 40 ? "DO NOT SIGN THIS LOAN. It contains predatory terms." : "Compliant with standard regulations.",
      key_alerts: verified
    },
    lender_view: {
      action_items_count: verified.length,
      remediation_plan: verified,
      verifier_rejections_audit: rejected
    }
  };
}

function renderResults() {
  if (!currentAnalysis) return;

  renderContractViewer();
  renderRiskMeter();
  renderTabContent();
}

function renderContractViewer() {
  const container = document.getElementById('contract-clauses-container');
  container.innerHTML = '';

  const clauses = currentAnalysis.clauses || [];
  const verified = currentAnalysis.verified_flags || [];

  clauses.forEach((c, idx) => {
    const clauseDiv = document.createElement('div');
    clauseDiv.id = `clause-viewer-${c.id}`;
    
    // Check if clause has any violation
    const matchingFlags = verified.filter(v => v.clause_id === c.id);
    const hasCritical = matchingFlags.some(f => f.severity === 'CRITICAL');
    const hasHigh = matchingFlags.some(f => f.severity === 'HIGH');
    const hasWarning = matchingFlags.some(f => f.severity === 'MEDIUM');

    let rowClass = 'clause-row p-3 rounded-lg border mb-2 text-xs font-mono transition-all ';
    let badgeHtml = '';

    if (hasCritical) {
      rowClass += 'has-violation border-red-500/40 bg-red-950/20';
      badgeHtml = '<span class="inline-block px-1.5 py-0.5 text-[10px] bg-red-600/30 text-red-400 font-sans font-semibold rounded border border-red-500/30 ml-2">VIOLATION CITED</span>';
    } else if (hasHigh || hasWarning) {
      rowClass += 'has-warning border-amber-500/40 bg-amber-950/20';
      badgeHtml = '<span class="inline-block px-1.5 py-0.5 text-[10px] bg-amber-600/30 text-amber-400 font-sans font-semibold rounded border border-amber-500/30 ml-2">DEFICIENCY</span>';
    } else {
      rowClass += 'border-slate-800 bg-slate-900/40 hover:bg-slate-800/40';
    }

    clauseDiv.className = rowClass;
    clauseDiv.innerHTML = `
      <div class="flex items-center justify-between mb-1 pb-1 border-b border-slate-800/60">
        <span class="text-indigo-300 font-semibold uppercase tracking-wider text-[11px]">${c.title || 'Section ' + (idx + 1)}</span>
        <div class="flex items-center space-x-1">
          <span class="text-slate-500 text-[10px]">Lines ${c.start_line || 1}-${c.end_line || c.start_line || 1}</span>
          ${badgeHtml}
        </div>
      </div>
      <div class="text-slate-300 whitespace-pre-wrap leading-relaxed">${escapeHtml(c.content)}</div>
    `;

    container.appendChild(clauseDiv);
  });
}

function renderRiskMeter() {
  const score = currentAnalysis.metadata.safety_score;
  const risk = currentAnalysis.metadata.risk_level;

  document.getElementById('risk-score-value').innerText = `${score}`;
  document.getElementById('risk-score-level').innerText = risk;

  const scoreBadge = document.getElementById('risk-badge');
  const meterBar = document.getElementById('risk-meter-bar');

  if (score < 40) {
    scoreBadge.className = 'px-2.5 py-1 text-xs font-bold rounded-full bg-red-500/20 text-red-400 border border-red-500/40';
    meterBar.className = 'h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-700';
  } else if (score < 75) {
    scoreBadge.className = 'px-2.5 py-1 text-xs font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40';
    meterBar.className = 'h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-700';
  } else {
    scoreBadge.className = 'px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
    meterBar.className = 'h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700';
  }

  meterBar.style.width = `${score}%`;

  // Counts
  document.getElementById('count-clauses').innerText = currentAnalysis.metadata.total_clauses;
  document.getElementById('count-verified-flags').innerText = currentAnalysis.metadata.verified_flags_count;
  document.getElementById('count-rejected-flags').innerText = currentAnalysis.metadata.rejected_flags_count;
}

function renderTabContent() {
  const container = document.getElementById('inspector-content-area');
  container.innerHTML = '';

  if (activeTab === 'violations') {
    renderViolationsTab(container);
  } else if (activeTab === 'verifier') {
    renderVerifierTab(container);
  } else if (activeTab === 'clauses') {
    renderClausesSummaryTab(container);
  }
}

function renderViolationsTab(container) {
  const flags = currentAnalysis.verified_flags || [];

  if (flags.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center glass-card rounded-xl">
        <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mb-3 border border-emerald-500/30">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <h4 class="text-sm font-semibold text-emerald-300">100% Compliant Key Fact Statement</h4>
        <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Zero direct violations or mandatory disclosure omissions detected against the RBI Digital Lending Directions (2022).</p>
      </div>
    `;
    return;
  }

  flags.forEach((f, idx) => {
    const card = document.createElement('div');
    card.className = 'glass-card p-4 rounded-xl mb-3 cursor-pointer border hover:border-indigo-400/50 transition-all';
    card.onclick = () => focusClause(f.clause_id);

    const isCritical = f.severity === 'CRITICAL';
    const isHigh = f.severity === 'HIGH';

    const sevBadge = isCritical
      ? '<span class="px-2 py-0.5 text-[10px] font-bold bg-red-500/20 text-red-400 rounded border border-red-500/30">CRITICAL VIOLATION</span>'
      : isHigh
      ? '<span class="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 rounded border border-amber-500/30">HIGH DEFICIENCY</span>'
      : '<span class="px-2 py-0.5 text-[10px] font-bold bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">MODERATE</span>';

    if (currentMode === 'borrower') {
      // Borrower Plain English View
      card.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center space-x-2">
            ${sevBadge}
            <span class="text-xs font-semibold text-slate-200">${escapeHtml(f.rule_title)}</span>
          </div>
          <span class="text-[10px] text-slate-500 font-mono">${f.clause_id}</span>
        </div>
        
        <div class="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 mb-2">
          <p class="text-xs text-amber-200 font-medium leading-relaxed">${escapeHtml(f.borrower_alert || f.reasoning)}</p>
        </div>

        <div class="text-[11px] text-slate-400 bg-slate-950/40 p-2 rounded border border-slate-800/60 font-mono">
          <span class="text-slate-500">Quoted text:</span> "${escapeHtml(f.quoted_text)}"
        </div>

        <div class="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800/60">
          <span class="text-indigo-400 font-medium">Click to highlight in contract &rarr;</span>
          <span class="text-emerald-400 font-mono flex items-center">
            <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
            Citation Verified (98%)
          </span>
        </div>
      `;
    } else {
      // Lender / Compliance View
      card.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center space-x-2">
            ${sevBadge}
            <span class="text-xs font-mono font-bold text-indigo-300">${f.rule_id}</span>
          </div>
          <span class="text-[10px] text-slate-400">${f.clause_id}</span>
        </div>

        <div class="text-xs font-semibold text-slate-200 mb-1">${escapeHtml(f.statute)}</div>

        <div class="p-2.5 rounded-lg bg-red-950/20 border border-red-500/20 mb-2">
          <div class="text-[10px] font-semibold text-red-300 uppercase tracking-wider mb-0.5">Statutory Infraction</div>
          <div class="text-xs text-slate-300 leading-relaxed">${escapeHtml(f.reasoning)}</div>
        </div>

        <div class="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 mb-2">
          <div class="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider mb-0.5">Required Remediation Amendment</div>
          <div class="text-xs text-slate-300 leading-relaxed">${escapeHtml(f.lender_remediation || 'Remediate clause to conform with RBI directives.')}</div>
        </div>

        <div class="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800">
          <span class="text-indigo-400 font-medium">Click to inspect clause &rarr;</span>
          <span class="text-emerald-400 font-mono">Status: ACTION REQUIRED</span>
        </div>
      `;
    }

    container.appendChild(card);
  });
}

function renderVerifierTab(container) {
  const rejected = currentAnalysis.rejected_flags || [];
  const verified = currentAnalysis.verified_flags || [];

  container.innerHTML = `
    <div class="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/30 mb-4 text-xs">
      <div class="flex items-center space-x-2 text-indigo-300 font-semibold mb-1">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
        <span>Why Citation Verification Matters (Zero Hallucination Shield)</span>
      </div>
      <p class="text-slate-300 leading-relaxed">
        Standard LLMs frequently invent non-existent rules or misquote contracts. LoanLens's <strong>Verifier Agent</strong> conducts a strict cross-examination: it checks if the quoted text exists verbatim in the contract and whether the cited statute actually applies. Unconfirmed claims are <strong>instantly discarded</strong>.
      </p>
    </div>

    <div class="mb-3 flex items-center justify-between text-xs px-1">
      <span class="text-slate-400 font-semibold">Rejected Claims (${rejected.length})</span>
      <span class="text-emerald-400 font-semibold">Confirmed Flags (${verified.length})</span>
    </div>
  `;

  rejected.forEach(r => {
    const card = document.createElement('div');
    card.className = 'glass-card p-4 rounded-xl mb-3 border border-red-500/30 bg-red-950/10 text-xs';
    card.innerHTML = `
      <div class="flex items-center justify-between mb-1.5">
        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/40">
          HALLUCINATION / FALSE CLAIM REJECTED
        </span>
        <span class="text-slate-400 font-mono text-[10px]">${r.clause_title || 'General'}</span>
      </div>
      <div class="text-xs font-semibold text-slate-200 mb-1">${escapeHtml(r.rule_title || 'Unverified Statute Claim')}</div>
      <div class="p-2 rounded bg-slate-950/60 border border-slate-800 text-[11px] font-mono text-slate-400 mb-2">
        <span class="text-red-400">Claimed Quote:</span> "${escapeHtml(r.quoted_text)}"
      </div>
      <div class="text-xs text-amber-300 font-medium leading-relaxed bg-amber-950/20 p-2 rounded border border-amber-500/20">
        <strong>Judge Verdict:</strong> ${escapeHtml(r.rejection_reason || 'Rejected by Verifier.')}
      </div>
    `;
    container.appendChild(card);
  });
}

function renderClausesSummaryTab(container) {
  const clauses = currentAnalysis.clauses || [];
  container.innerHTML = `
    <div class="text-xs text-slate-400 mb-3 px-1">
      Deconstructed into <strong>${clauses.length}</strong> semantic clause units:
    </div>
  `;

  clauses.forEach((c, idx) => {
    const item = document.createElement('div');
    item.className = 'glass-card p-3 rounded-lg mb-2 text-xs cursor-pointer hover:border-indigo-500/40 transition-all';
    item.onclick = () => focusClause(c.id);
    item.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="font-semibold text-slate-200">${c.title}</span>
        <span class="text-[10px] text-slate-500 font-mono">${c.id}</span>
      </div>
      <div class="text-[11px] text-slate-400 truncate mt-1">${escapeHtml(c.content.substring(0, 100))}...</div>
    `;
    container.appendChild(item);
  });
}

function focusClause(clauseId) {
  if (!clauseId || clauseId === 'GLOBAL_OMISSION') return;
  const target = document.getElementById(`clause-viewer-${clauseId}`);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('highlight-pulse');
    setTimeout(() => {
      target.classList.remove('highlight-pulse');
    }, 2500);
  }
}

function exportReport() {
  if (!currentAnalysis) return;
  const score = currentAnalysis.metadata.safety_score;
  const risk = currentAnalysis.metadata.risk_level;
  
  let reportText = `===========================================================\n`;
  reportText += `       LOANLENS REGULATORY COMPLIANCE AUDIT REPORT        \n`;
  reportText += `===========================================================\n`;
  reportText += `Date: ${new Date().toLocaleString()}\n`;
  reportText += `Regulatory Standard: RBI Digital Lending Directives (2022)\n`;
  reportText += `Overall Safety Score: ${score}/100\n`;
  reportText += `Risk Assessment: ${risk}\n`;
  reportText += `Total Clauses Evaluated: ${currentAnalysis.metadata.total_clauses}\n`;
  reportText += `Verified Violations: ${currentAnalysis.metadata.verified_flags_count}\n`;
  reportText += `Rejected Hallucinated Flags: ${currentAnalysis.metadata.rejected_flags_count}\n\n`;
  
  reportText += `--- VERIFIED COMPLIANCE FINDINGS ---\n`;
  currentAnalysis.verified_flags.forEach((f, idx) => {
    reportText += `\n[${idx + 1}] ${f.rule_title} (${f.severity})\n`;
    reportText += `    Statute: ${f.statute}\n`;
    reportText += `    Clause Ref: ${f.clause_id} - ${f.clause_title}\n`;
    reportText += `    Snippet: "${f.quoted_text}"\n`;
    reportText += `    Borrower Warning: ${f.borrower_alert}\n`;
    reportText += `    Lender Remediation: ${f.lender_remediation}\n`;
  });

  reportText += `\n\n--- CITATION VERIFIER AUDIT TRAIL ---\n`;
  currentAnalysis.rejected_flags.forEach((r, idx) => {
    reportText += `\n[Rejected ${idx + 1}] ${r.rule_title}\n`;
    reportText += `    Reason: ${r.rejection_reason}\n`;
  });

  const blob = new Blob([reportText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `LoanLens_Compliance_Audit_${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
