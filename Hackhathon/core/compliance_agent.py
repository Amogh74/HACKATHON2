import re
from typing import List, Dict, Any

class ComplianceAuditorAgent:
    """
    Agent 3: Compliance Auditor Agent
    Cross-checks parsed contract clauses against regulatory rules to flag:
    1. Direct Violations (e.g., forced contact access, third-party repayments, harassment rights)
    2. Missing Mandatory Disclosures / Omissions (e.g., lack of KFS, missing cooling-off period)
    """

    def __init__(self, retriever_agent):
        self.name = "Compliance Auditor Agent"
        self.retriever = retriever_agent

    def audit_contract(self, clauses: List[Dict[str, Any]], full_text: str) -> List[Dict[str, Any]]:
        candidate_flags = []
        full_text_lower = full_text.lower()
        
        # 1. Evaluate individual clauses for direct violations
        for clause in clauses:
            content = clause["content"]
            content_lower = content.lower()
            relevant_rules = self.retriever.retrieve_for_clause(content)
            
            for rule in relevant_rules:
                rule_id = rule["rule_id"]
                
                # Rule 1: Contact / Gallery access
                if rule_id == "RBI-DL-01":
                    if any(term in content_lower for term in ["contact phonebook", "contact list", "photo gallery", "device storage", "call history"]):
                        # Check if it's explicitly disclaiming/prohibiting access (e.g. "does not collect", "will not access")
                        is_negative = any(neg in content_lower for neg in ["does not collect", "does not access", "not collect, read", "will not request", "zero phone access", "never access"])
                        if not is_negative:
                            snippet = self._extract_snippet(content, ["contact", "phonebook", "gallery", "storage"])
                            candidate_flags.append({
                                "type": "DIRECT_VIOLATION",
                                "clause_id": clause["id"],
                                "clause_title": clause["title"],
                                "rule_id": rule["rule_id"],
                                "rule_title": rule["title"],
                                "statute": rule["statute"],
                                "severity": rule["severity"],
                                "quoted_text": snippet,
                                "reasoning": "Clause explicitly mandates access to contact phonebook and media gallery, directly outlawed by RBI Digital Lending Section 4.1.",
                                "borrower_alert": rule["borrower_alert"],
                                "lender_remediation": rule["lender_remediation"]
                            })

                # Rule 2: APR & KFS
                elif rule_id == "RBI-DL-02":
                    if "daily rate" in content_lower or "do not apply" in content_lower or "no separate key fact" in content_lower or "monthly carrying cost" in content_lower:
                        snippet = self._extract_snippet(content, ["daily rate", "apr", "key fact statement", "monthly carrying"])
                        candidate_flags.append({
                            "type": "DIRECT_VIOLATION",
                            "clause_id": clause["id"],
                            "clause_title": clause["title"],
                            "rule_id": rule["rule_id"],
                            "rule_title": rule["title"],
                            "statute": rule["statute"],
                            "severity": rule["severity"],
                            "quoted_text": snippet,
                            "reasoning": "Failure to state annualized APR or attempting to exempt facility from mandatory Key Fact Statement.",
                            "borrower_alert": rule["borrower_alert"],
                            "lender_remediation": rule["lender_remediation"]
                        })

                # Rule 3: Third party repayment accounts
                elif rule_id == "RBI-DL-03":
                    if any(term in content_lower for term in ["third-party", "freelance agency", "offshore merchant", "pool account", "whatsapp or sms"]):
                        is_negative = any(neg in content_lower for neg in ["no third-party", "no third party", "strictly prohibited", "not permitted", "never be routed through third-party"])
                        if not is_negative:
                            snippet = self._extract_snippet(content, ["third-party", "recovery accounts", "payment links"])
                            candidate_flags.append({
                                "type": "DIRECT_VIOLATION",
                                "clause_id": clause["id"],
                                "clause_title": clause["title"],
                                "rule_id": rule["rule_id"],
                                "rule_title": rule["title"],
                                "statute": rule["statute"],
                                "severity": rule["severity"],
                                "quoted_text": snippet,
                                "reasoning": "Disbursals or collections through third-party personal accounts or offshore gateways violate direct bank-to-bank mandates.",
                                "borrower_alert": rule["borrower_alert"],
                                "lender_remediation": rule["lender_remediation"]
                            })

                # Rule 4: Cooling off period denial
                elif rule_id == "RBI-DL-04":
                    if any(term in content_lower for term in ["waive any statutory", "cannot be cancelled", "cooling-off", "look-up"]):
                        if "waive" in content_lower or "cannot be cancelled" in content_lower or "no cancellation" in content_lower:
                            snippet = self._extract_snippet(content, ["waive", "cooling-off", "cannot be cancelled", "no cancellation"])
                            candidate_flags.append({
                                "type": "DIRECT_VIOLATION",
                                "clause_id": clause["id"],
                                "clause_title": clause["title"],
                                "rule_id": rule["rule_id"],
                                "rule_title": rule["title"],
                                "statute": rule["statute"],
                                "severity": rule["severity"],
                                "quoted_text": snippet,
                                "reasoning": "Statutory cooling-off/look-up exit period cannot be contractually waived or denied.",
                                "borrower_alert": rule["borrower_alert"],
                                "lender_remediation": rule["lender_remediation"]
                            })

                # Rule 6: Harassment / Third-party recovery
                elif rule_id == "RBI-DL-06":
                    if any(term in content_lower for term in ["employer", "human resources", "family", "social media", "at any hour", "confidentiality regarding their financial indebtedness"]):
                        is_negative = any(neg in content_lower for neg in ["never contact", "strictly forbidden", "strictly restricted between", "prohibited from contacting", "shall not contact"])
                        if not is_negative:
                            snippet = self._extract_snippet(content, ["employer", "family", "confidentiality", "at any hour"])
                            candidate_flags.append({
                                "type": "DIRECT_VIOLATION",
                                "clause_id": clause["id"],
                                "clause_title": clause["title"],
                                "rule_id": rule["rule_id"],
                                "rule_title": rule["title"],
                                "statute": rule["statute"],
                                "severity": rule["severity"],
                                "quoted_text": snippet,
                                "reasoning": "Contract authorizes contacting third parties, family, and employers outside fair hours, violating fair recovery rules.",
                                "borrower_alert": rule["borrower_alert"],
                                "lender_remediation": rule["lender_remediation"]
                            })

                # Rule 7: Automatic credit limit increase
                elif rule_id == "RBI-DL-07":
                    if any(term in content_lower for term in ["automatically increase", "unilateral discretion", "without requiring separate"]):
                        snippet = self._extract_snippet(content, ["automatically increase", "unilateral discretion", "without requiring"])
                        candidate_flags.append({
                            "type": "DIRECT_VIOLATION",
                            "clause_id": clause["id"],
                            "clause_title": clause["title"],
                            "rule_id": rule["rule_id"],
                            "rule_title": rule["title"],
                            "statute": rule["statute"],
                            "severity": rule["severity"],
                            "quoted_text": snippet,
                            "reasoning": "Automatic enhancement of credit limits without affirmative borrower consent on each occasion is prohibited.",
                            "borrower_alert": rule["borrower_alert"],
                            "lender_remediation": rule["lender_remediation"]
                        })

        # 2. Check for Omission Violations across entire document
        all_rules = self.retriever.get_all_rules()
        for rule in all_rules:
            rule_id = rule["rule_id"]
            
            # Check Grievance Officer omission
            if rule_id == "RBI-DL-05":
                has_gro = ("nodal" in full_text_lower and "grievance" in full_text_lower and ("phone" in full_text_lower or "1800" in full_text_lower or "0124" in full_text_lower))
                if not has_gro:
                    candidate_flags.append({
                        "type": "MISSING_DISCLOSURE",
                        "clause_id": "GLOBAL_OMISSION",
                        "clause_title": "Document-Wide Omission",
                        "rule_id": rule["rule_id"],
                        "rule_title": rule["title"],
                        "statute": rule["statute"],
                        "severity": rule["severity"],
                        "quoted_text": "[ENTIRE AGREEMENT]: Missing dedicated Nodal Grievance Redressal Officer contact details and RBI Ombudsman escalation path.",
                        "reasoning": "The document fails to designate a named Nodal Grievance Redressal Officer with direct phone number and physical address.",
                        "borrower_alert": rule["borrower_alert"],
                        "lender_remediation": rule["lender_remediation"]
                    })

            # Check KFS omission if not present at all
            elif rule_id == "RBI-DL-02":
                has_kfs = ("key fact statement" in full_text_lower or "kfs" in full_text_lower) and "apr" in full_text_lower
                if not has_kfs:
                    candidate_flags.append({
                        "type": "MISSING_DISCLOSURE",
                        "clause_id": "GLOBAL_OMISSION",
                        "clause_title": "Document-Wide Omission",
                        "rule_id": rule["rule_id"],
                        "rule_title": rule["title"],
                        "statute": rule["statute"],
                        "severity": rule["severity"],
                        "quoted_text": "[ENTIRE AGREEMENT]: Missing standardized Key Fact Statement (KFS) containing all-inclusive Annual Percentage Rate (APR).",
                        "reasoning": "No standardized KFS table exists in the agreement showing total cost of credit.",
                        "borrower_alert": rule["borrower_alert"],
                        "lender_remediation": rule["lender_remediation"]
                    })

            # Check Cooling-off period omission if not mentioned at all
            elif rule_id == "RBI-DL-04":
                has_cooling = "cooling-off" in full_text_lower or "look-up period" in full_text_lower
                has_explicit_waiver = any(f["rule_id"] == "RBI-DL-04" for f in candidate_flags)
                if not has_cooling and not has_explicit_waiver:
                    candidate_flags.append({
                        "type": "MISSING_DISCLOSURE",
                        "clause_id": "GLOBAL_OMISSION",
                        "clause_title": "Document-Wide Omission",
                        "rule_id": rule["rule_id"],
                        "rule_title": rule["title"],
                        "statute": rule["statute"],
                        "severity": rule["severity"],
                        "quoted_text": "[ENTIRE AGREEMENT]: Complete omission of mandatory 3-day cooling-off / exit period.",
                        "reasoning": "Digital lending regulations require a clear cooling-off period of at least 3 days for borrowers.",
                        "borrower_alert": rule["borrower_alert"],
                        "lender_remediation": rule["lender_remediation"]
                    })

        return candidate_flags

    def _extract_snippet(self, text: str, keywords: List[str], max_len: int = 160) -> str:
        for kw in keywords:
            idx = text.lower().find(kw.lower())
            if idx != -1:
                start = max(0, idx - 40)
                end = min(len(text), idx + max_len)
                snippet = text[start:end].strip()
                if start > 0:
                    snippet = "..." + snippet
                if end < len(text):
                    snippet = snippet + "..."
                return snippet
        return text[:max_len] + "..."
