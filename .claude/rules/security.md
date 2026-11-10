# Security rules

- **Never commit secrets:** API keys, tokens, passwords, private keys, `.env` files. Use `.env.example` with placeholder names only. Secrets never appear in browser code.
- **Do not trust the client** for currency, rewards, purchases, unlocks, tutorial completion, match results that pay out, admin role, or published config. The server validates and records each with an audit trail.
- The username or label `admin128` is **never** proof of admin privilege. Roles come from verified server-side identity (REQ-BE-4).
- Admin actions are authorised server-side, logged (who, what, when, before/after), versioned, and reversible.
- Validate and sanitise all input at API boundaries; use parameterised queries; apply least-privilege database policies.
- Dependencies: add only what is needed; review licence and maintenance; run an audit before releases.
- **Approval required:** deployment, paid services, production data changes, publishing credentials or personal data (spec §19).
- Personal data: collect the minimum. Do not log personal data or tokens.
