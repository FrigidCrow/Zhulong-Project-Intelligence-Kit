import { COMMAND_ALIASES } from "./args.mjs";

const ROOT_COMMANDS = [
  "init", "codebase", "docs", "rag", "answer", "ambiguity", "structure",
  "preflight", "refresh", "mode", "trace", "policy", "help", "next",
  "privacy", "license", "graph", "evidence", "runtime", "context",
  "workflow", "cockpit", "verify", "map", "doctor", "completion",
];

export function completionWords() {
  return [...new Set([...ROOT_COMMANDS, ...COMMAND_ALIASES.keys()])].sort();
}

export function generateCompletion(shell) {
  const words = completionWords().join(" ");
  if (shell === "bash") {
    return `_zhulong_complete() {\n  COMPREPLY=( $(compgen -W "${words}" -- "${"${COMP_WORDS[COMP_CWORD]}"}") )\n}\ncomplete -F _zhulong_complete zhulong zl\n`;
  }
  if (shell === "zsh") {
    return `#compdef zhulong zl\n_zhulong_complete() {\n  local -a commands\n  commands=(${words})\n  _describe 'command' commands\n}\ncompdef _zhulong_complete zhulong zl\n`;
  }
  if (shell === "fish") {
    return words.split(" ").map((word) => `complete -c zhulong -c zl -f -a '${word}'`).join("\n") + "\n";
  }
  throw new Error(`unsupported completion shell: ${shell || "missing"}; expected bash, zsh, or fish`);
}

export function completionCommand(args) {
  const shell = String(args._?.[0] || "").toLowerCase();
  try {
    console.log(generateCompletion(shell).trimEnd());
  } catch (error) {
    console.error(`error: ${error.message}`);
    process.exitCode = 2;
  }
}
