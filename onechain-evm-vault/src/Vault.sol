// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Vault
 * @dev MVP Vault for no-loss prediction game (OneChain non-EVM).
 * Records deposits from OneChain users via a relayer/operator.
 * Allows refunds and prize payments to Base addresses.
 */
contract Vault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    address public operator;
    uint256 public boosterBalance;

    // Principal per OneChain user (bytes32 identifier)
    mapping(bytes32 => uint256) public principal;

    // Events
    event Deposited(bytes32 indexed onechainUser, uint256 amount);
    event Refunded(
        bytes32 indexed onechainUser,
        address indexed to,
        uint256 amount
    );
    event PrizePaid(
        bytes32 indexed onechainUser,
        address indexed to,
        uint256 amount
    );
    event BoosterFunded(uint256 amount);
    event BoosterPaid(
        bytes32 indexed onechainUser,
        address indexed to,
        uint256 amount
    );
    event OperatorUpdated(
        address indexed oldOperator,
        address indexed newOperator
    );

    // Errors
    error OnlyOperator();
    error InsufficientPrincipal();
    error InsufficientBoosterBalance();
    error ZeroAddress();
    error ZeroAmount();

    modifier onlyOperator() {
        if (msg.sender != operator) revert OnlyOperator();
        _;
    }

    /**
     * @dev Initialize the vault with the token and the initial operator.
     * @param _token The ERC20 token to be stored in the vault.
     * @param _operator The address of the relayer/operator.
     */
    constructor(address _token, address _operator) Ownable(msg.sender) {
        if (_token == address(0) || _operator == address(0))
            revert ZeroAddress();
        token = IERC20(_token);
        operator = _operator;
    }

    /**
     * @dev Set a new operator address. Only callable by the owner.
     * @param newOp The new operator address.
     */
    function setOperator(address newOp) external onlyOwner {
        if (newOp == address(0)) revert ZeroAddress();
        address oldOp = operator;
        operator = newOp;
        emit OperatorUpdated(oldOp, newOp);
    }

    /**
     * @dev Record a deposit for a OneChain user.
     * Tokens are transferred from the caller (operator) to the vault.
     * @param onechainUser The identifier of the user on OneChain.
     * @param amount The amount of tokens deposited.
     */
    function depositFor(
        bytes32 onechainUser,
        uint256 amount
    ) external onlyOperator nonReentrant {
        if (amount == 0) revert ZeroAmount();
        token.safeTransferFrom(msg.sender, address(this), amount);
        principal[onechainUser] += amount;
        emit Deposited(onechainUser, amount);
    }

    /**
     * @dev Refund principal to a Base recipient address.
     * @param onechainUser The identifier of the user on OneChain.
     * @param baseRecipient The recipient address on Base.
     * @param amount The amount of tokens to refund.
     */
    function refund(
        bytes32 onechainUser,
        address baseRecipient,
        uint256 amount
    ) external onlyOperator nonReentrant {
        if (baseRecipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (principal[onechainUser] < amount) revert InsufficientPrincipal();

        principal[onechainUser] -= amount;
        token.safeTransfer(baseRecipient, amount);
        emit Refunded(onechainUser, baseRecipient, amount);
    }

    /**
     * @dev Pay a prize to a Base recipient address.
     * Prizes don't decrease principal (they come from yield/external sources).
     * @param onechainUser The identifier of the user on OneChain.
     * @param baseRecipient The recipient address on Base.
     * @param amount The amount of tokens as prize.
     */
    function payPrize(
        bytes32 onechainUser,
        address baseRecipient,
        uint256 amount
    ) external onlyOperator nonReentrant {
        if (baseRecipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        token.safeTransfer(baseRecipient, amount);
        emit PrizePaid(onechainUser, baseRecipient, amount);
    }

    /**
     * @dev Fund the booster balance from the owner.
     * @param amount The amount of tokens to fund as booster.
     */
    function fundBooster(uint256 amount) external onlyOwner {
        boosterBalance += amount;
        token.safeTransferFrom(msg.sender, address(this), amount);
        emit BoosterFunded(amount);
    }

    /**
     * @dev Pay a booster prize to a Base recipient address.
     * @param onechainUser The identifier of the user on OneChain.
     * @param baseRecipient The recipient address on Base.
     * @param amount The amount of tokens as booster prize.
     */
    function payBoosterPrize(
        bytes32 onechainUser,
        address baseRecipient,
        uint256 amount
    ) external onlyOperator nonReentrant {
        if (baseRecipient == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (boosterBalance < amount) revert InsufficientBoosterBalance();

        boosterBalance -= amount;
        token.safeTransfer(baseRecipient, amount);
        emit BoosterPaid(onechainUser, baseRecipient, amount);
    }

    /**
     * @dev Rescue tokens sent by mistake to the vault.
     * Cannot rescue the primary vault token to prevent owner rug-pulling.
     * @param _token The address of the token to rescue.
     * @param to The recipient address.
     * @param amount The amount to rescue.
     */
    function rescueToken(
        address _token,
        address to,
        uint256 amount
    ) external onlyOwner {
        if (_token == address(token)) revert("Cannot rescue primary token");
        IERC20(_token).safeTransfer(to, amount);
    }

    // ---------------------------------------------------------------------------
    // Future: Aave V3 Integration
    // ---------------------------------------------------------------------------
    // To add yield via Aave, inject the IPool address in the constructor and
    // call the hooks below inside depositFor / refund / payPrize:
    //
    //   IPool public aavePool;
    //
    //   function _supplyToAave(uint256 amount) internal {
    //       token.approve(address(aavePool), amount);
    //       aavePool.supply(address(token), amount, address(this), 0);
    //   }
    //
    //   function _withdrawFromAave(uint256 amount) internal {
    //       aavePool.withdraw(address(token), amount, address(this));
    //   }
    // ---------------------------------------------------------------------------
}
