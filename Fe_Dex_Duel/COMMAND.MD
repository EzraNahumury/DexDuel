Kamu adalah senior fullstack engineer (Next.js + TypeScript) untuk dApp OneChain (Move).
Goal: Integrasikan smart contract SC_Dex_Duel ke dApp Next.js (frontend + backend satu repo) dengan MVP approach (jangan over-engineer).

KONTEKS KONTRAK:
- Package sudah dipublish via `one client publish`.
- Modules utama:
  - sc_dex_duel::game_controller
  - sc_dex_duel::game_round
  - sc_dex_duel::prediction
  - sc_dex_duel::leaderboard
- Event penting untuk indexer/UI:
  - game_round::RoundCreated (PASTIKAN ada field `round_address: address` supaya backend tidak mismatch)
  - game_controller::JoinEvent, RefundEvent, PrizeEvent
  - game_round::RoundSettled, RoundEnded, RoundCancelled, RewardClaimed, RefundClaimed
- Mekanisme claim sudah unified: `game_round::claim(round, ctx)` (tanpa rank param dari user).
- Winner ranks di-set oleh admin via controller complete_game -> set_winner_rank -> lock_winners -> settle.

PATH FILE KONTRAK (akses langsung dari filesystem):
- \\wsl.localhost\Ubuntu\home\secondio10\onechain-projects\SC_Dex_Duel\sources\game_controller.move
- \\wsl.localhost\Ubuntu\home\secondio10\onechain-projects\SC_Dex_Duel\sources\game_round.move
- \\wsl.localhost\Ubuntu\home\secondio10\onechain-projects\SC_Dex_Duel\sources\prediction.move
- \\wsl.localhost\Ubuntu\home\secondio10\onechain-projects\SC_Dex_Duel\sources\leaderboard.move
- \\wsl.localhost\Ubuntu\home\secondio10\onechain-projects\SC_Dex_Duel\Move.toml
- \\wsl.localhost\Ubuntu\home\secondio10\onechain-projects\SC_Dex_Duel\Move.lock
- \\wsl.localhost\Ubuntu\home\secondio10\onechain-projects\SC_Dex_Duel\README.md

PUBLIC CONFIG YANG HARUS DIPAKAI DARI ENV (jangan hardcode nilai di banyak tempat):
- NEXT_PUBLIC_ONECHAIN_RPC=<isi dari saya>
- NEXT_PUBLIC_NETWORK=testnet
- NEXT_PUBLIC_PACKAGE_ID=<isi dari saya>
- NEXT_PUBLIC_TREASURY_OBJECT_ID=<isi dari saya>
- NEXT_PUBLIC_USDT_TYPE=<isi dari saya>

TUGAS IMPLEMENTASI (MVP):
1) Buat file config tunggal:
   - src/config/onechain.ts: baca process.env.NEXT_PUBLIC_* + validasi (throw error kalau kosong).
   - src/types/onechain.ts: tipe untuk ObjectId, PackageId, dll.

2) Buat wrapper client:
   - src/lib/onechain/client.ts:
     - create read client dengan RPC dari config
     - helper `getSigner()` pakai wallet adapter yang sudah ada di project (jangan bikin sistem wallet baru)
   - src/lib/onechain/tx.ts:
     - builder untuk transaksi utama:
       - initialize_tournament
       - create_game_session
       - join_game (direction UP/DOWN)
       - start_game (admin)
       - complete_game (admin) + finalize registry (jika ada)
       - settle_game (admin)
       - claim_rewards (user)
       - cancel_tournament (admin)
       - claim_tournament_refund (user)
     - Pastikan argumen dan target function sesuai signature di .move.

3) Backend API routes (minimal):
   - app/api (atau pages/api) buat endpoints:
     - GET /api/rounds (ambil list round dari event RoundCreated; simpan in-memory atau DB kalau sudah ada)
     - GET /api/rounds/[roundAddress] (detail: status, pool, timestamps)
     - GET /api/me?address=... (status user: participant/claimed/refunded + rank if needed)
   Catatan: Jangan buat indexer berat. MVP cukup query events dari RPC + caching sederhana.

4) Frontend wiring:
   - Hubungkan tombol UI yang sudah ada ke tx builder.
   - Buat hooks:
     - useRounds()
     - useRoundDetail(roundAddress)
     - useJoinGame()
     - useClaim()
   - Pastikan UX: loading, error toast, disable button jika state tidak valid.

OUTPUT/ACCEPTANCE:
- `pnpm build` atau `npm run build` harus lolos.
- TypeScript tidak error.
- Semua NEXT_PUBLIC env dipakai dari 1 tempat (src/config/onechain.ts).
- Tidak ada secret yang diminta/ditulis di client-side.
- Dokumentasikan cara isi `.env.local` dan cara test flow end-to-end (create -> join -> end -> settle -> claim).

Mulai dari membaca repo Next.js + file .move untuk mapping function target & event types.
Jika ada mismatch nama function/argumen, perbaiki integrasi (bukan ubah kontrak lagi) kecuali benar-benar wajib.