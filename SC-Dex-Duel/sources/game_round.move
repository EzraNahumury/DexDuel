/// Module: game_round
/// Manages game rounds, staking, and lossless tournament reward distribution
module sc_dex_duel::game_round {
    use sc_dex_duel::usdt::USDT;
    use one::coin::{Self, Coin};
    use one::balance::{Self, Balance};
    use one::clock::{Self, Clock};
    use one::table::{Self, Table};
    use one::event;
    use one::tx_context;
    use one::object;
    use one::transfer;

    // ==================== Error Codes ====================
    const ERR_ROUND_NOT_ACTIVE: u64 = 1;
    const ERR_ROUND_NOT_ENDED: u64 = 2;
    const ERR_ROUND_ALREADY_SETTLED: u64 = 3;
    const ERR_INVALID_ENTRY_FEE: u64 = 4;
    const ERR_ALREADY_PREDICTED: u64 = 5;
    const ERR_UNAUTHORIZED: u64 = 6;
    const ERR_INVALID_PRICE: u64 = 7;
    const ERR_ROUND_CANCELLED: u64 = 8;
    const ERR_ROUND_NOT_CANCELLED: u64 = 9;
    const ERR_NOT_PARTICIPANT: u64 = 10;
    const ERR_REFUND_ALREADY_CLAIMED: u64 = 11;
    const ERR_INVALID_DIRECTION: u64 = 12;
    const ERR_INSUFFICIENT_PARTICIPANTS: u64 = 13;
    const ERR_ALREADY_CLAIMED: u64 = 14;
    const ERR_ROUND_ALREADY_ACTIVE: u64 = 15;
    const ERR_NOT_SETTLED: u64 = 16;
    const ERR_PREDICTION_LOCKED: u64 = 17;
    const ERR_INVALID_RANK: u64 = 18;       // rank param is not 1, 2, or 3
    const ERR_WINNERS_LOCKED: u64 = 19;     // winner_ranks already locked; no further edits
    const ERR_WINNERS_NOT_LOCKED: u64 = 20; // settle requires winners to be locked first

    // ==================== Constants ====================
    const ADMIN_FEE_BPS: u64 = 1000; // 10% in basis points (10,000 = 100%)
    const RANK1_REWARD_BPS: u64 = 5000; // 50% of net pool
    const RANK2_REWARD_BPS: u64 = 3000; // 30% of net pool
    const RANK3_REWARD_BPS: u64 = 2000; // 20% of net pool
    const BPS_DENOMINATOR: u64 = 10000;

    // ==================== Structs ====================

    /// Represents the current status of a round
    public struct RoundStatus has copy, drop, store {
        is_active: bool,
        is_ended: bool,
        is_settled: bool,
        is_cancelled: bool,
    }

    /// Main Round object
    public struct Round has key, store {
        id: object::UID,
        round_id: u64,
        coin_symbol: vector<u8>, // e.g., "BTC", "ETH"
        start_time: u64,
        end_time: u64,
        prediction_end_time: u64, // The time after which no more predictions can be made
        entry_fee: u64,
        price_start: u64, // TWAP price at start (in fixed point, e.g., scaled by 1e8)
        price_end: u64, // TWAP price at end
        total_pool: Balance<USDT>, // Total staked principal
        yield_pool: Balance<USDT>, // Yield generated from staking
        status: RoundStatus,
        winner_direction: u8, // 0 = not set, 1 = UP, 2 = DOWN
        up_count: u64,
        down_count: u64,
        total_participants: u64,
        min_participants: u64,
        participants: Table<address, bool>,      // Track if address has participated
        reward_claimed: Table<address, bool>,     // Track if address has claimed rewards/principal
        refunded: Table<address, bool>,           // Track if address has claimed refund
        winner_ranks: Table<address, u8>,         // Internal rank storage: address -> rank (1,2,3)
        winners_locked: bool,                     // True after lock_winners(); blocks set_winner_rank
        final_prize_pool: u64,                    // LOCKED net prize pool for deterministic rewards
        admin: address,
    }

    /// Treasury to collect admin fees
    public struct Treasury has key {
        id: object::UID,
        balance: Balance<USDT>,
        admin: address,
    }

    // ==================== Events ====================

    public struct RoundCreated has copy, drop {
        round_address: address, // address of the Round object
        round_id: u64,
        coin_symbol: vector<u8>,
        start_time: u64,
        end_time: u64,
        entry_fee: u64,
    }

    public struct PredictionMade has copy, drop {
        round_id: u64,
        player: address,
        direction: u8, // 1 = UP, 2 = DOWN
        amount: u64,
        timestamp: u64,
    }

    public struct RoundEnded has copy, drop {
        round_id: u64,
        price_start: u64,
        price_end: u64,
        winner_direction: u8,
    }

    public struct RoundSettled has copy, drop {
        round_id: u64,
        total_yield: u64,
        admin_fee: u64,
        prize_pool: u64,
    }

    public struct RewardClaimed has copy, drop {
        round_id: u64,
        player: address,
        principal: u64,
        reward: u64,
    }

    public struct RoundCancelled has copy, drop {
        round_id: u64,
        cancelled_by: address,
        total_participants: u64,
        total_refund_pool: u64,
    }

    public struct RefundClaimed has copy, drop {
        round_id: u64,
        player: address,
        refund_amount: u64,
    }

    // ==================== Init Function ====================

    fun init(ctx: &mut tx_context::TxContext) {
        // Create shared Treasury on deployment
        transfer::share_object(Treasury {
            id: object::new(ctx),
            balance: balance::zero(),
            admin: tx_context::sender(ctx),
        });
    }

    // ==================== Admin Functions ====================

    /// Create a new game round.
    /// The caller automatically becomes the round admin (owner).
    public fun create_round(
        round_id: u64,
        coin_symbol: vector<u8>,
        start_time: u64,
        end_time: u64,
        prediction_end_time: u64,
        entry_fee: u64,
        min_participants: u64,
        ctx: &mut tx_context::TxContext
    ) {
        let round = Round {
            id: object::new(ctx),
            round_id,
            coin_symbol,
            start_time,
            end_time,
            prediction_end_time,
            entry_fee,
            price_start: 0,
            price_end: 0,
            total_pool: balance::zero(),
            yield_pool: balance::zero(),
            status: RoundStatus {
                is_active: false,
                is_ended: false,
                is_settled: false,
                is_cancelled: false,
            },
            winner_direction: 0,
            up_count: 0,
            down_count: 0,
            total_participants: 0,
            min_participants,
            participants: table::new(ctx),
            reward_claimed: table::new(ctx),
            refunded: table::new(ctx),
            winner_ranks: table::new(ctx),
            winners_locked: false,
            final_prize_pool: 0,
            admin: tx_context::sender(ctx),
        };

        let round_address = object::uid_to_address(&round.id);

        event::emit(RoundCreated {
            round_address,
            round_id,
            coin_symbol,
            start_time,
            end_time,
            entry_fee,
        });

        transfer::share_object(round);
    }

    public fun start_round(
        round: &mut Round,
        price_start: u64,
        clock: &Clock,
        ctx: &tx_context::TxContext
    ) {
        assert!(!round.status.is_cancelled, ERR_ROUND_CANCELLED);
        assert!(!round.status.is_active, ERR_ROUND_ALREADY_ACTIVE);
        assert!(price_start > 0, ERR_INVALID_PRICE);

        round.price_start = price_start;
        round.status.is_active = true;
    }

    /// Cancel a tournament round.
    /// Only the round admin can cancel.
    public fun cancel_round(
        round: &mut Round,
        clock: &Clock,
        ctx: &tx_context::TxContext,
    ) {
        assert!(!round.status.is_settled, ERR_ROUND_ALREADY_SETTLED);
        assert!(!round.status.is_cancelled, ERR_ROUND_CANCELLED);
        // Hardening: Only round admin can cancel
        assert!(tx_context::sender(ctx) == round.admin, ERR_UNAUTHORIZED);

        let current_time = clock::timestamp_ms(clock);
        let is_upcoming = current_time < round.start_time;
        let has_low_participation = round.total_participants < round.min_participants;

        assert!(is_upcoming || has_low_participation, ERR_ROUND_ALREADY_ACTIVE);

        round.status.is_active = false;
        round.status.is_cancelled = true;

        let total_refund_pool = balance::value(&round.total_pool);

        event::emit(RoundCancelled {
            round_id: round.round_id,
            cancelled_by: tx_context::sender(ctx),
            total_participants: round.total_participants,
            total_refund_pool,
        });
    }

    /// Claim a full refund of the entry fee after the round has been cancelled.
    /// Each registered participant calls this once to receive their coins back.
    public fun claim_refund(
        round: &mut Round,
        ctx: &mut tx_context::TxContext,
    ): Coin<USDT> {
        let sender = tx_context::sender(ctx);

        // Round must have been cancelled
        assert!(round.status.is_cancelled, ERR_ROUND_NOT_CANCELLED);
        // Caller must have been a participant
        assert!(table::contains(&round.participants, sender), ERR_NOT_PARTICIPANT);
        // Cannot claim refund twice
        assert!(!table::contains(&round.refunded, sender), ERR_REFUND_ALREADY_CLAIMED);

        // Mark as refunded
        table::add(&mut round.refunded, sender, true);

        // Return entry fee
        let refund_balance = balance::split(&mut round.total_pool, round.entry_fee);
        let refund_coin = coin::from_balance(refund_balance, ctx);

        event::emit(RefundClaimed {
            round_id: round.round_id,
            player: sender,
            refund_amount: round.entry_fee,
        });

        refund_coin
    }

    /// End the round and determine winner.
    /// Only the round admin can end it.
    public fun end_round(
        round: &mut Round,
        price_end: u64,
        clock: &Clock,
        ctx: &tx_context::TxContext
    ) {
        assert!(round.status.is_active, ERR_ROUND_NOT_ACTIVE);
        assert!(clock::timestamp_ms(clock) >= round.end_time, ERR_ROUND_NOT_ENDED);
        assert!(price_end > 0, ERR_INVALID_PRICE);
        assert!(round.total_participants >= round.min_participants, ERR_INSUFFICIENT_PARTICIPANTS);


        round.price_end = price_end;
        round.status.is_active = false;
        round.status.is_ended = true;

        if (price_end > round.price_start) {
            round.winner_direction = 1; // UP wins
        } else if (price_end < round.price_start) {
            round.winner_direction = 2; // DOWN wins
        } else {
            round.winner_direction = 0; // Tie
        };

        event::emit(RoundEnded {
            round_id: round.round_id,
            price_start: round.price_start,
            price_end: round.price_end,
            winner_direction: round.winner_direction,
        });
    }

    /// Add yield to the round (simulates staking rewards).
    /// 
    /// MIRROR ACCOUNTING: In the cross-chain MVP, tokens added here act as 
    /// a mirror for real yield on Base. This balances the Move contract's 
    /// logic so it can emit PrizeEvents with correct values.
    public fun add_yield(
        round: &mut Round,
        yield_amount: Coin<USDT>,
        ctx: &tx_context::TxContext
    ) {
        // Hardening: Only round admin can add yield/booster
        assert!(tx_context::sender(ctx) == round.admin, ERR_UNAUTHORIZED);
        // Hardening: Cannot add yield after round is settled/locked
        assert!(!round.status.is_settled, ERR_ROUND_ALREADY_SETTLED);

        let yield_balance = coin::into_balance(yield_amount);
        balance::join(&mut round.yield_pool, yield_balance);
    }

    /// Settle the round: merge all funds into total_pool, take admin fee,
    /// and lock final_prize_pool for top-3 distribution (50/30/20).
    public fun settle_round(
        round: &mut Round,
        treasury: &mut Treasury,
        ctx: &tx_context::TxContext
    ) {
        assert!(round.status.is_ended, ERR_ROUND_NOT_ENDED);
        assert!(!round.status.is_settled, ERR_ROUND_ALREADY_SETTLED);

        // Hardening: Winners must be finalized (lock_winners called) before settling
        assert!(round.winners_locked, ERR_WINNERS_NOT_LOCKED);

        // Merge any yield_pool into total_pool so all funds are in one place
        let yield_amount = balance::value(&round.yield_pool);
        if (yield_amount > 0) {
            let yield_bal = balance::split(&mut round.yield_pool, yield_amount);
            balance::join(&mut round.total_pool, yield_bal);
        };

        let total_pool_value = balance::value(&round.total_pool);

        // Calculate admin fee (10%) from entire pool
        let admin_fee = (total_pool_value * ADMIN_FEE_BPS) / BPS_DENOMINATOR;
        let net_prize_pool = total_pool_value - admin_fee;

        // LOCK prize pool for deterministic claim
        round.final_prize_pool = net_prize_pool;

        // Transfer admin fee to treasury
        let admin_fee_balance = balance::split(&mut round.total_pool, admin_fee);
        balance::join(&mut treasury.balance, admin_fee_balance);

        round.status.is_settled = true;

        event::emit(RoundSettled {
            round_id: round.round_id,
            total_yield: total_pool_value,
            admin_fee,
            prize_pool: net_prize_pool,
        });
    }

    /// Lock the winner_ranks table — no further calls to set_winner_rank are possible.
    /// Must be called AFTER all set_winner_rank calls and BEFORE settle_round.
    /// Only round admin can call this.
    public fun lock_winners(
        round: &mut Round,
        ctx: &tx_context::TxContext
    ) {
        // Idempotent: calling twice is a no-op
        if (!round.winners_locked) {
            round.winners_locked = true;
        };
    }

    /// Register the rank of a top-3 winner into the Round's internal state.
    /// Only callable BEFORE lock_winners() is called.
    /// Only the round admin can call this.
    /// rank must be 1, 2, or 3.
    public fun set_winner_rank(
        round: &mut Round,
        player: address,
        rank: u8,
        ctx: &tx_context::TxContext
    ) {

        // Ranks are LOCKED after lock_winners() is called — no further changes allowed
        assert!(!round.winners_locked, ERR_WINNERS_LOCKED);
        // Can only set before round is settled
        assert!(!round.status.is_settled, ERR_ROUND_ALREADY_SETTLED);
        // Player must be a participant
        assert!(table::contains(&round.participants, player), ERR_NOT_PARTICIPANT);
        // FIX: use ERR_INVALID_RANK (not ERR_INVALID_DIRECTION) for invalid rank param
        assert!(rank >= 1 && rank <= 3, ERR_INVALID_RANK);

        // Set rank; allow overwrite only before lock
        if (table::contains(&round.winner_ranks, player)) {
            *table::borrow_mut(&mut round.winner_ranks, player) = rank;
        } else {
            table::add(&mut round.winner_ranks, player, rank);
        };
    }

    /// View: is the winner list locked?
    public fun are_winners_locked(round: &Round): bool {
        round.winners_locked
    }

    // ==================== Player Functions ====================

    /// Make a prediction (UP or DOWN)
    public fun make_prediction(
        round: &mut Round,
        direction: u8, // 1 = UP, 2 = DOWN
        payment: Coin<USDT>,
        clock: &Clock,
        ctx: &mut tx_context::TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);

        // Validate
        assert!(!round.status.is_cancelled, ERR_ROUND_CANCELLED);
        assert!(round.status.is_active, ERR_ROUND_NOT_ACTIVE);
        assert!(current_time >= round.start_time && current_time < round.end_time, ERR_ROUND_NOT_ACTIVE);
        // Requirement: Prediction must be made before the lock period (e.g., first 2 mins)
        assert!(current_time < round.prediction_end_time, ERR_PREDICTION_LOCKED);
        assert!(coin::value(&payment) == round.entry_fee, ERR_INVALID_ENTRY_FEE);
        assert!(!table::contains(&round.participants, sender), ERR_ALREADY_PREDICTED);
        assert!(direction == 1 || direction == 2, ERR_INVALID_DIRECTION);

        // Add participant
        table::add(&mut round.participants, sender, true);
        round.total_participants = round.total_participants + 1;

        // Update counts
        if (direction == 1) {
            round.up_count = round.up_count + 1;
        } else {
            round.down_count = round.down_count + 1;
        };

        // Lock payment in pool (principal)
        let payment_balance = coin::into_balance(payment);
        balance::join(&mut round.total_pool, payment_balance);

        event::emit(PredictionMade {
            round_id: round.round_id,
            player: sender,
            direction,
            amount: round.entry_fee,
            timestamp: current_time,
        });
    }

    /// Claim reward: top 3 ranked players get 50/30/20% of total pool.
    /// Non-top-3 participants get nothing.
    /// Rank is read from the Round's internal winner_ranks Table — no external rank input.
    public fun claim(
        round: &mut Round,
        ctx: &mut tx_context::TxContext
    ): Coin<USDT> {
        assert!(round.status.is_settled, ERR_NOT_SETTLED);

        let sender = tx_context::sender(ctx);
        // Security: Only actual participants can claim
        assert!(table::contains(&round.participants, sender), ERR_NOT_PARTICIPANT);
        // Double-claim protection
        assert!(!table::contains(&round.reward_claimed, sender), ERR_ALREADY_CLAIMED);

        table::add(&mut round.reward_claimed, sender, true);

        // Read rank from INTERNAL state — cannot be manipulated by caller
        let rank = if (table::contains(&round.winner_ranks, sender)) {
            *table::borrow(&round.winner_ranks, sender)
        } else {
            0 // Not a ranked winner
        };

        let reward_bps = if (rank == 1) {
            RANK1_REWARD_BPS  // 50%
        } else if (rank == 2) {
            RANK2_REWARD_BPS  // 30%
        } else if (rank == 3) {
            RANK3_REWARD_BPS  // 20%
        } else {
            0 // Non-top-3: no reward
        };

        // Deterministic: Calculate from LOCKED final_prize_pool
        let payout_amount = if (reward_bps > 0) {
            (round.final_prize_pool * reward_bps) / BPS_DENOMINATOR
        } else {
            0
        };

        // Withdraw payout from total_pool (all funds merged there during settle)
        let payout = if (payout_amount > 0) {
            coin::from_balance(balance::split(&mut round.total_pool, payout_amount), ctx)
        } else {
            coin::from_balance(balance::zero<USDT>(), ctx)
        };

        event::emit(RewardClaimed {
            round_id: round.round_id,
            player: sender,
            principal: 0,
            reward: payout_amount,
        });

        payout
    }

    // ==================== View Functions ====================

    public fun get_round_info(round: &Round): (u64, u64, u64, u64, u64, u8) {
        (
            round.round_id,
            round.start_time,
            round.end_time,
            round.price_start,
            round.price_end,
            round.winner_direction
        )
    }

    public fun get_round_stats(round: &Round): (u64, u64, u64, u64) {
        (
            round.up_count,
            round.down_count,
            round.total_participants,
            balance::value(&round.total_pool)
        )
    }

    /// Returns the entry fee for this round (used by game_controller for prize calculation)
    public fun get_entry_fee(round: &Round): u64 {
        round.entry_fee
    }

    /// Returns true if the address has registered for the round
    public fun is_participant(round: &Round, player: address): bool {
        table::contains(&round.participants, player)
    }

    /// Returns the combined status of a user for UI mapping
    /// (registered, claimed_reward, refunded)
    public fun get_user_status(round: &Round, player: address): (bool, bool, bool) {
        let registered = table::contains(&round.participants, player);
        let claimed = table::contains(&round.reward_claimed, player);
        let refunded = table::contains(&round.refunded, player);
        (registered, claimed, refunded)
    }

    /// Combined status view for the tournament
    public fun get_full_status(round: &Round): (bool, bool, bool, bool) {
        (
            round.status.is_active,
            round.status.is_ended,
            round.status.is_settled,
            round.status.is_cancelled
        )
    }

    public fun is_settled(round: &Round): bool {
        round.status.is_settled
    }

    public fun get_winner_direction(round: &Round): u8 {
        round.winner_direction
    }

    /// Returns true if the round has been cancelled
    public fun is_cancelled(round: &Round): bool {
        round.status.is_cancelled
    }

    /// Returns true if the player has already claimed their refund
    public fun has_claimed_refund(round: &Round, player: address): bool {
        table::contains(&round.refunded, player)
    }

    // ==================== Treasury Functions ====================

    public fun withdraw_treasury(
        treasury: &mut Treasury,
        amount: u64,
        ctx: &mut tx_context::TxContext
    ): Coin<USDT> {
        assert!(tx_context::sender(ctx) == treasury.admin, ERR_UNAUTHORIZED);
        let withdrawn = balance::split(&mut treasury.balance, amount);
        coin::from_balance(withdrawn, ctx)
    }

    // ==================== Test-Only Functions ====================

    #[test_only]
    public fun test_init(ctx: &mut tx_context::TxContext) {
        init(ctx);
    }



    #[test_only]
    public fun test_create_treasury(admin: address, ctx: &mut tx_context::TxContext): Treasury {
        Treasury {
            id: object::new(ctx),
            balance: balance::zero(),
            admin,
        }
    }

    #[test_only]
    public fun test_is_cancelled(round: &Round): bool {
        round.status.is_cancelled
    }
}
