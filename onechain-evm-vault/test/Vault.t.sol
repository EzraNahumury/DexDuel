// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Vault.sol";
import "./mocks/MockERC20.sol";

contract VaultTest is Test {
    Vault public vault;
    MockERC20 public token;

    address public owner = address(0x1);
    address public operator = address(0x2);
    address public userBase = address(0x3);
    bytes32 public onechainUser = keccak256("user1");

    function setUp() public {
        vm.startPrank(owner);
        token = new MockERC20("Test Token", "TEST");
        vault = new Vault(address(token), operator);
        vm.stopPrank();
    }

    // -----------------------------------------------------------------------
    // depositFor
    // -----------------------------------------------------------------------

    function test_DepositFor() public {
        uint256 amount = 1000e18;
        token.mint(operator, amount);

        vm.startPrank(operator);
        token.approve(address(vault), amount);
        vault.depositFor(onechainUser, amount);
        vm.stopPrank();

        assertEq(vault.principal(onechainUser), amount);
        assertEq(token.balanceOf(address(vault)), amount);
    }

    function test_Revert_DepositFor_ZeroAmount() public {
        vm.prank(operator);
        vm.expectRevert(Vault.ZeroAmount.selector);
        vault.depositFor(onechainUser, 0);
    }

    // -----------------------------------------------------------------------
    // refund
    // -----------------------------------------------------------------------

    function test_Refund() public {
        uint256 amount = 1000e18;
        token.mint(operator, amount);

        vm.startPrank(operator);
        token.approve(address(vault), amount);
        vault.depositFor(onechainUser, amount);
        vault.refund(onechainUser, userBase, 400e18);
        vm.stopPrank();

        assertEq(vault.principal(onechainUser), 600e18);
        assertEq(token.balanceOf(userBase), 400e18);
    }

    function test_Revert_Refund_ZeroAddress() public {
        vm.prank(operator);
        vm.expectRevert(Vault.ZeroAddress.selector);
        vault.refund(onechainUser, address(0), 100);
    }

    function test_Revert_Refund_ZeroAmount() public {
        vm.prank(operator);
        vm.expectRevert(Vault.ZeroAmount.selector);
        vault.refund(onechainUser, userBase, 0);
    }

    function test_Revert_Refund_InsufficientPrincipal() public {
        uint256 amount = 100e18;
        token.mint(operator, amount);

        vm.startPrank(operator);
        token.approve(address(vault), amount);
        vault.depositFor(onechainUser, amount);
        vm.expectRevert(Vault.InsufficientPrincipal.selector);
        vault.refund(onechainUser, userBase, 200e18);
        vm.stopPrank();
    }

    // -----------------------------------------------------------------------
    // payPrize
    // -----------------------------------------------------------------------

    function test_PayPrize() public {
        uint256 prizeAmount = 50e18;
        token.mint(address(vault), prizeAmount);

        vm.prank(operator);
        vault.payPrize(onechainUser, userBase, prizeAmount);

        assertEq(token.balanceOf(userBase), prizeAmount);
    }

    function test_Revert_PayPrize_ZeroAddress() public {
        vm.prank(operator);
        vm.expectRevert(Vault.ZeroAddress.selector);
        vault.payPrize(onechainUser, address(0), 100);
    }

    function test_Revert_PayPrize_ZeroAmount() public {
        vm.prank(operator);
        vm.expectRevert(Vault.ZeroAmount.selector);
        vault.payPrize(onechainUser, userBase, 0);
    }

    // -----------------------------------------------------------------------
    // fundBooster + payBoosterPrize
    // -----------------------------------------------------------------------

    function test_FundBoosterAndPay() public {
        uint256 boosterAmount = 500e18;
        token.mint(owner, boosterAmount);

        vm.startPrank(owner);
        token.approve(address(vault), boosterAmount);
        vault.fundBooster(boosterAmount);
        vm.stopPrank();

        assertEq(vault.boosterBalance(), boosterAmount);

        vm.prank(operator);
        vault.payBoosterPrize(onechainUser, userBase, 100e18);

        assertEq(vault.boosterBalance(), 400e18);
        assertEq(token.balanceOf(userBase), 100e18);
    }

    function test_Revert_PayBoosterPrize_ZeroAddress() public {
        vm.prank(operator);
        vm.expectRevert(Vault.ZeroAddress.selector);
        vault.payBoosterPrize(onechainUser, address(0), 100);
    }

    function test_Revert_PayBoosterPrize_ZeroAmount() public {
        vm.prank(operator);
        vm.expectRevert(Vault.ZeroAmount.selector);
        vault.payBoosterPrize(onechainUser, userBase, 0);
    }

    function test_Revert_PayBoosterPrize_InsufficientBalance() public {
        vm.prank(operator);
        vm.expectRevert(Vault.InsufficientBoosterBalance.selector);
        vault.payBoosterPrize(onechainUser, userBase, 1e18);
    }

    // -----------------------------------------------------------------------
    // rescueToken
    // -----------------------------------------------------------------------

    function test_RescueToken() public {
        MockERC20 otherToken = new MockERC20("Other Token", "OTHER");
        otherToken.mint(address(vault), 100e18);

        vm.prank(owner);
        vault.rescueToken(address(otherToken), userBase, 100e18);

        assertEq(otherToken.balanceOf(userBase), 100e18);
        assertEq(otherToken.balanceOf(address(vault)), 0);
    }

    function test_Revert_RescueToken_PrimaryToken() public {
        token.mint(address(vault), 100e18);

        vm.prank(owner);
        vm.expectRevert("Cannot rescue primary token");
        vault.rescueToken(address(token), userBase, 100e18);
    }

    function test_Revert_RescueToken_OnlyOwner() public {
        vm.prank(operator);
        vm.expectRevert();
        vault.rescueToken(address(token), userBase, 100e18);
    }

    // -----------------------------------------------------------------------
    // Admin & Guards
    // -----------------------------------------------------------------------

    function test_Revert_SetOperator_OnlyOwner() public {
        vm.prank(address(0x999));
        vm.expectRevert();
        vault.setOperator(address(0x4));
    }

    function test_Revert_SetOperator_ZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(Vault.ZeroAddress.selector);
        vault.setOperator(address(0));
    }

    function test_Revert_Constructor_ZeroAddress() public {
        vm.expectRevert(Vault.ZeroAddress.selector);
        new Vault(address(0), operator);

        vm.expectRevert(Vault.ZeroAddress.selector);
        new Vault(address(token), address(0));
    }
}
