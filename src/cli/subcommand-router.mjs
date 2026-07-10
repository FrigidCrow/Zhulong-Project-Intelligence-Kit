export function createSubcommandHandler(routes, usage) {
  return function subcommandHandler(args) {
    const handler = routes[args._[0]];
    if (typeof handler === "function") return handler(args);
    usage({ error: true });
    process.exitCode = 2;
  };
}
