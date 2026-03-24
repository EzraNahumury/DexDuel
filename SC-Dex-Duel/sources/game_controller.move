/// Module: game_controller
/// Integrates game_round, prediction, and leaderboard modules
/// Provides complete game flow and coordination
module sc_dex_duel::game_controller {
    use sc_dex_duel::usdt::USDT;
    use sc_dex_duel::game_round::{Self, Round};
    use sc_dex_duel::prediction::{Self, PredictionRegistry};
    use sc_dex_duel::leaderboard::{Self, Leaderboard};
    use one::coin::{Self, Coin};
    use one::clock;
    use one::event;
    use one::object;
    use one::tx_context;
    use one::transfer;


    // ==================== Error Codes ====================
    const ERR_INVALID_TOP3: u64 = 1; // top3_players has more than 3 entries or contains duplicates

    // ==================== Structs ====================

    /// Game session that links round, predictions, and leaderboard
    public struct GameSession has key, store {
        id: object::UID,
        round_id: u64,
        season_id: u64,
        early_prediction_window_minutes: u64, // e.g., 1 minute for early bonus
        max_prediction_window_minutes: u64,   // e.g., 2 minutes for lock period
    }

    // ==================== Events ====================

    public struct GameSessionCreated has copy, drop {
        round_id: u64,
        season_id: u64,
        start_time: u64,
        end_time: u64,
    }

    public struct PlayerJoinedGame has copy, drop {
        round_id: u64,
        player: address,
        direction: u8,
        amount: u64,
    }

    public struct GameCompleted has copy, drop {
        round_id: u64,
        winner_direction: u8,
        total_participants: u64,
    }

    public struct TournamentCancelled has copy, drop {
        round_id: u64,
        season_id: u64,
        cancelled_by: address,
        total_participants: u64,
        total_refund_pool: u64,
    }

    // ==================== Relayer Events ====================
    // These events are consumed by the off-chain Relayer bridge (OneChain -> Base).
    // Amount is in Mock USDT units (decimals = 6).

    /// Emitted when a user successfully joins a round and their funds are locked.
    /// Relayer uses this to mirror-deposit on the Base Vault.
    public struct JoinEvent has copy, drop {
        tournament_id: u64, // season_id
        round_id: u64,
        user: address,
        amount: u64, // in Mock USDT units (decimals 6)
        ts: u64,     // block timestamp in ms
    }

    /// Emitted per user during settle: principal returned (for all participants).
    /// Relayer uses this to trigger Base Vault refund.
    public struct RefundEvent has copy, drop {
        tournament_id: u64,
        round_id: u64,
        user: address,
        principal_amount: u64, // in Mock USDT units (decimals 6)
        ts: u64,
    }

    /// Emitted per winner during settle: prize payout (only for rank 1-3).
    /// Relayer uses this to trigger Base Vault prize transfer.
    public struct PrizeEvent has copy, drop {
        tournament_id: u64,
        round_id: u64,
        user: address,
        prize_amount: u64, // in Mock USDT units (decimals 6)
        ts: u64,
    }

    // ==================== Admin Functions ====================

    /// Initialize a new tournament/season leaderboard.
    /// Anyone can create a tournament — they become the tournament owner.
    public fun initialize_tournament(
        season_id: u64,
        ctx: &mut tx_context::TxContext
    ) {
        let leaderboard = leaderboard::create_leaderboard(season_id, ctx);
        leaderboard::share_leaderboard(leaderboard);
    }

    /// Create a game round session.
    /// Anyone can create — the caller becomes the round owner (admin).
    public fun create_game_session(
        round_id: u64,
        season_id: u64,
        coin_symbol: vector<u8>,
        start_time: u64,
        end_time: u64,
        entry_fee: u64,
        min_participants: u64,
        early_prediction_window_minutes: u64,
        max_prediction_window_minutes: u64,
        ctx: &mut tx_context::TxContext
    ) {
        let prediction_end_time = start_time + (max_prediction_window_minutes * 60 * 1000);

        game_round::create_round(
            round_id,
            coin_symbol,
            start_time,
            end_time,
            prediction_end_time,
            entry_fee,
            min_participants,
            ctx
        );

        let prediction_registry = prediction::create_registry(round_id, tx_context::sender(ctx), ctx);
        prediction::share_registry(prediction_registry);

        let session = GameSession {
            id: object::new(ctx),
            round_id,
            season_id,
            early_prediction_window_minutes,
            max_prediction_window_minutes,
        };

        event::emit(GameSessionCreated {
            round_id,
            season_id,
            start_time,
            end_time,
        });

        transfer::share_object(session);
    }

    /// Cancel an upcoming or in-progress tournament.
    /// Only the round owner (creator) can cancel.
    public fun cancel_tournament(
        session: &GameSession,
        round: &mut Round,
        clock: &clock::Clock,
        ctx: &tx_context::TxContext,
    ) {
        game_round::cancel_round(round, clock, ctx);

        let (_, _, _, _, _, _) = game_round::get_round_info(round);
        let (_, _, total_participants, total_refund_pool) = game_round::get_round_stats(round);

        event::emit(TournamentCancelled {
            round_id: session.round_id,
            season_id: session.season_id,
            cancelled_by: tx_context::sender(ctx),
            total_participants,
            total_refund_pool,
        });
    }

    /// Called by each registered player after the tournament has been cancelled.
    public fun claim_tournament_refund(
        round: &mut Round,
        ctx: &mut tx_context::TxContext,
    ) {
        let refund = game_round::claim_refund(round, ctx);
        // Transfer the refund coin directly to the player
        transfer::public_transfer(refund, tx_context::sender(ctx));
    }

    /// Start the game round
    public fun start_game(
        round: &mut Round,
        price_start: u64,
        clock: &clock::Clock,
        ctx: &tx_context::TxContext
    ) {
        game_round::start_round(round, price_start, clock, ctx);
    }

    /// Complete the game (end round, set results, update leaderboard)
    public fun complete_game(
        session: &GameSession,
        round: &mut Round,
        prediction_registry: &mut PredictionRegistry,
        leaderboard: &mut Leaderboard,
        price_end: u64,
        top3_players: vector<address>, // Top 3 winners in order [rank1, rank2, rank3]
        clock: &clock::Clock,
        ctx: &mut tx_context::TxContext
    ) {
        // --- Hardening D: Validate top3 uniqueness ---
        let top3_len = vector::length(&top3_players);
        // No more than 3 winners
        assert!(top3_len <= 3, ERR_INVALID_TOP3);

        // No duplicate addresses in top3 (rank1 != rank2 != rank3 != rank1)
        if (top3_len >= 2) {
            let addr0 = *vector::borrow(&top3_players, 0);
            let addr1 = *vector::borrow(&top3_players, 1);
            assert!(addr0 != addr1, ERR_INVALID_TOP3); // rank1 and rank2 must be different
            if (top3_len == 3) {
                let addr2 = *vector::borrow(&top3_players, 2);
                assert!(addr1 != addr2, ERR_INVALID_TOP3); // rank2 and rank3 must be different
                assert!(addr0 != addr2, ERR_INVALID_TOP3); // rank1 and rank3 must be different
            };
        };

        // End the round
        game_round::end_round(round, price_end, clock, ctx);

        let winner_direction = game_round::get_winner_direction(round);

        // Set prediction results
        prediction::set_prediction_results(prediction_registry, winner_direction);

        // Register top-3 winner ranks into Round's internal state
        // This is the authoritative source of truth for claim() — no external rank input needed
        if (top3_len >= 1) {
            game_round::set_winner_rank(round, *vector::borrow(&top3_players, 0), 1, ctx);
        };
        if (top3_len >= 2) {
            game_round::set_winner_rank(round, *vector::borrow(&top3_players, 1), 2, ctx);
        };
        if (top3_len >= 3) {
            game_round::set_winner_rank(round, *vector::borrow(&top3_players, 2), 3, ctx);
        };

        // HARDENING C: Lock winner_ranks — no further set_winner_rank calls possible.
        // settle_round will fail if this is not called first.
        game_round::lock_winners(round, ctx);

        // Process rankings and update leaderboard
        process_rankings(
            session,
            prediction_registry,
            leaderboard,
            winner_direction,
            top3_players
        );

        // FINALIZE: Lock the prediction registry — no more rank/result updates possible
        // State transition: OPEN -> FINALIZED
        prediction::finalize_registry(prediction_registry, ctx);

        let (_, _, _, total_participants) = game_round::get_round_stats(round);

        event::emit(GameCompleted {
            round_id: session.round_id,
            winner_direction,
            total_participants,
        });
    }

    /// Add yield to a round (Mirror Accounting)
    public fun add_round_yield(
        round: &mut Round,
        yield_amount: Coin<USDT>,
        ctx: &tx_context::TxContext
    ) {
        game_round::add_yield(round, yield_amount, ctx);
    }

    /// Settle the game and lock prize pool
    public fun settle_game(
        round: &mut Round,
        treasury: &mut game_round::Treasury,
        ctx: &tx_context::TxContext
    ) {
        game_round::settle_round(round, treasury, ctx);
    }

    /// Helper function to process rankings and update leaderboard
    fun process_rankings(
        session: &GameSession,
        prediction_registry: &mut PredictionRegistry,
        leaderboard: &mut Leaderboard,
        winner_direction: u8,
        top3_players: vector<address>,
    ) {
        // Set ranks for top 3
        let top3_len = vector::length(&top3_players);

        if (top3_len >= 1) {
            let rank1_player = *vector::borrow(&top3_players, 0);
            prediction::set_player_rank(prediction_registry, rank1_player, 1);

            let (_, _, _, is_early, _, _) = prediction::get_prediction(prediction_registry, rank1_player);
            leaderboard::record_round_result(
                leaderboard,
                rank1_player,
                session.round_id,
                true,
                is_early
            );
        };

        if (top3_len >= 2) {
            let rank2_player = *vector::borrow(&top3_players, 1);
            prediction::set_player_rank(prediction_registry, rank2_player, 2);

            let (_, _, _, is_early, _, _) = prediction::get_prediction(prediction_registry, rank2_player);
            leaderboard::record_round_result(
                leaderboard,
                rank2_player,
                session.round_id,
                true,
                is_early
            );
        };

        if (top3_len >= 3) {
            let rank3_player = *vector::borrow(&top3_players, 2);
            prediction::set_player_rank(prediction_registry, rank3_player, 3);

            let (_, _, _, is_early, _, _) = prediction::get_prediction(prediction_registry, rank3_player);
            leaderboard::record_round_result(
                leaderboard,
                rank3_player,
                session.round_id,
                true,
                is_early
            );
        };

        // Record results for all other winners (not in top 3)
        let winners = prediction::get_winners(prediction_registry, winner_direction);
        let mut i = 0;
        let winners_len = vector::length(&winners);

        while (i < winners_len) {
            let player = *vector::borrow(&winners, i);

            // Skip if already processed in top 3
            let is_top3 = (
                (top3_len >= 1 && player == *vector::borrow(&top3_players, 0)) ||
                (top3_len >= 2 && player == *vector::borrow(&top3_players, 1)) ||
                (top3_len >= 3 && player == *vector::borrow(&top3_players, 2))
            );

            if (!is_top3) {
                let (_, _, _, is_early, _, _) = prediction::get_prediction(prediction_registry, player);
                leaderboard::record_round_result(
                    leaderboard,
                    player,
                    session.round_id,
                    true, // won but not in top 3
                    is_early
                );
            };

            i = i + 1;
        };
    }

    // ==================== Player Functions ====================

    /// Join game and make prediction
    public fun join_game(
        session: &GameSession,
        round: &mut Round,
        prediction_registry: &mut PredictionRegistry,
        direction: u8, // 1 = UP, 2 = DOWN
        payment: Coin<USDT>,
        clock: &clock::Clock,
        ctx: &mut tx_context::TxContext
    ) {
        let player = tx_context::sender(ctx);
        let amount = coin::value(&payment);
        let ts = clock::timestamp_ms(clock);

        // Use session as single source of truth for IDs (consistent across all relayer events)
        let round_id = session.round_id;
        let tournament_id = session.season_id;

        // Get start_time from round (only used for early prediction tracking, not for events)
        let (_, start_time, _, _, _, _) = game_round::get_round_info(round);

        // Make prediction on round
        game_round::make_prediction(round, direction, payment, clock, ctx);

        // Record prediction with early bonus tracking
        prediction::record_prediction(
            prediction_registry,
            player,
            direction,
            amount,
            start_time,
            session.early_prediction_window_minutes,
            clock
        );

        // Internal game event (for UI)
        event::emit(PlayerJoinedGame {
            round_id,
            player,
            direction,
            amount,
        });

        // Relayer event: mirrors deposit on Base Vault
        // Uses session.round_id and session.season_id — single source of truth
        event::emit(JoinEvent {
            tournament_id,
            round_id,
            user: player,
            amount,
            ts,
        });
    }

    /// Claim rewards for all participants.
    /// Rank is determined internally from Round state — no rank param needed.
    public fun claim_rewards(
        session: &GameSession,
        round: &mut Round,
        clock: &clock::Clock,
        ctx: &mut tx_context::TxContext
    ): Coin<USDT> {
        let player = tx_context::sender(ctx);
        let ts = clock::timestamp_ms(clock);
        let tournament_id = session.season_id;
        let round_id = session.round_id;
        let principal = game_round::get_entry_fee(round);

        // Claim: rank is read INTERNALLY from round.winner_ranks
        // No trust on any external rank parameter
        let payout = game_round::claim(round, ctx);

        // Relayer event: principal returned (all participants)
        event::emit(RefundEvent {
            tournament_id,
            round_id,
            user: player,
            principal_amount: principal,
            ts,
        });

        // Relayer event: prize payout (only if payout > principal, i.e. ranked winner)
        let total_value = coin::value(&payout);
        let prize = if (total_value > principal) { total_value - principal } else { 0 };
        if (prize > 0) {
            event::emit(PrizeEvent {
                tournament_id,
                round_id,
                user: player,
                prize_amount: prize,
                ts,
            });
        };

        payout
    }

    // ==================== View Functions ====================

    /// Get complete game status
    public fun get_game_status(
        _session: &GameSession,
        round: &Round,
        _prediction_registry: &PredictionRegistry,
    ): (u64, u64, u64, u64, u8, u64, u64) {
        let (round_id, start_time, end_time, price_start, _price_end, winner_direction) =
            game_round::get_round_info(round);

        let (up_count, down_count, _total_participants, _) =
            game_round::get_round_stats(round);

        (
            round_id,
            start_time,
            end_time,
            price_start,
            winner_direction,
            up_count,
            down_count
        )
    }

    /// Get player's game statistics
    public fun get_player_game_stats(
        prediction_registry: &PredictionRegistry,
        leaderboard: &Leaderboard,
        player: address
    ): (u8, bool, u8, u64, u64, u64) {
        // From prediction
        let (direction, _, _, _is_early, is_correct, rank) =
            prediction::get_prediction(prediction_registry, player);

        // From leaderboard
        let (total_score, wins, _, current_streak, _, _) =
            leaderboard::get_player_stats(leaderboard, player);

        (direction, is_correct, rank, total_score, wins, current_streak)
    }
}
