"""Drive headless Firefox through its built-in Marionette protocol (stdlib only, nothing to install).

  from ff import Firefox
  with Firefox(1440, 900) as ff:
      ff.go("http://127.0.0.1:8731/"); ff.js("return document.title"); ff.shot("out.png")
"""
import base64
import json
import os
import shutil
import socket
import subprocess
import tempfile
import time

PORT = 2829  # not the default 2828, so a running desktop Firefox is never touched


class Firefox:
    def __init__(self, w=1440, h=900, dpr=1, prefs=None, headless=True):
        self.w, self.h, self.dpr, self.prefs, self.headless, self.id = w, h, dpr, prefs or {}, headless, 0

    def __enter__(self):
        self.dir = tempfile.mkdtemp(prefix="ffm-")
        with open(os.path.join(self.dir, "user.js"), "w") as f:
            f.write(f'user_pref("marionette.port", {PORT});\n'
                    'user_pref("browser.shell.checkDefaultBrowser", false);\n'
                    'user_pref("datareporting.policy.dataSubmissionEnabled", false);\n'
                    f'user_pref("layout.css.devPixelsPerPx", "{self.dpr}");\n'
                    + "".join(f"user_pref({json.dumps(k)}, {json.dumps(v)});\n" for k, v in self.prefs.items()))
        # headless=False opens a separate, visible test window (own profile) to measure with the GPU.
        self.proc = subprocess.Popen(["/Applications/Firefox.app/Contents/MacOS/firefox", *(["--headless"] if self.headless else []),
                                      "--marionette", "--no-remote", "--profile", self.dir],
                                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(200):
            try:
                self.sock = socket.create_connection(("127.0.0.1", PORT), timeout=60)
                break
            except OSError:
                time.sleep(0.2)
        else:
            raise RuntimeError("marionette did not start")
        self._read()  # handshake
        self.cmd("WebDriver:NewSession", {"capabilities": {"alwaysMatch": {"acceptInsecureCerts": True}}})
        self.cmd("WebDriver:SetTimeouts", {"script": 120000, "pageLoad": 60000})
        self.cmd("WebDriver:SetWindowRect", {"width": self.w, "height": self.h})
        return self

    def __exit__(self, *a):
        try:
            self.cmd("WebDriver:DeleteSession", {})
        except Exception:
            pass
        self.proc.terminate()
        self.proc.wait(10)
        shutil.rmtree(self.dir, ignore_errors=True)

    def _read(self):
        buf = b""
        while b":" not in buf:
            buf += self.sock.recv(1)
        n, rest = buf.split(b":", 1)
        n = int(n)
        while len(rest) < n:
            rest += self.sock.recv(n - len(rest))
        return json.loads(rest)

    def cmd(self, name, params):
        self.id += 1
        msg = json.dumps([0, self.id, name, params]).encode()
        self.sock.sendall(str(len(msg)).encode() + b":" + msg)
        while True:
            r = self._read()
            if r[0] == 1 and r[1] == self.id:
                if r[2]:
                    raise RuntimeError(f"{name}: {r[2]}")
                return r[3]

    def go(self, url):
        self.cmd("WebDriver:Navigate", {"url": url})

    def js(self, script, *args):
        return self.cmd("WebDriver:ExecuteScript", {"script": script, "args": list(args)}).get("value")

    def ajs(self, script, *args):
        """Async: the script calls `done(value)` (last argument)."""
        s = "const done = arguments[arguments.length - 1];\n" + script
        return self.cmd("WebDriver:ExecuteAsyncScript", {"script": s, "args": list(args)}).get("value")

    def shot(self, path):
        data = self.cmd("WebDriver:TakeScreenshot", {"full": False})["value"]
        with open(path, "wb") as f:
            f.write(base64.b64decode(data))
