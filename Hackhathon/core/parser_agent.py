import re
from typing import List, Dict, Any

class ParserAgent:
    """
    Agent 1: Clause Parser & Deconstruction Agent
    Splits unstructured loan agreement text into discrete, semantically anchored clauses
    with exact line numbers, titles, and unique clause identifiers.
    """
    
    def __init__(self):
        self.name = "Clause Parser Agent"

    def parse(self, text: str) -> List[Dict[str, Any]]:
        lines = text.strip().splitlines()
        clauses = []
        current_clause = None
        current_lines = []
        start_line = 1
        
        # Regex patterns for clause headers (e.g. "CLAUSE 1:", "SECTION 2:", "1.1", "PART A:", etc.)
        header_pattern = re.compile(
            r'^(CLAUSE\s+\d+|SECTION\s+\d+|PART\s+[A-Z]|ARTICLE\s+\d+|\d+\.\d+|\bPREAMBLE\b|\bTERMS OF\b)', 
            re.IGNORECASE
        )

        for idx, line in enumerate(lines, start=1):
            stripped = line.strip()
            if not stripped:
                continue

            if header_pattern.match(stripped) or (stripped.isupper() and len(stripped) > 4 and len(stripped) < 60):
                if current_clause and current_lines:
                    current_clause["content"] = "\n".join(current_lines).strip()
                    current_clause["end_line"] = idx - 1
                    clauses.append(current_clause)
                
                clause_id = f"clause_{len(clauses) + 1}"
                current_clause = {
                    "id": clause_id,
                    "title": stripped,
                    "start_line": idx,
                    "end_line": idx,
                    "content": ""
                }
                current_lines = [stripped]
            else:
                if current_clause is None:
                    current_clause = {
                        "id": "clause_1",
                        "title": "PREAMBLE & TITLE",
                        "start_line": idx,
                        "end_line": idx,
                        "content": ""
                    }
                    current_lines = [stripped]
                else:
                    current_lines.append(stripped)

        if current_clause and current_lines:
            current_clause["content"] = "\n".join(current_lines).strip()
            current_clause["end_line"] = len(lines)
            clauses.append(current_clause)

        return clauses
