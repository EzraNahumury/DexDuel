#[test_only]
module sc_dex_duel::lock_period_tests {
    use one::test_scenario::{Self as ts, Scenario};
    use one::coin::{Self, Coin};
    use sc_dex_duel::usdt::USDT;
    use one::clock::{Self, Clock};
    use sc_dex_duel::game_round::{Self, Round};
    use sc_dex_duel::game_controller::{Self, GameSession};

    // ==================== Test Constants ====================

    const ADMIN: address = @0xAD;
    const PLAYER: address = @0xA1;

    const ROUND_ID: u64 = 1;
    const SEASON_ID: u64 = 1;
    const ENTRY_FEE: u64 = 1_000_000_000; // 1 USDT
    const START_TIME: u64 = 1000000;
    const END_TIME: u64 = 1300000; // 5 minutes later
    const EARLY_WINDOW: u64 = 1; // 1 minute
    const MAX_WINDOW: u64 = 2; // 2 minutes (Lock period)
    const MIN_PARTICIPANTS: u64 = 1;

    const DIRECTION_UP: u8 = 1;
    const PRICE_START: u64 = 67000_00000000;

    // Error code from game_round.move
    const ERR_PREDICTION_LOCKED: u64 = 17;

    // ==================== Helper Functions ====================

    fun setup_test(): Scenario {
        let mut scenario = ts::begin(ADMIN);
        game_round::test_init(ts::ctx(&mut scenario));
        sc_dex_duel::usdt::init_for_testing(ts::ctx(&mut scenario));
        scenario
    }

    fun mint_usdt(scenario: &mut Scenario, amount: u64): Coin<USDT> {
        coin::mint_for_testing<USDT>(amount, ts::ctx(scenario))
    }

    // ==================== Lock Period Tests ====================

    #[test]
    fun test_prediction_before_lock_succeeds() {
        let mut scenario = setup_test();

        // 1. Create tournament and game session (ADMIN is the round owner)
        ts::next_tx(&mut scenario, ADMIN);
        {
            game_controller::initialize_tournament(SEASON_ID, ts::ctx(&mut scenario));

            game_controller::create_game_session(
                ROUND_ID,
                SEASON_ID,
                b"BTC",
                START_TIME,
                END_TIME,
                ENTRY_FEE,
                MIN_PARTICIPANTS,
                EARLY_WINDOW,
                MAX_WINDOW,
                ts::ctx(&mut scenario)
            );
        };

        // 2. Start round (ADMIN is the round.admin, so this succeeds)
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, START_TIME);

            game_controller::start_game(&mut round, PRICE_START, &clock, ts::ctx(&mut scenario));

            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        // 3. Player predicts at 1 minute (Before Lock at 2 min)
        ts::next_tx(&mut scenario, PLAYER);
        {
            let session = ts::take_shared<GameSession>(&scenario);
            let mut round = ts::take_shared<Round>(&scenario);
            let mut prediction_registry = ts::take_shared<sc_dex_duel::prediction::PredictionRegistry>(&scenario);

            // 1 minute after start (within early window, before lock)
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, START_TIME + 60000);

            let payment = mint_usdt(&mut scenario, ENTRY_FEE);

            game_controller::join_game(
                &session,
                &mut round,
                &mut prediction_registry,
                DIRECTION_UP,
                payment,
                &clock,
                ts::ctx(&mut scenario)
            );

            assert!(game_round::is_participant(&round, PLAYER), 0);

            clock::destroy_for_testing(clock);
            ts::return_shared(session);
            ts::return_shared(round);
            ts::return_shared(prediction_registry);
        };

        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = 17, location = sc_dex_duel::game_round)]
    fun test_prediction_after_lock_fails() {
        let mut scenario = setup_test();

        // 1. Create session with 2 min lock window
        ts::next_tx(&mut scenario, ADMIN);
        {
            game_controller::create_game_session(
                ROUND_ID,
                SEASON_ID,
                b"BTC",
                START_TIME,
                END_TIME,
                ENTRY_FEE,
                MIN_PARTICIPANTS,
                EARLY_WINDOW,
                MAX_WINDOW,
                ts::ctx(&mut scenario)
            );
        };

        // 2. Start round
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut round = ts::take_shared<Round>(&scenario);
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, START_TIME);
            game_controller::start_game(&mut round, PRICE_START, &clock, ts::ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            ts::return_shared(round);
        };

        // 3. Player tries to predict at 3 minutes (After Lock at 2 min) — should FAIL
        ts::next_tx(&mut scenario, PLAYER);
        {
            let session = ts::take_shared<GameSession>(&scenario);
            let mut round = ts::take_shared<Round>(&scenario);
            let mut prediction_registry = ts::take_shared<sc_dex_duel::prediction::PredictionRegistry>(&scenario);

            // 3 minutes after start (Lock is at 2 mins)
            let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
            clock::set_for_testing(&mut clock, START_TIME + 180000);

            let payment = mint_usdt(&mut scenario, ENTRY_FEE);

            // This MUST fail with ERR_PREDICTION_LOCKED
            game_controller::join_game(
                &session,
                &mut round,
                &mut prediction_registry,
                DIRECTION_UP,
                payment,
                &clock,
                ts::ctx(&mut scenario)
            );

            clock::destroy_for_testing(clock);
            ts::return_shared(session);
            ts::return_shared(round);
            ts::return_shared(prediction_registry);
        };

        ts::end(scenario);
    }
}
