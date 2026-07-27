#!/usr/bin/env python3
"""Run Foul Play against a passwordless local Showdown server.

This wrapper keeps the upstream bot unmodified. It replaces the public login
server handshake with the local nickname flow used by this private server and
adjusts how broadly near-best MCTS actions are sampled for lower difficulties.
"""

from __future__ import annotations

import asyncio
import os
import random
import sys

import requests

sys.path.insert(0, os.environ.get("FOUL_PLAY_DIR", "/opt/foul-play"))

from fp.main import run_foul_play
from fp.search import main as search_main
from fp.websocket_client import PSWebsocketClient


POLICY_CUTOFF = float(os.environ.get("FOUL_PLAY_POLICY_CUTOFF", "0.75"))
POLICY_TEMPERATURE = float(os.environ.get("FOUL_PLAY_POLICY_TEMPERATURE", "1"))
HTTP_TIMEOUT_SECONDS = float(os.environ.get("FOUL_PLAY_HTTP_TIMEOUT", "10"))
IDLE_TIMEOUT_SECONDS = float(os.environ.get("FOUL_PLAY_IDLE_TIMEOUT", "300"))

if not 0 <= POLICY_CUTOFF <= 1:
    raise ValueError("FOUL_PLAY_POLICY_CUTOFF must be between 0 and 1")
if POLICY_TEMPERATURE <= 0:
    raise ValueError("FOUL_PLAY_POLICY_TEMPERATURE must be greater than 0")


_requests_get = requests.get
_requests_post = requests.post


def _timed_get(*args, **kwargs):
    kwargs.setdefault("timeout", HTTP_TIMEOUT_SECONDS)
    return _requests_get(*args, **kwargs)


def _timed_post(*args, **kwargs):
    kwargs.setdefault("timeout", HTTP_TIMEOUT_SECONDS)
    return _requests_post(*args, **kwargs)


requests.get = _timed_get
requests.post = _timed_post


async def _local_login(self: PSWebsocketClient):
    await self.get_id_and_challstr()
    await self.send_message("", [f"/trn {self.username},0,"])
    await asyncio.sleep(0.5)
    return self.username


_receive_message = PSWebsocketClient.receive_message


async def _receive_message_with_idle_timeout(self: PSWebsocketClient):
    return await asyncio.wait_for(_receive_message(self), timeout=IDLE_TIMEOUT_SECONDS)


def _select_move_with_difficulty(mcts_results):
    final_policy: dict[str, float] = {}
    for mcts_result, sample_chance, _index in mcts_results:
        if not mcts_result.total_visits:
            continue
        for option in mcts_result.side_one:
            final_policy[option.move_choice] = final_policy.get(option.move_choice, 0.0) + (
                sample_chance * (option.visits / mcts_result.total_visits)
            )

    if not final_policy:
        return search_main.select_move_from_mcts_results_original(mcts_results)

    ranked = sorted(final_policy.items(), key=lambda item: item[1], reverse=True)
    best_weight = ranked[0][1]
    candidates = [item for item in ranked if item[1] >= best_weight * POLICY_CUTOFF]
    # Temperatures above 1 flatten the policy while preserving the engine's
    # preference for good actions. This produces easier play without choosing
    # uniformly random or obviously illegal actions.
    weights = [max(weight, 1e-9) ** (1 / POLICY_TEMPERATURE) for _, weight in candidates]
    return random.choices([move for move, _ in candidates], weights=weights, k=1)[0]


PSWebsocketClient.login = _local_login
PSWebsocketClient.receive_message = _receive_message_with_idle_timeout
search_main.select_move_from_mcts_results_original = search_main.select_move_from_mcts_results
search_main.select_move_from_mcts_results = _select_move_with_difficulty


if __name__ == "__main__":
    asyncio.run(run_foul_play())
