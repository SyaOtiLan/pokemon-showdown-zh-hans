#!/usr/bin/env python3
"""Local HTTP broker that starts one Foul Play challenge at a time."""

from __future__ import annotations

import json
import logging
import os
import re
import subprocess
import threading
import time
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


HOST = os.environ.get("AI_SERVICE_HOST", "127.0.0.1")
PORT = int(os.environ.get("AI_SERVICE_PORT", "8765"))
FOUL_PLAY_DIR = Path(os.environ.get("FOUL_PLAY_DIR", "/opt/foul-play"))
PYTHON = os.environ.get("FOUL_PLAY_PYTHON", str(FOUL_PLAY_DIR / ".venv/bin/python"))
RUNNER = Path(os.environ.get("FOUL_PLAY_RUNNER", "/opt/pokemon-showdown-ai/foul_play_local_runner.py"))
WEBSOCKET_URI = os.environ.get("PS_WEBSOCKET_URI", "ws://127.0.0.1:8000/showdown/websocket")
BATTLE_FORMAT = os.environ.get("AI_BATTLE_FORMAT", "gen9randombattle")
LOG_DIR = Path(os.environ.get("AI_LOG_DIR", "/var/log/pokemon-showdown-ai"))

DIFFICULTIES = {
    "easy": {
        "label": "入门",
        "bot_name": "AI Easy",
        "search_time_ms": 25,
        "policy_cutoff": 0.25,
        "policy_temperature": 2.0,
    },
    "normal": {
        "label": "普通",
        "bot_name": "AI Normal",
        "search_time_ms": 100,
        "policy_cutoff": 0.5,
        "policy_temperature": 1.5,
    },
    "hard": {
        "label": "困难",
        "bot_name": "AI Hard",
        "search_time_ms": 300,
        "policy_cutoff": 0.7,
        "policy_temperature": 1.15,
    },
    "max": {
        "label": "最高",
        "bot_name": "AI Maximum",
        "search_time_ms": 750,
        "policy_cutoff": 0.75,
        "policy_temperature": 1.0,
    },
}

USERNAME_RE = re.compile(r"^[A-Za-z0-9 ]{1,18}$")
state_lock = threading.Lock()
active: dict[str, object] = {}


def public_state() -> dict[str, object]:
    with state_lock:
        process = active.get("process")
        running = isinstance(process, subprocess.Popen) and process.poll() is None
        return {
            "running": running,
            "difficulty": active.get("difficulty") if running else None,
            "target": active.get("target") if running else None,
            "startedAt": active.get("started_at") if running else None,
            "format": BATTLE_FORMAT,
        }


def monitor_process(process: subprocess.Popen, log_file) -> None:
    exit_code = process.wait()
    log_file.close()
    logging.info("Foul Play exited with code %s", exit_code)
    with state_lock:
        if active.get("process") is process:
            active.clear()


def start_challenge(username: str, difficulty: str) -> tuple[bool, str]:
    config = DIFFICULTIES[difficulty]
    with state_lock:
        process = active.get("process")
        if isinstance(process, subprocess.Popen) and process.poll() is None:
            return False, "机器人正在进行另一场对战，请稍后再试。"

        LOG_DIR.mkdir(parents=True, exist_ok=True)
        log_path = LOG_DIR / f"battle-{int(time.time())}-{difficulty}.log"
        log_file = log_path.open("ab", buffering=0)
        env = os.environ.copy()
        env.update({
            "FOUL_PLAY_POLICY_CUTOFF": str(config["policy_cutoff"]),
            "FOUL_PLAY_POLICY_TEMPERATURE": str(config["policy_temperature"]),
            "FOUL_PLAY_HTTP_TIMEOUT": "10",
            "PYTHONUNBUFFERED": "1",
        })
        command = [
            PYTHON,
            str(RUNNER),
            "--websocket-uri", WEBSOCKET_URI,
            "--ps-username", str(config["bot_name"]),
            "--bot-mode", "challenge_user",
            "--user-to-challenge", username,
            "--pokemon-format", BATTLE_FORMAT,
            "--search-time-ms", str(config["search_time_ms"]),
            "--search-parallelism", "1",
            "--search-threads", "1",
            "--run-count", "1",
            "--save-replay", "never",
            "--log-level", "INFO",
        ]
        try:
            process = subprocess.Popen(
                command,
                cwd=FOUL_PLAY_DIR,
                env=env,
                stdin=subprocess.DEVNULL,
                stdout=log_file,
                stderr=subprocess.STDOUT,
                start_new_session=True,
            )
        except Exception:
            log_file.close()
            raise
        active.update({
            "process": process,
            "difficulty": difficulty,
            "target": username,
            "started_at": int(time.time()),
            "log_path": str(log_path),
        })

    threading.Thread(target=monitor_process, args=(process, log_file), daemon=True).start()
    return True, f"{config['label']}难度机器人正在准备，稍后会向你发起挑战。"


class Handler(BaseHTTPRequestHandler):
    server_version = "PokemonShowdownAI/1.0"

    def log_message(self, fmt: str, *args) -> None:
        logging.info("%s - %s", self.client_address[0], fmt % args)

    def send_json(self, status: int, payload: dict[str, object]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        if self.path in ("/health", "/status"):
            self.send_json(HTTPStatus.OK, {"ok": True, **public_state()})
            return
        self.send_json(HTTPStatus.NOT_FOUND, {"ok": False, "message": "Not found"})

    def do_POST(self) -> None:
        if self.path != "/challenge":
            self.send_json(HTTPStatus.NOT_FOUND, {"ok": False, "message": "Not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 4096:
                raise ValueError("Invalid body length")
            data = json.loads(self.rfile.read(length))
            username = str(data.get("username", "")).strip()
            difficulty = str(data.get("difficulty", "normal"))
            if not USERNAME_RE.fullmatch(username):
                self.send_json(HTTPStatus.BAD_REQUEST, {
                    "ok": False,
                    "message": "请先使用只包含英文字母和数字的游戏昵称登录。",
                })
                return
            if difficulty not in DIFFICULTIES:
                self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "message": "未知难度。"})
                return
            started, message = start_challenge(username, difficulty)
            self.send_json(HTTPStatus.OK, {
                "ok": started,
                "message": message,
                **public_state(),
            })
        except (ValueError, json.JSONDecodeError):
            self.send_json(HTTPStatus.BAD_REQUEST, {"ok": False, "message": "请求格式错误。"})
        except Exception:
            logging.exception("Could not start Foul Play")
            self.send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {
                "ok": False,
                "message": "机器人启动失败，请稍后再试。",
            })


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    logging.info("AI challenge service listening on http://%s:%s", HOST, PORT)
    server.serve_forever()


if __name__ == "__main__":
    main()
