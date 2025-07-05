// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IRWA20.sol";

contract RWA20Token is ERC20, ERC20Burnable, Ownable {
    string public platform;
    string public assetId;
    string public assetType;
    bytes32 public legalHash;
    uint256 public lastValuation;
    uint256 public valuationTimestamp;

    event ValuationUpdated(uint256 oldValuation, uint256 newValuation, uint256 timestamp);

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _platform,
        string memory _assetId,
        string memory _assetType,
        bytes32 _legalHash,
        uint256 _totalSupply,
        uint256 _valuation,
        address _owner
    ) ERC20(_name, _symbol) Ownable(_owner) {
        platform = _platform;
        assetId = _assetId;
        assetType = _assetType;
        legalHash = _legalHash;
        lastValuation = _valuation;
        valuationTimestamp = block.timestamp;
        
        _mint(_owner, _totalSupply);
    }

    function updateValuation(uint256 _newValuation) external onlyOwner {
        uint256 oldValuation = lastValuation;
        lastValuation = _newValuation;
        valuationTimestamp = block.timestamp;
        
        emit ValuationUpdated(oldValuation, _newValuation, block.timestamp);
    }

    function getMetadata() external view returns (IRWA20.AssetMetadata memory) {
        return IRWA20.AssetMetadata({
            platform: platform,
            assetId: assetId,
            totalSupply: totalSupply(),
            assetType: assetType,
            legalHash: legalHash,
            lastValuation: lastValuation,
            valuationTimestamp: valuationTimestamp
        });
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
