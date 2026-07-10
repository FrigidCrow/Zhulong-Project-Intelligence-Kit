import { format } from "node:util";

export const EXIT_CODES = Object.freeze({
  OK: 0,
  COMMAND_FAILED: 1,
  USAGE: 2,
  ENVIRONMENT: 3,
  INTERNAL: 70,
});

export class CliError extends Error {
  constructor(message, exitCode = EXIT_CODES.COMMAND_FAILED) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
  }
}

export function commandFailure(message) {
  return new CliError(message, EXIT_CODES.COMMAND_FAILED);
}

export function environmentFailure(message) {
  return new CliError(message, EXIT_CODES.ENVIRONMENT);
}

const ANSI_PATTERN = /[\u001b\u009b][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[-a-zA-Z\d\/#&.:=?%@~_]+)*)?\u0007)|(?:(?:\d{1,4}(?:[;:]\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g;

export function stripAnsi(value) {
  return String(value ?? "").replace(ANSI_PATTERN, "");
}

export function commandIdentity(args) {
  if (args.command === "--help") return "help";
  const parts = [args.command];
  if (args._?.[0] && !String(args._[0]).startsWith("-")) parts.push(args._[0]);
  return parts.filter(Boolean).join(" ") || "help";
}

export function createOutputSession({ json = false, quiet = false, noColor = false, command = "help" } = {}) {
  const original = {
    log: console.log.bind(console),
    error: console.error.bind(console),
    warn: console.warn.bind(console),
  };
  const stdout = [];
  const stderr = [];
  let active = true;

  function capture(stream, values) {
    const message = stripAnsi(format(...values));
    (stream === "stdout" ? stdout : stderr).push(message);
    if (json || (quiet && stream === "stdout")) return;
    const writer = stream === "stdout" ? original.log : original.error;
    if (noColor) writer(message);
    else writer(...values);
  }

  console.log = (...values) => capture("stdout", values);
  console.error = (...values) => capture("stderr", values);
  console.warn = (...values) => capture("stderr", values);

  return {
    stdout,
    stderr,
    finalize(exitCode = EXIT_CODES.OK) {
      if (!active) return;
      active = false;
      console.log = original.log;
      console.error = original.error;
      console.warn = original.warn;
      if (json) {
        original.log(JSON.stringify({
          schemaVersion: "zhulong-cli-output.v1",
          command,
          status: exitCode === EXIT_CODES.OK ? "ok" : "error",
          exitCode,
          stdout,
          stderr,
        }));
      }
    },
  };
}
