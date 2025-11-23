const hre = require("hardhat");

async function main() {
  console.log("Deploying RockPaperScissors contract...");

  const RockPaperScissors = await hre.ethers.getContractFactory("RockPaperScissors");
  const rockPaperScissors = await RockPaperScissors.deploy();

  await rockPaperScissors.waitForDeployment();

  const address = await rockPaperScissors.getAddress();
  console.log("RockPaperScissors deployed to:", address);
  console.log("Network:", hre.network.name);
  console.log("\nContract Address:", address);
  console.log("\nAdd this to your .env files:");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS="${address}"`);
  console.log(`ROCK_PAPER_SCISSORS_ADDRESS="${address}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
