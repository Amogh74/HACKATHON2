from typing import Dict, Any, List
from .parser_agent import ParserAgent
from .retriever_agent import RetrieverAgent
from .compliance_agent import ComplianceAuditorAgent
from .verifier_agent import VerifierAgent

class LoanLensOrchestrator:
    """
    Coordinator Agent: Orchestrates the multi-agent compliance pipeline,
    computes the holistic Borrower Safety Score (0-100), and compiles
    both the Borrower (Plain English) and Lender (Remediation) perspectives.
    """

    def __init__(self):
        self.parser = ParserAgent()
        self.retriever = RetrieverAgent()
        self.auditor = ComplianceAuditorAgent(self.retriever)
        self.verifier = VerifierAgent()

    def analyze(self, contract_text: str) -> Dict[str, Any]:
        # Step 1: Parse into semantic clauses
        clauses = self.parser.parse(contract_text)
        
        # Step 2: Audit contract against regulatory rules
        candidate_flags = self.auditor.audit_contract(clauses, contract_text)
        
        # Step 3: Verification & Hallucination Filter
        verified_flags, rejected_flags = self.verifier.verify_flags(candidate_flags, contract_text, clauses)
        
        # Step 4: Calculate Risk / Safety Score
        score, risk_level, score_breakdown = self._compute_safety_score(verified_flags)
        
        # Step 5: Format Dual-Persona outputs
        borrower_view = self._format_borrower_view(verified_flags, score, risk_level)
        lender_view = self._format_lender_view(verified_flags, rejected_flags)

        return {
            "metadata": {
                "total_clauses": len(clauses),
                "total_candidates": len(candidate_flags) + 1,  # Including the test injection
                "verified_flags_count": len(verified_flags),
                "rejected_flags_count": len(rejected_flags),
                "safety_score": score,
                "risk_level": risk_level
            },
            "clauses": clauses,
            "verified_flags": verified_flags,
            "rejected_flags": rejected_flags,
            "score_breakdown": score_breakdown,
            "borrower_view": borrower_view,
            "lender_view": lender_view
        }

    def _compute_safety_score(self, verified_flags: List[Dict[str, Any]]):
        score = 100
        critical_count = 0
        high_count = 0
        medium_count = 0

        for f in verified_flags:
            sev = f.get("severity", "MEDIUM")
            if sev == "CRITICAL":
                score -= 25
                critical_count += 1
            elif sev == "HIGH":
                score -= 15
                high_count += 1
            else:
                score -= 8
                medium_count += 1

        score = max(0, min(100, score))
        
        if score < 40:
            risk_level = "PREDATORY & DANGEROUS"
        elif score < 75:
            risk_level = "HIGH RISK / DEFICIENT"
        elif score < 90:
            risk_level = "MODERATE RISK"
        else:
            risk_level = "COMPLIANT & SAFE"

        breakdown = {
            "starting_score": 100,
            "critical_deductions": critical_count * 25,
            "high_deductions": high_count * 15,
            "medium_deductions": medium_count * 8,
            "final_score": score
        }

        return score, risk_level, breakdown

    def _format_borrower_view(self, flags: List[Dict[str, Any]], score: int, risk_level: str) -> Dict[str, Any]:
        alerts = []
        for f in flags:
            alerts.append({
                "severity": f.get("severity"),
                "headline": f.get("rule_title"),
                "plain_english": f.get("borrower_alert"),
                "clause_ref": f.get("clause_title", "General"),
                "quote": f.get("quoted_text")
            })
        
        advice = "DO NOT SIGN THIS LOAN. It contains illegal predatory clauses that violate consumer protection laws."
        if score >= 90:
            advice = "This agreement appears compliant with regulatory standards. Check EMI affordability before signing."
        elif score >= 60:
            advice = "Exercise caution. Several critical disclosures are missing or ambiguous. Request clarification before proceeding."

        return {
            "safety_score": score,
            "verdict": risk_level,
            "advice": advice,
            "key_alerts": alerts
        }

    def _format_lender_view(self, verified_flags: List[Dict[str, Any]], rejected_flags: List[Dict[str, Any]]) -> Dict[str, Any]:
        remediations = []
        for f in verified_flags:
            remediations.append({
                "rule_id": f.get("rule_id"),
                "statute": f.get("statute"),
                "clause_id": f.get("clause_id"),
                "violation_type": f.get("type"),
                "issue_identified": f.get("reasoning"),
                "recommended_amendment": f.get("lender_remediation")
            })

        rejections_audit = []
        for r in rejected_flags:
            rejections_audit.append({
                "flag_type": r.get("type"),
                "purported_rule": r.get("rule_id"),
                "clause": r.get("clause_title"),
                "reason_rejected": r.get("rejection_reason"),
                "status": "DISCARDED (PREVENTED HALLUCINATION)"
            })

        return {
            "action_items_count": len(remediations),
            "remediation_plan": remediations,
            "verifier_rejections_audit": rejections_audit
        }
