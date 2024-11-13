import { viem } from "hardhat";
import { toHex, parseEther } from "viem";

const PROPOSALS = ["Proposal 1", "Proposal 2", "Proposal 3"];
const MINT_AMOUNT = parseEther("100");

async function main() {
    const publicClient = await viem.getPublicClient();
    const [deployer, acc1, acc2] = await viem.getWalletClients();
    const acc1Account = acc1!.account;
    const acc1Address = acc1Account.address;
    const acc2Account = acc2!.account;
    const acc2Address = acc2Account.address;

    // Deploy contracts
    const tokenVotes = await viem.deployContract("MyToken");
    console.log(`MyTokenVotes address: ${tokenVotes.address}`);
    const currentBlockNumber = await publicClient.getBlockNumber();
    console.log("Current block number:", currentBlockNumber);
    const targetBlockNumber = currentBlockNumber + 1n;
    console.log("Target block number:", targetBlockNumber);

    const tokenizedBallot = await viem.deployContract("TokenizedBallot", [
        PROPOSALS.map((prop) => toHex(prop, { size: 32 })),
        tokenVotes.address,
        targetBlockNumber,
    ]);
    console.log("tokenizedBallot address: ", tokenizedBallot.address);

    // Mint tokens
    const mintTokensTx = await tokenVotes.write.mint([acc1Address, MINT_AMOUNT]);
    await publicClient.waitForTransactionReceipt({ hash: mintTokensTx });
    console.log(`Minted ${MINT_AMOUNT.toString()} decimal units to account: ${acc1Address}`);
    const balanceBN = await tokenVotes.read.balanceOf([acc1Address]);
    console.log(`Balance of ${acc1Address}: ${balanceBN}`);

    // Get voting power
    const votingPowerTx = await tokenVotes.read.getVotes([acc1Address]);
    console.log(`Voting power of ${acc1Address}: ${votingPowerTx}`);

    // Self delegate
    const delegateTx = await tokenVotes.write.delegate([
        acc1Address],
        { account: acc1Account }
    );
    await publicClient.waitForTransactionReceipt({ hash: delegateTx });
    console.log(`Delegated voting power to ${deployer.account.address}`);
    const votesAfter = await tokenVotes.read.getVotes([acc1Address]);
    console.log(`Voting power after delegation: ${votesAfter}`);

    // Token transfer
    const transferTx = await tokenVotes.write.transfer(
        [acc2Address, MINT_AMOUNT / 2n],
        {
            account: acc1Account,
        }
    );
    await publicClient.waitForTransactionReceipt({ hash: transferTx });
    console.log(`Transfer approved from ${acc1.account.address}, `)
    const votesAfterTransfer = await tokenVotes.read.getVotes([acc1Address]);
    console.log(`Voting power after transfer: ${votesAfterTransfer}`);
    const votesAcc2 = await tokenVotes.read.getVotes([acc2Address]);
    console.log(`Voting power of ${acc2Address}: ${votesAcc2}`);

    // Delegate transactio
    const delegateTx2 = await tokenVotes.write.delegate([
        acc2Address],
        { account: acc2Account }
    );
    await publicClient.waitForTransactionReceipt({ hash: delegateTx2 });
    console.log(`Delegated voting power to ${acc2Address}`);
    const votesAfter2 = await tokenVotes.read.getVotes([acc2Address]);
    console.log(`Voting power after delegation: ${votesAfter2}`);

    // Voting
    console.log("Voting: ");
    const proposalIndex = 0n; // The index of the proposal you want to vote for
    const amountToVote = votingPowerTx / 2n;
    const votingTx = await tokenizedBallot.write.vote(
        [proposalIndex, amountToVote],
        { account: deployer.account }
    );
    await publicClient.waitForTransactionReceipt({ hash: votingTx });
    console.log(`Vote transaction hash: ${votingTx}`);

    const winningProposal = await tokenizedBallot.read.winningProposal();
    console.log(`Winning proposal: ${winningProposal}`);

    const winner = await tokenizedBallot.read.winnerName();
    console.log(`Winner: ${winner}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
