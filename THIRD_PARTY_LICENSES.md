# Third-Party Notices

Zhulong Project Intelligence Kit is licensed under Apache-2.0. This file
records third-party material that is copied into the repository, as distinct
from tools that users install and run separately.

## Vendored ambiguity wordlists

None.

`ambiguity-wordlists.json` is a self-authored rule set. It uses generic
requirement-smell categories such as subjective wording, weak obligation,
open-ended wording, optional conditions, and unquantified qualities. It does
not copy `write-good`, `words-weasels`, standards text, or proprietary review
checklists.

## External tools and runtimes

GraphRAG, Graphify, Codex, Claude Code, and GitHub Copilot are optional external
tools or runtimes. Their code is not vendored into this repository. Users must
review and comply with each tool's license and service terms separately.

## Maintenance rule

Before copying any third-party source, data, wordlist, icon, font, or template
into the repository:

1. Record the component name, version or commit, source URL, license, and copied files here.
2. Include the license text when its terms require it.
3. Confirm that `npm pack --dry-run --json` contains only material intended for distribution.
4. Extend `verify:license` with a fixture that proves the notice remains present.
