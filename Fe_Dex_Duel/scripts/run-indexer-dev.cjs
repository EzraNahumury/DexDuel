const { spawn } = require("node:child_process");
const path = require("node:path");

const entry = path.join("server", "indexer", "indexer.ts");
const majorNode = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);

function run(command, args) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PRISMA_DISABLE_ERROR_LOGS: process.env.PRISMA_DISABLE_ERROR_LOGS ?? "1",
    },
    stdio: "inherit",
    shell: false,
  });

  child.on("error", (error) => {
    console.error(`[indexer] failed to start process "${command}":`, error);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
}

// tsx currently fails on some Windows + Node 24 setups (esbuild spawn EPERM).
// Prefer native TS runtime on Node 22+, fallback to tsx for older runtimes.
if (majorNode >= 22) {
  run(process.execPath, ["--no-warnings=MODULE_TYPELESS_PACKAGE_JSON", "--experimental-strip-types", entry]);
} else {
  const tsxBin =
    process.platform === "win32"
      ? path.join("node_modules", ".bin", "tsx.cmd")
      : path.join("node_modules", ".bin", "tsx");
  run(tsxBin, [entry]);
}
