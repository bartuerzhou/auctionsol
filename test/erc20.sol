// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract GLDToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("Gold", "GLD") {
        _mint(msg.sender, initialSupply);
    }

    // session erc20
    // GLDToken g = new GLDToken(10000)
    // (uint r1, uint r2) = g.test(100)

    /* external use less gas for not allocate parameter */
    function test(uint amount) external returns (uint, uint) {
        address other = address(0x59e6Ccb65c02E5284A865fa2369D8916a8aE5E80);
        transfer(other, amount);
        return (balanceOf(other), balanceOf(msg.sender));
    }
}
