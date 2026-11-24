import json
from pathlib import Path
from typing import List, Dict, Any

class RetrieverAgent:
    """
    Agent 2: Regulatory Knowledge Retrieval Agent
    Retrieves relevant regulatory mandates, statutes, and guidance notes based on clause content.
    """
    
    def __init__(self, rules_file: str = None):
        self.name = "Regulatory Retriever Agent"
        if rules_file is None:
            rules_file = str(Path(__file__).parent.parent / "data" / "regulatory_rules.json")
        
        with open(rules_file, "r", encoding="utf-8") as f:
            self.rules = json.load(f)

    def retrieve_for_clause(self, clause_text: str) -> List[Dict[str, Any]]:
        text_lower = clause_text.lower()
        matched_rules = []
        
        for rule in self.rules:
            score = 0
            keywords = rule.get("keywords", [])
            for kw in keywords:
                if kw.lower() in text_lower:
                    score += 1
            
            if score > 0:
                matched_rules.append({
                    "rule": rule,
                    "relevance_score": score
                })
        
        # Sort by relevance score descending
        matched_rules.sort(key=lambda x: x["relevance_score"], reverse=True)
        return [item["rule"] for item in matched_rules]

    def get_all_rules(self) -> List[Dict[str, Any]]:
        return self.rules
