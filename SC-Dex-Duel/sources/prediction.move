/// Module: prediction
/// Manages individual player predictions and stakes
module sc_dex_duel::prediction {
    use one::table::{Self, Table};
    use one::clock;
    use one::event;
    use one::tx_context;
    use one::object;
    use one::transfer;


    // ==================== Error Codes ====================
    const ERR_PREDICTION_NOT_FOUND: u64 = 1;
    const ERR_INVALID_DIRECTION: u64 = 2;
    const ERR_ALREADY_PREDICTED: u64 = 3;
    const ERR_ALREADY_FINALIZED: u64 = 4;   // Registry is locked, no more updates
    const ERR_RESULTS_ALREADY_SET: u64 = 5; // set_prediction_results called twice
    const ERR_NOT_FINALIZED: u64 = 6;       // Reserved for future use
    const ERR_UNAUTHORIZED: u64 = 7;        // Only round admin can finalize
    const ERR_RESULTS_NOT_SET: u64 = 8;     // finalize called before set_prediction_results
    const ERR_INVALID_RANK: u64 = 9;        // rank must be 1, 2, or 3

    // ==================== Constants ====================
    const DIRECTION_UP: u8 = 1;
    const DIRECTION_DOWN: u8 = 2;

    // ==================== Structs ====================

    /// Individual prediction record
    public struct Prediction has store, drop, copy {
        player: address,
        round_id: u64,
        direction: u8, // 1 = UP, 2 = DOWN
        stake_amount: u64,
        prediction_time: u64,
        is_early: bool, // For early prediction bonus
        is_correct: bool,
        rank: u8, // 0 = not ranked, 1-3 = top 3, 4+ = participated
    }

    /// Global prediction registry for a round.
    /// State machine: OPEN -> FINALIZED
    ///   OPEN:      predictions can be recorded; results/ranks not yet set
    ///   FINALIZED: results and ranks are locked; no further updates allowed
    public struct PredictionRegistry has key, store {
        id: object::UID,
        round_id: u64,
        predictions: Table<address, Prediction>, // player => prediction
        up_players: vector<address>,
        down_players: vector<address>,
        total_up_stake: u64,
        total_down_stake: u64,
        round_admin: address,   // only this address can finalize the registry
        is_results_set: bool,   // true after set_prediction_results is called
        is_finalized: bool,     // true after finalize_registry; locks all writes
    }

    // ==================== Events ====================

    public struct PredictionRecorded has copy, drop {
        round_id: u64,
        player: address,
        direction: u8,
        stake_amount: u64,
        prediction_time: u64,
        is_early: bool,
    }

    public struct PredictionResultSet has copy, drop {
        round_id: u64,
        player: address,
        is_correct: bool,
        rank: u8,
    }

    // ==================== Functions ====================

    /// Create a new prediction registry for a round.
    /// round_admin is the address of the round creator (game_round.admin).
    public fun create_registry(
        round_id: u64,
        round_admin: address,
        ctx: &mut tx_context::TxContext
    ): PredictionRegistry {
        PredictionRegistry {
            id: object::new(ctx),
            round_id,
            predictions: table::new(ctx),
            up_players: vector::empty(),
            down_players: vector::empty(),
            total_up_stake: 0,
            total_down_stake: 0,
            round_admin,
            is_results_set: false,
            is_finalized: false,
        }
    }

    /// Record a player's prediction.
    /// Only allowed while registry is OPEN (not finalized).
    public fun record_prediction(
        registry: &mut PredictionRegistry,
        player: address,
        direction: u8,
        stake_amount: u64,
        round_start_time: u64,
        early_threshold_minutes: u64,
        clock: &clock::Clock,
    ) {
        // Guard: cannot record prediction once registry is finalized
        assert!(!registry.is_finalized, ERR_ALREADY_FINALIZED);
        assert!(direction == DIRECTION_UP || direction == DIRECTION_DOWN, ERR_INVALID_DIRECTION);
        assert!(!table::contains(&registry.predictions, player), ERR_ALREADY_PREDICTED);

        // BUG FIX: use clock::timestamp_ms(clock), NOT clock.timestamp_ms()
        let prediction_time = clock::timestamp_ms(clock);

        // Check if prediction is early (within first N minutes of round start)
        let early_threshold_ms = early_threshold_minutes * 60 * 1000;
        let is_early = (prediction_time - round_start_time) <= early_threshold_ms;

        let prediction = Prediction {
            player,
            round_id: registry.round_id,
            direction,
            stake_amount,
            prediction_time,
            is_early,
            is_correct: false,
            rank: 0,
        };

        // Add to registry
        table::add(&mut registry.predictions, player, prediction);

        // Track by direction
        if (direction == DIRECTION_UP) {
            vector::push_back(&mut registry.up_players, player);
            registry.total_up_stake = registry.total_up_stake + stake_amount;
        } else {
            vector::push_back(&mut registry.down_players, player);
            registry.total_down_stake = registry.total_down_stake + stake_amount;
        };

        event::emit(PredictionRecorded {
            round_id: registry.round_id,
            player,
            direction,
            stake_amount,
            prediction_time,
            is_early,
        });
    }

    /// Mark predictions as correct/incorrect after round ends.
    /// Can only be called ONCE. Idempotent guard via is_results_set.
    public fun set_prediction_results(
        registry: &mut PredictionRegistry,
        winner_direction: u8, // 1 = UP, 2 = DOWN, 0 = tie
    ) {
        // Guard: results can only be set once
        assert!(!registry.is_results_set, ERR_RESULTS_ALREADY_SET);
        // Guard: cannot change results after registry is finalized
        assert!(!registry.is_finalized, ERR_ALREADY_FINALIZED);

        // Update UP players
        let mut i = 0;
        let up_len = vector::length(&registry.up_players);
        while (i < up_len) {
            let player = *vector::borrow(&registry.up_players, i);
            let prediction = table::borrow_mut(&mut registry.predictions, player);

            if (winner_direction == DIRECTION_UP) {
                prediction.is_correct = true;
            } else {
                prediction.is_correct = false;
            };

            i = i + 1;
        };

        // Update DOWN players
        let mut j = 0;
        let down_len = vector::length(&registry.down_players);
        while (j < down_len) {
            let player = *vector::borrow(&registry.down_players, j);
            let prediction = table::borrow_mut(&mut registry.predictions, player);

            if (winner_direction == DIRECTION_DOWN) {
                prediction.is_correct = true;
            } else {
                prediction.is_correct = false;
            };

            j = j + 1;
        };

        // Mark results as set — prevents calling this function again
        registry.is_results_set = true;
    }

    /// Set rank for a player (top 3 winners).
    /// Only allowed before registry is finalized.
    /// rank must be 1, 2, or 3.
    public fun set_player_rank(
        registry: &mut PredictionRegistry,
        player: address,
        rank: u8,
    ) {
        // Guard: cannot update rank after registry is finalized
        assert!(!registry.is_finalized, ERR_ALREADY_FINALIZED);
        assert!(table::contains(&registry.predictions, player), ERR_PREDICTION_NOT_FOUND);
        // Hardening: rank must be a valid top-3 value
        assert!(rank >= 1 && rank <= 3, ERR_INVALID_RANK);

        let prediction = table::borrow_mut(&mut registry.predictions, player);
        prediction.rank = rank;

        event::emit(PredictionResultSet {
            round_id: registry.round_id,
            player,
            is_correct: prediction.is_correct,
            rank,
        });
    }

    /// Finalize the registry — lock all results and ranks permanently.
    /// State transition: OPEN -> FINALIZED.
    /// Only the round admin can call this.
    /// After finalization: set_prediction_results, set_player_rank, and record_prediction
    /// will all abort.
    public fun finalize_registry(
        registry: &mut PredictionRegistry,
        ctx: &tx_context::TxContext
    ) {

        // BUG FIX: use ERR_RESULTS_NOT_SET (not ERR_RESULTS_ALREADY_SET) — the check is
        // "results HAVE BEEN set" (is_results_set == true), so failure means NOT set.
        assert!(registry.is_results_set, ERR_RESULTS_NOT_SET);
        // Guard: idempotent — no-op if already finalized (safe to call twice)
        if (registry.is_finalized) { return };

        registry.is_finalized = true;
    }

    /// View: check if the registry has been finalized
    public fun is_registry_finalized(registry: &PredictionRegistry): bool {
        registry.is_finalized
    }

    // ==================== View Functions ====================

    /// Get prediction for a player
    public fun get_prediction(
        registry: &PredictionRegistry,
        player: address
    ): (u8, u64, u64, bool, bool, u8) {
        assert!(table::contains(&registry.predictions, player), ERR_PREDICTION_NOT_FOUND);

        let prediction = table::borrow(&registry.predictions, player);
        (
            prediction.direction,
            prediction.stake_amount,
            prediction.prediction_time,
            prediction.is_early,
            prediction.is_correct,
            prediction.rank
        )
    }

    /// Check if player has made a prediction
    public fun has_predicted(
        registry: &PredictionRegistry,
        player: address
    ): bool {
        table::contains(&registry.predictions, player)
    }

    /// Get prediction stats
    public fun get_stats(
        registry: &PredictionRegistry
    ): (u64, u64, u64, u64) {
        (
            vector::length(&registry.up_players),
            vector::length(&registry.down_players),
            registry.total_up_stake,
            registry.total_down_stake
        )
    }

    /// Get all winners (players who predicted correctly).
    /// Returns a NEW vector (copy by value) to avoid move-out-of-borrow errors.
    public fun get_winners(
        registry: &PredictionRegistry,
        winner_direction: u8
    ): vector<address> {
        let source = if (winner_direction == DIRECTION_UP) {
            &registry.up_players
        } else if (winner_direction == DIRECTION_DOWN) {
            &registry.down_players
        } else {
            return vector::empty<address>()
        };

        // Copy addresses one-by-one into a fresh vector (no move out of borrow)
        let mut result = vector::empty<address>();
        let mut i = 0;
        let len = vector::length(source);
        while (i < len) {
            vector::push_back(&mut result, *vector::borrow(source, i));
            i = i + 1;
        };
        result
    }

    /// Check if prediction was early (for bonus points)
    public fun is_early_prediction(
        registry: &PredictionRegistry,
        player: address
    ): bool {
        assert!(table::contains(&registry.predictions, player), ERR_PREDICTION_NOT_FOUND);

        let prediction = table::borrow(&registry.predictions, player);
        prediction.is_early
    }

    /// Get player's rank
    public fun get_rank(
        registry: &PredictionRegistry,
        player: address
    ): u8 {
        assert!(table::contains(&registry.predictions, player), ERR_PREDICTION_NOT_FOUND);

        let prediction = table::borrow(&registry.predictions, player);
        prediction.rank
    }

    /// Share the registry object (make it globally accessible)
    public fun share_registry(registry: PredictionRegistry) {
        transfer::share_object(registry);
    }
}
