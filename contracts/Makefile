../sdk/Auction.abi:Auction.sol
	solc --abi --overwrite -o ../sdk Auction.sol 2>/dev/null
deploy:
	truffle deploy
test:
	truffle test
clean:
	rm ../sdk/*.abi