# Japanese Document-Heavy Approval Fixture

This fixture models a small Japanese enterprise maintenance task where a coding
agent must use specifications, QA, meeting minutes, a code map, tests, and
evidence writeback before claiming the work is done.

## Scenario

CR-017 changes the proxy approval limit from the inherited 50,000 JPY behavior
to the latest 30,000 JPY decision.

The source code intentionally starts with the old value:

```js
export const PROXY_APPROVAL_LIMIT = 50000;
```

Default regression tests pass:

```bash
npm test
```

The CR-017 acceptance test fails until the task is implemented:

```bash
npm run test:task
```

## Fixture Layout

```text
docs/
  specs/            Japanese specification
  qa/               QA decision record
  minutes/          meeting minutes
  design/           basic design notes
  tests/            Japanese test specification
  change-requests/  reproducible CR-017 task
src/
  approvalPolicy.js
  approvalService.js
tests/
  current.test.js
  cr017_proxy_limit.test.js
scripts/
  fake-rag-index.mjs
  fake-rag-query.mjs
  fake-graphify.mjs
pik-seed/
  issues/
  phases/
```

## AI-PIKit Validation

From the kit root, run:

```bash
npm run fixture:japanese
```

The validation script copies this fixture to a temporary directory, initializes
AI-PIKit, configures fixture RAG and Graphify adapters, verifies the expected failing
task test, applies the CR-017 change in the temp copy, runs tests, diffs the code
map, and writes evidence back to the seeded issue record.

## Manual AI-PIKit Flow

Inside a copied fixture project:

```bash
node /path/to/Project-Intelligence-Kit/bin/pik.mjs init --target . --template backend-service --name ja_approval_fixture --force
cp pik.fixture.config.json .planning/config.json
cp -R pik-seed/issues/* .planning/issues/
cp -R pik-seed/phases/* .planning/phases/

node /path/to/Project-Intelligence-Kit/bin/pik.mjs docs normalize --target .
node /path/to/Project-Intelligence-Kit/bin/pik.mjs docs index --target . --run
node /path/to/Project-Intelligence-Kit/bin/pik.mjs docs query --target . "代理承認 30,000"
node /path/to/Project-Intelligence-Kit/bin/pik.mjs docs query --target . --rag "代理承認の上限金額"

node /path/to/Project-Intelligence-Kit/bin/pik.mjs graph build --target . --run
node /path/to/Project-Intelligence-Kit/bin/pik.mjs graph query --target . "PROXY_APPROVAL_LIMIT"

npm run test:task
node /path/to/Project-Intelligence-Kit/bin/pik.mjs evidence record --target . "CR-017 proxy approval limit verified" --writeback .planning/issues/CR-017_proxy_approval_limit.md
```

The user-facing command layer stays `pik-*`; fixture adapters only stand in for
real GraphRAG and Graphify backends.
