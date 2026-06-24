import { privateKeyToAccount } from "viem/accounts";
import {
  createWalletClient,
  http,
  createPublicClient,
} from "viem";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";
import solc from "solc";

const G_DOLLAR = "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A";
const CELO_RPC = "https://forno.celo.org";

const celo = {
  id: 42220,
  name: "Celo",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: { default: { http: [CELO_RPC] } },
} as const;

function compileWithSolc(): { abi: unknown[]; bytecode: `0x${string}` } {
  const sourcePath = resolve(process.cwd(), "contracts/ShareGEscrow.sol");
  const source = readFileSync(sourcePath, "utf8");
  const input = {
    language: "Solidity",
    sources: { "ShareGEscrow.sol": { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": { "*": ["abi", "evm.bytecode"] },
      },
    },
  };

  const output = JSON.parse(
    solc.compile(JSON.stringify(input), { version: "v0.8.20+commit.a1b79de6" }),
  );

  if (output.errors?.length) {
    const fatal = output.errors.filter(
      (e: { severity: string }) => e.severity === "error",
    );
    if (fatal.length) {
      console.error(fatal.map((e: { formattedMessage: string }) => e.formattedMessage).join("\n"));
      process.exit(1);
    }
  }

  const contract = output.contracts["ShareGEscrow.sol"].ShareGEscrow;
  return {
    abi: contract.abi,
    bytecode: `0x${contract.evm.bytecode.object}` as `0x${string}`,
  };
}

function loadArtifact(): { abi: unknown[]; bytecode: `0x${string}` } {
  const artifactPath = resolve(
    process.cwd(),
    "artifacts/ShareGEscrow.sol/ShareGEscrow.json",
  );

  if (existsSync(artifactPath)) {
    const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
    return {
      abi: artifact.abi,
      bytecode: artifact.bytecode.object as `0x${string}`,
    };
  }

  try {
    execSync("forge build", { stdio: "pipe", cwd: process.cwd() });
    if (existsSync(artifactPath)) {
      const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
      return {
        abi: artifact.abi,
        bytecode: artifact.bytecode.object as `0x${string}`,
      };
    }
  } catch {
    console.log("Forge unavailable — compiling with solc…");
  }

  return compileWithSolc();
}

function updateEnvLocal(escrowAddress: string) {
  const envPath = resolve(process.cwd(), ".env.local");
  const escrowLine = `NEXT_PUBLIC_ESCROW_ADDRESS=${escrowAddress}`;

  if (existsSync(envPath)) {
    let content = readFileSync(envPath, "utf8");
    if (content.includes("NEXT_PUBLIC_ESCROW_ADDRESS=")) {
      content = content.replace(
        /NEXT_PUBLIC_ESCROW_ADDRESS=.*/g,
        escrowLine,
      );
    } else {
      content = `${content.trim()}\n${escrowLine}\n`;
    }
    writeFileSync(envPath, content);
  } else {
    writeFileSync(envPath, `${escrowLine}\n`);
  }
  console.log("Updated .env.local with escrow address");
}

async function main() {
  const pk = process.env.DEPLOYER_PRIVATE_KEY;
  if (!pk) {
    console.error("Set DEPLOYER_PRIVATE_KEY to deploy ShareGEscrow on Celo.");
    process.exit(1);
  }

  const normalizedPk = (
    pk.startsWith("0x") ? pk : `0x${pk}`
  ) as `0x${string}`;

  const { abi, bytecode } = loadArtifact();
  const account = privateKeyToAccount(normalizedPk);

  console.log("Deployer:", account.address);
  console.log("G$ token:", G_DOLLAR);

  const publicClient = createPublicClient({
    chain: celo,
    transport: http(CELO_RPC),
  });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log("CELO balance:", Number(balance) / 1e18);

  const client = createWalletClient({
    account,
    chain: celo,
    transport: http(CELO_RPC),
  });

  const hash = await client.deployContract({
    abi,
    bytecode,
    args: [G_DOLLAR],
  });

  console.log("Deploy tx:", hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  const address = receipt.contractAddress;
  if (!address) {
    throw new Error("Deployment failed — no contract address in receipt");
  }

  console.log("ShareGEscrow deployed:", address);
  console.log(`https://celoscan.io/address/${address}`);

  updateEnvLocal(address);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
