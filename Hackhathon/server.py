import http.server
import socketserver
import json
import urllib.parse
from pathlib import Path
from core.orchestrator import LoanLensOrchestrator

PORT = 8080
BASE_DIR = Path(__file__).resolve().parent

orchestrator = LoanLensOrchestrator()

MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml"
}

class LoanLensRequestHandler(http.server.BaseHTTPRequestHandler):
    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/presets":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_cors_headers()
            self.end_headers()
            
            presets = {}
            for name, filename in [("predatory", "sample_predatory.txt"), 
                                   ("borderline", "sample_borderline.txt"), 
                                   ("compliant", "sample_compliant.txt")]:
                filepath = BASE_DIR / "data" / filename
                if filepath.exists():
                    with open(filepath, "r", encoding="utf-8") as f:
                        presets[name] = f.read()
            
            self.wfile.write(json.dumps(presets).encode("utf-8"))
            return

        elif path == "/api/rules":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_cors_headers()
            self.end_headers()
            
            rules_path = BASE_DIR / "data" / "regulatory_rules.json"
            if rules_path.exists():
                with open(rules_path, "r", encoding="utf-8") as f:
                    self.wfile.write(f.read().encode("utf-8"))
            else:
                self.wfile.write(b"[]")
            return

        # Serve static files
        if path == "/" or path == "":
            rel_path = "index.html"
        else:
            rel_path = path.lstrip("/")

        file_path = (BASE_DIR / rel_path).resolve()

        # Prevent directory traversal
        if not str(file_path).startswith(str(BASE_DIR)):
            self.send_error(403, "Access Denied")
            return

        if file_path.is_file():
            content_type = MIME_TYPES.get(file_path.suffix.lower(), "application/octet-stream")
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_cors_headers()
            self.end_headers()
            with open(file_path, "rb") as f:
                self.wfile.write(f.read())
        else:
            self.send_error(404, "File Not Found")

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        
        if parsed.path == "/api/analyze":
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length)
            
            try:
                payload = json.loads(post_data.decode("utf-8"))
                text = payload.get("contract_text", "")
                
                result = orchestrator.analyze(text)
                
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps(result).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
            return

        self.send_error(404, "Endpoint Not Found")

    def log_message(self, format, *args):
        # Clean terminal output
        return

def run_server():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("0.0.0.0", PORT), LoanLensRequestHandler) as httpd:
        print(f"LoanLens demo running at http://localhost:{PORT}")
        httpd.serve_forever()

if __name__ == "__main__":
    run_server()
