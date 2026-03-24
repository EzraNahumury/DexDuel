# SC Dex Duel 🎮

Decentralized Price Prediction Game on OneChain using USDT tokens.

---

## 🚀 Frontend Configuration

```typescript
export const SC_DEX_DUEL_CONFIG = {
  NETWORK: 'testnet',
  PACKAGE_ID: '0xfcb745f20df975c8436ee5ce22c51b389545ffa6f0ac53a435bfdcf2dc1de64d',

  // Shared Objects
  FAUCET_ID:   '0xf1bbfbbaae6f9f6e8c88755072f391656538a685caf3f189d5263ab4a24fc1d9',
  TREASURY_ID: '0x8d900bcfd26c3f6866af28f2707bf93b2eb71448c545cead723640df2590d04e',

  // Admin Objects: Sender-based (Permissionless)
  // No AdminCap required. Any user can create their own round.

  // Coin Type
  USDT_COIN_TYPE: '0xfcb745f20df975c8436ee5ce22c51b389545ffa6f0ac53a435bfdcf2dc1de64d::usdt::USDT',
};
```

---

## � USDT Token

- **Symbol:** USDT
- **Name:** Tether USD (Mock)
- **Decimals:** 6
- **1 USDT** = `1_000_000` units (MIST)
- **Faucet Amount:** 100 USDT per klaim (`100_000_000` units)

---

## � Smart Contract Functions

### Token Functions

#### Claim Free USDT (Faucet)
Klaim 100 USDT gratis — bisa dilakukan berkali-kali.

```typescript
const tx = new Transaction();

const usdtCoin = tx.moveCall({
  target: `${PACKAGE_ID}::usdt::claim_faucet`,
  arguments: [
    tx.object(FAUCET_ID), // Faucet shared object
  ],
});

// Transfer USDT ke wallet user
tx.transferObjects([usdtCoin], tx.pure.address(userAddress));

await client.signAndExecuteTransaction({ signer, transaction: tx });
// Returns: Coin<USDT> senilai 100 USDT
```

---

### Game Round Functions

#### Create Game Session (Admin Only)
```typescript
const tx = new Transaction();

tx.moveCall({
  target: `${PACKAGE_ID}::game_controller::create_game_session`,
  arguments: [
    tx.pure.u64(roundId),                // round_id
    tx.pure.u64(seasonId),               // season_id
    tx.pure.vector('u8', coinSymbol),    // coin_symbol (e.g., "BTC")
    tx.pure.u64(startTime),              // start_time (ms)
    tx.pure.u64(endTime),                // end_time (ms)
    tx.pure.u64(entryFee),               // entry_fee (in USDT units)
    tx.pure.u64(earlyWindowMinutes),     // early_prediction_window_minutes
  ],
});

await client.signAndExecuteTransaction({ signer, transaction: tx });
```

#### Start Game (Admin Only)
```typescript
const tx = new Transaction();

tx.moveCall({
  target: `${PACKAGE_ID}::game_controller::start_game`,
  arguments: [
    tx.object(ROUND_ID),      // Round shared object
    tx.pure.u64(priceStart),  // Harga awal (e.g., 6700000000000)
    tx.object(CLOCK_ID),      // Clock: "0x6"
  ],
});
```

#### Join Game & Make Prediction (Player)
```typescript
const tx = new Transaction();

// Split USDT untuk entry fee
const [payment] = tx.splitCoins(tx.object(usdtCoinId), [
  tx.pure.u64(ENTRY_FEE)
]);

tx.moveCall({
  target: `${PACKAGE_ID}::game_controller::join_game`,
  arguments: [
    tx.object(SESSION_ID),          // GameSession shared object
    tx.object(ROUND_ID),            // Round shared object
    tx.object(PREDICTION_REG_ID),   // PredictionRegistry shared object
    tx.pure.u8(direction),          // 1 = UP, 2 = DOWN
    payment,                        // Coin<USDT>
    tx.object(CLOCK_ID),            // Clock: "0x6"
  ],
});

await client.signAndExecuteTransaction({ signer, transaction: tx });
// direction: 1 = prediksi naik, 2 = prediksi turun
```

#### Complete Game & Distribute Rewards (Admin Only)
```typescript
const tx = new Transaction();

tx.moveCall({
  target: `${PACKAGE_ID}::game_controller::complete_game`,
  arguments: [
    tx.object(SESSION_ID),
    tx.object(ROUND_ID),
    tx.object(PREDICTION_REG_ID),
    tx.object(LEADERBOARD_ID),
    tx.pure.u64(priceEnd),
    tx.pure.vector('address', top3Players), // [rank1, rank2, rank3]
    tx.object(CLOCK_ID),
  ],
});
```

#### Claim Rewards (Player)
```typescript
const tx = new Transaction();

const reward = tx.moveCall({
  target: `${PACKAGE_ID}::game_controller::claim_rewards`,
  arguments: [
    tx.object(ROUND_ID),
    tx.object(PREDICTION_REG_ID),
    tx.pure.address(playerAddress),
  ],
});

tx.transferObjects([reward], tx.pure.address(playerAddress));

await client.signAndExecuteTransaction({ signer, transaction: tx });
```

---

### View Functions

#### Get Game Status
```typescript
const result = await client.devInspectTransactionBlock({
  transactionBlock: (() => {
    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::game_controller::get_game_status`,
      arguments: [
        tx.object(SESSION_ID),
        tx.object(ROUND_ID),
        tx.object(PREDICTION_REG_ID),
      ],
    });
    return tx;
  })(),
  sender: userAddress,
});
// Returns: (round_id, start_time, end_time, price_start, winner_direction, up_count, down_count)
```

#### Get Player Stats
```typescript
const result = await client.devInspectTransactionBlock({
  transactionBlock: (() => {
    const tx = new Transaction();
    tx.moveCall({
      target: `${PACKAGE_ID}::game_controller::get_player_game_stats`,
      arguments: [
        tx.object(PREDICTION_REG_ID),
        tx.object(LEADERBOARD_ID),
        tx.pure.address(playerAddress),
      ],
    });
    return tx;
  })(),
  sender: userAddress,
});
// Returns: (direction, is_correct, rank, total_score, wins, current_streak)
```

---

## �️ Object ID Reference

| Object | ID | Owner |
|---|---|---|
| **Package** | `0xfcb745...e64d` | Immutable |
| **Faucet** | `0xf1bbfb...c1d9` | Shared |
| **Treasury** | `0x8d900b...d04e` | Shared |
| **UpgradeCap** | `0x3a30ef...30fa` | Deployer |
| **CoinMetadata** | `0xbc39b8...089` | Immutable |

---

## 🕐 Direction Constants

```typescript
const DIRECTION = {
  UP:   1,  // Prediksi harga naik
  DOWN: 2,  // Prediksi harga turun
};
```

## ⏰ System Clock

```typescript
const CLOCK_ID = '0x6'; // OneChain system clock object
```

## � Tips Integrasi FE

1. **Faucet** — panggil `claim_faucet` untuk beri user USDT gratis saat onboarding
2. **Entry Fee** — gunakan `splitCoins` untuk memotong USDT sesuai entry fee sebelum `join_game`
3. **Shared Objects** — `FAUCET_ID`, `TREASURY_ID` harus selalu dipakai sebagai `tx.object()`, bukan pure
4. **Leaderboard & PredictionRegistry** — dibuat saat `create_game_session`, catat ID-nya dari event/transaction output
