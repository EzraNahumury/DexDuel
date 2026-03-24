# PR Evidence Pack – DexDuel Backend Integration

## How to Run
1) Start the Next.js app: `npm run dev`
2) Start the indexer worker: `npm run indexer:dev`
3) (Optional) Open Prisma Studio: `npx prisma studio`

### API Evidence
- Set admin cookie:
  - Use `/api/auth/nonce` + `/api/auth/verify` flow to obtain `dd_admin_session` cookie.
  - Run:
    `ADMIN_COOKIE='dd_admin_session=...' BASE_URL=http://localhost:3000 CHAIN_ROUND_ID='0x...' ./scripts/test_api.sh`

### DB Evidence
- Run SQL in your DB console:
  - `\i scripts/db_verify.sql`

---

## Evidence Checklist

### 1) FE reads tournaments from backend (not smart contract)
- [ ] Code search command run:
  - `rg -n "api/tournaments" app src components hooks`
- [ ] Notes on findings:

```
<PASTE FINDINGS>
```

### 2) Backend lists upcoming tournaments
- [ ] `GET /api/tournaments` response captured

```
<PASTE CURL OUTPUT>
```

### 3) Admin create returns tx payload
- [ ] `POST /api/admin/tournaments/create` response captured

```
<PASTE CURL OUTPUT>
```

### 4) Admin cancel guard behavior
- [ ] Cancel UPCOMING round accepted (HTTP 200) and tx payload returned
- [ ] Cancel non-UPCOMING rejected (HTTP 400)

```
<PASTE CURL OUTPUTS>
```

### 5) DB updated by indexer
- [ ] SQL output for latest rounds
- [ ] SQL output for UPCOMING rounds
- [ ] SQL output for CANCELED rounds

```
<PASTE SQL OUTPUT>
```

### 6) Indexer log snippet
- [ ] Indexer log showing event processing

```
<PASTE LOG SNIPPET>
```

### 7) Screenshots / Artifacts
- [ ] Screenshots of SQL results
- [ ] Screenshots of curl outputs
- [ ] (Optional) Prisma Studio view

---

## Notes
- CQRS verified: create/cancel endpoints return tx payload only, no DB writes.
- DB changes verified only after indexer processes on-chain events.