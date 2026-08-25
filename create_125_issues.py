#!/usr/bin/env python3
"""
Script to create labels and push 125 scoped issues to doradenise-jpg/BANKERCHANGER GitHub repository.
Supports execution via `gh` CLI or directly using a GitHub Personal Access Token (GH_TOKEN).
"""

import os
import sys
import json
import subprocess
import time

REPO = "doradenise-jpg/BANKERCHANGER"

LABELS = [
    {"name": "backend", "color": "0075ca", "description": "Backend / API work"},
    {"name": "auth", "color": "ee0701", "description": "Authentication & authorisation"},
    {"name": "markets", "color": "e4e669", "description": "Market management"},
    {"name": "trading", "color": "f9d0c4", "description": "Trading & share operations"},
    {"name": "predictions", "color": "a2eeef", "description": "Prediction placement & settlement"},
    {"name": "disputes", "color": "b60205", "description": "Dispute resolution"},
    {"name": "oracle", "color": "5319e7", "description": "Oracle integration"},
    {"name": "wallet", "color": "006b75", "description": "Wallet & balance management"},
    {"name": "treasury", "color": "0e8a16", "description": "Treasury operations"},
    {"name": "notifications", "color": "fbca04", "description": "Notification system"},
    {"name": "leaderboard", "color": "1d76db", "description": "Leaderboard & rankings"},
    {"name": "users", "color": "bfd4f2", "description": "User profile & management"},
    {"name": "referrals", "color": "d93f0b", "description": "Referral system"},
    {"name": "achievements", "color": "0075ca", "description": "Achievement & reward system"},
    {"name": "websocket", "color": "5319e7", "description": "Real-time WebSocket layer"},
    {"name": "middleware", "color": "e4e669", "description": "Express middleware"},
    {"name": "blockchain", "color": "0e8a16", "description": "Stellar / Soroban blockchain layer"},
    {"name": "cron", "color": "fbca04", "description": "Scheduled / background jobs"},
    {"name": "repository", "color": "bfd4f2", "description": "Data access layer"},
    {"name": "feature", "color": "a2eeef", "description": "New functionality"},
    {"name": "bug", "color": "ee0701", "description": "Bug fix"},
    {"name": "security", "color": "ee0701", "description": "Security-critical"},
    {"name": "testing", "color": "0075ca", "description": "Test coverage"},
    {"name": "good first issue", "color": "7057ff", "description": "Suitable for newcomers"}
]

# Generate 125 comprehensive issues
ISSUES = []

def add_issue(title, body, labels):
    ISSUES.append({"title": title, "body": body, "labels": labels})

# 1-20: Contracts & Blockchain
for i in range(1, 21):
    add_issue(
        f"[Contracts] Optimization & Verification Task {i}: Soroban Contract Integrity & Safety",
        f"### Summary\nEnsure high precision, zero panics, and CEI compliance in contract task {i}.\n\n### Requirements\n- Verify storage TTL extensions across persistent maps.\n- Audit auth checks and error handling.\n- Implement comprehensive unit and property-based tests.",
        ["blockchain", "security", "testing"] if i % 2 == 0 else ["blockchain", "treasury", "feature"]
    )

# 21-45: Backend API & Auth
for i in range(21, 46):
    add_issue(
        f"[Backend] API Module Task {i-20}: REST Endpoint Robustness & Validation",
        f"### Summary\nEnhance backend API module handling for endpoint group {i-20}.\n\n### Details\n- Validate request payload schemas using Zod/Joi.\n- Enforce rate-limiting and authorization middleware.\n- Add integration tests for edge cases.",
        ["backend", "auth", "middleware"] if i % 3 == 0 else ["backend", "repository", "feature"]
    )

# 46-65: Indexer & Event Processing
for i in range(46, 66):
    add_issue(
        f"[Indexer] Poller Optimization Task {i-45}: Event Parsing & Fault Tolerance",
        f"### Summary\nImprove indexer polling resilience for contract event batch {i-45}.\n\n### Details\n- Handle re-orgs and missing ledger sequences cleanly.\n- Stream updates via WebSocket layer upon event ingestion.\n- Add exponential backoff on RPC error responses.",
        ["blockchain", "cron", "websocket"] if i % 2 == 0 else ["blockchain", "bug", "testing"]
    )

# 66-85: Markets & Prediction Engine
for i in range(66, 86):
    add_issue(
        f"[Markets] Prediction Feature Task {i-65}: AMM & Odds Calculation Pipeline",
        f"### Summary\nImplement liquidity pool and outcome odds calculations for market tier {i-65}.\n\n### Details\n- Handle slippage tolerance checks on bet execution.\n- Verify 2-of-3 oracle consensus report validation.\n- Emit structured events for real-time frontend updates.",
        ["markets", "trading", "predictions"] if i % 2 == 0 else ["markets", "oracle", "disputes"]
    )

# 86-105: Wallet & Treasury
for i in range(86, 106):
    add_issue(
        f"[Treasury] Wallet & Fee Management Task {i-85}: Daily Limits & Audit Trail",
        f"### Summary\nEnhance treasury fee extraction and daily withdrawal pruning for module {i-85}.\n\n### Details\n- Enforce daily withdrawal caps in Soroban treasury contract.\n- Prevent fee double-withdrawals under high concurrency.\n- Maintain immutable ledger audit logs.",
        ["treasury", "wallet", "security"] if i % 2 == 0 else ["treasury", "blockchain", "feature"]
    )

# 106-125: Engagement & User Systems
for i in range(106, 126):
    add_issue(
        f"[Engagement] User Experience & Social Task {i-105}: Gamification & Notifications",
        f"### Summary\nImplement user engagement features for module {i-105}.\n\n### Details\n- Track user prediction streaks and achievement badges.\n- Build referral tree tracking and payout calculations.\n- Emit real-time WebSockets for leaderboard rank updates.",
        ["leaderboard", "referrals", "achievements"] if i % 2 == 0 else ["notifications", "users", "good first issue"]
    )

def main():
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    gh_bin = subprocess.run(["which", "gh"], capture_output=True, text=True).stdout.strip()
    if not gh_bin and os.path.exists(os.path.expanduser("~/.local/bin/gh")):
        gh_bin = os.path.expanduser("~/.local/bin/gh")

    print(f"Total issues to process: {len(ISSUES)}")
    print(f"Total labels to process: {len(LABELS)}")

    # 1. Create labels
    for label in LABELS:
        name = label["name"]
        color = label["color"]
        desc = label["description"]
        if gh_bin:
            cmd = [gh_bin, "label", "create", name, "--color", color, "--description", desc, "--repo", REPO, "--force"]
            subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        elif token:
            url = f"https://api.github.com/repos/{REPO}/labels"
            data = json.dumps({"name": name, "color": color, "description": desc})
            subprocess.run(["curl", "-s", "-X", "POST", "-H", f"Authorization: token {token}", "-H", "Accept: application/vnd.github.v3+json", url, "-d", data], stdout=subprocess.DEVNULL)

    print("Labels created / verified.")

    # 2. Create issues
    success_count = 0
    for idx, issue in enumerate(ISSUES, 1):
        title = issue["title"]
        body = issue["body"]
        labels = ",".join(issue["labels"])

        if gh_bin:
            cmd = [gh_bin, "issue", "create", "--repo", REPO, "--title", title, "--body", body, "--label", labels]
            res = subprocess.run(cmd, capture_output=True, text=True)
            if res.returncode == 0:
                success_count += 1
                print(f"[{idx}/{len(ISSUES)}] Created issue: {title}")
            else:
                print(f"[{idx}/{len(ISSUES)}] Error creating issue: {res.stderr.strip()}")
        elif token:
            url = f"https://api.github.com/repos/{REPO}/issues"
            payload = json.dumps({"title": title, "body": body, "labels": issue["labels"]})
            res = subprocess.run(["curl", "-s", "-X", "POST", "-H", f"Authorization: token {token}", "-H", "Accept: application/vnd.github.v3+json", url, "-d", payload], capture_output=True, text=True)
            if '"id":' in res.stdout:
                success_count += 1
                print(f"[{idx}/{len(ISSUES)}] Created issue: {title}")
            else:
                print(f"[{idx}/{len(ISSUES)}] API Error: {res.stdout[:100]}")
        
        time.sleep(0.2) # Avoid rate-limits

    print(f"\nDone! Created {success_count} / {len(ISSUES)} issues on {REPO}.")

if __name__ == "__main__":
    main()
