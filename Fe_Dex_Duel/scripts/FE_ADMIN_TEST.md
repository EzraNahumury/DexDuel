# Frontend Admin Tournament Test (OneWallet)

## Preconditions
- `ADMIN_ADDRESSES` in `.env` includes your wallet address (lowercase, `0x...`).
- `ADMIN_SESSION_SECRET` is set.
- Backend APIs are running in the same Next.js app.
- OneWallet extension is installed and unlocked.

## Test Steps
1. Start app: `npm run dev`.
2. Open `http://localhost:3000/admin/tournaments`.
3. Click `Connect OneWallet`.
4. Confirm connected address is shown on screen.
5. Click `Login as admin`.
6. Approve wallet signature popup for the nonce message.
7. Confirm UI shows `Admin session active`.
8. Fill form:
   - `pairSymbol`: `BTC/USDT`
   - `startTime`: now + a few minutes
   - `endTime`: later than start
   - `seasonNo`: optional (for example `1`)
9. Click `Create Tournament`.
10. Approve wallet transaction popup.
11. Confirm tx hash is shown.
12. Confirm tournaments table refreshes from `GET /api/tournaments`.

## Expected Results
- If not logged in, create action returns `Not authorized  login as admin first`.
- If `startTime >= endTime`, create is blocked on client with validation error.
- If wallet RPC call fails, message shows `Wallet RPC endpoint failed`.
- After successful submit, tx hash is visible and list refreshes.

## Screenshot Checklist
- [ ] `/admin/tournaments` page loaded.
- [ ] Connected wallet address visible.
- [ ] `Admin session active` visible after login.
- [ ] Create form values filled.
- [ ] Wallet transaction popup shown.
- [ ] Tx hash shown in UI.
- [ ] Tournaments table shows updated data.
