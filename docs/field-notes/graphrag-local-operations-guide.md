# GraphRAG Local Operations Guide

This document records the GraphRAG setup, operating model, commands, and lessons learned for this repository.

This file is local-only. Do not commit it, `graphrag-workspace/`, `output/`, `cache/`, `.env`, or any generated graph/RAG artifacts unless the project explicitly creates a separate internal artifact distribution process.

## 1. Security Position

For confidential projects, use the pure local profile by default:

- Completion model: Ollama local model, for example `qwen2.5:14b`.
- Embedding model: Ollama local embedding model, currently `nomic-embed-text`.
- Vector database: local LanceDB under `graphrag-workspace/output/lancedb`.
- Input documents: local Markdown under `graphrag-workspace/input`.
- No external model API should be configured.

<external-provider>/OpenAI/Claude/etc. are external model services. If completion is configured to <external-provider>, the text sent to GraphRAG completion steps can leave the machine. That includes indexing prompts such as entity extraction and community report generation, and query prompts such as final answer generation. For a strict confidential project, do not use external completion models.

API keys must be stored only in `graphrag-workspace/.env`, referenced as `${GRAPHRAG_API_KEY}`, and never written into Markdown docs, git commits, issue records, logs, or summaries.

## 2. Current Workspace State

Repository root:

```bash
/Users/frigidcrow/Documents/social_credit
```

GraphRAG workspace:

```bash
graphrag-workspace/
```

Input documents:

```bash
graphrag-workspace/input/*.md
```

Local vector database:

```bash
graphrag-workspace/output/lancedb
```

Current completed full standard index:

```text
documents.parquet: 15 rows
text_units.parquet: 123 rows
entities.parquet: 3453 rows
relationships.parquet: 5338 rows
communities.parquet: 522 rows
community_reports.parquet: 522 rows
```

Current local LanceDB vector tables:

```text
community_full_content.lance
entity_description.lance
text_unit_text.lance
```

This index was generated on 2026-06-24 with:

```text
completion: deepseek/deepseek-chat
embedding: ollama/nomic-embed-text
index method: standard
workflows: extract_graph + create_community_reports + generate_text_embeddings
concurrent_requests: 4
```

Validation succeeded for both:

```bash
graphrag query --root graphrag-workspace --method local --response-type "List of 8 concise points with data references" "我现在测试环境部署和生产环境部署都是咋做的？全流程是啥啊"
graphrag query --root graphrag-workspace --method global --response-type "List of 6 concise points with data references" "这个项目整体架构、核心子系统和主要边界是什么？"
```

Earlier local-only standard indexing with `qwen2.5:14b` was stopped at `extract_graph 9 / 123` because it was too slow for an interactive session. That remains an important lesson: pure local standard indexing is possible, but should be run overnight or on stronger hardware.

## 3. The Mental Model

GraphRAG has two separate phases:

```text
Index phase:
  input documents -> parquet tables -> LanceDB vector tables

Query phase:
  user question -> retrieve context from tables/vectors -> LLM answer
```

`local`, `global`, and `basic` are query methods. They are not indexing methods.

`fast` and `standard` are indexing methods. They decide how GraphRAG builds the graph and reports.

## 4. Query Methods

### 4.1 basic

`basic` is normal vector RAG over text chunks.

It mainly uses:

```text
output/text_units.parquet
output/lancedb/text_unit_text.lance
```

Flow:

```text
question
-> embed question
-> search similar text chunks in text_unit_text.lance
-> put matching source chunks into prompt
-> completion model writes answer
```

Use `basic` for concrete facts that are likely present in one or several source chunks:

- deployment steps;
- one SOP;
- one bug record;
- one incident note;
- one environment command;
- one API or module explanation.

Command:

```bash
graphrag query \
  --root graphrag-workspace \
  --method basic \
  --response-type "List of 5 concise points with data references" \
  "GraphRAG 工作区里记录的优乐享后端部署原则是什么？"
```

### 4.2 local

`local` is graph-aware local search.

It requires:

```text
output/entities.parquet
output/relationships.parquet
output/text_units.parquet
output/communities.parquet
output/community_reports.parquet
output/lancedb/entity_description.lance
```

Flow:

```text
question
-> embed question
-> find related entities from entity_description.lance
-> expand to relationships
-> collect linked source chunks
-> collect relevant community reports
-> completion model writes answer
```

Use `local` for questions that need relationships across documents:

- "测试环境部署和生产环境部署有什么差异？"
- "这个 bug 影响哪些模块？"
- "支付流程涉及哪些服务、接口、表？"
- "某个子系统和另一个子系统怎么关联？"

Command:

```bash
graphrag query \
  --root graphrag-workspace \
  --method local \
  --response-type "List of 8 concise points with data references" \
  "我现在测试环境部署和生产环境部署都是咋做的？全流程是啥啊"
```

If `community_reports.parquet` does not exist, `local` cannot run correctly in this GraphRAG version.

### 4.3 global

`global` is whole-corpus overview search.

It mainly uses:

```text
output/entities.parquet
output/communities.parquet
output/community_reports.parquet
```

Use `global` for broad synthesis:

- "这个项目整体架构是什么？"
- "所有文档反映出的主要风险是什么？"
- "整个 monorepo 的系统边界是什么？"
- "有哪些核心业务域？"

Command:

```bash
graphrag query \
  --root graphrag-workspace \
  --method global \
  --response-type "List of 8 concise points with data references" \
  "这个项目整体架构、核心子系统和主要边界是什么？"
```

## 5. Indexing Methods

### 5.1 fast

`fast` indexing uses the fast workflow chain. In GraphRAG 3.1.0, the default fast pipeline is:

```text
load_input_documents
create_base_text_units
create_final_documents
extract_graph_nlp
prune_graph
finalize_graph
create_communities
create_final_text_units
create_community_reports_text
generate_text_embeddings
```

Important parts:

- `extract_graph_nlp`: extracts graph-like entities/relationships using local NLP rules or parser-style logic, not the full LLM graph extraction prompt.
- `prune_graph`: removes weak/noisy graph edges.
- `create_community_reports_text`: creates community reports from text-oriented context.

Fast is useful when:

- the knowledge base changes often;
- you need quick refreshes;
- `basic` is enough;
- full LLM extraction is too slow locally.

Command:

```bash
graphrag index \
  --root graphrag-workspace \
  --method fast
```

### 5.2 standard

`standard` indexing is the full LLM graph extraction chain. In GraphRAG 3.1.0, the default standard pipeline is:

```text
load_input_documents
create_base_text_units
create_final_documents
extract_graph
finalize_graph
extract_covariates
create_communities
create_final_text_units
create_community_reports
generate_text_embeddings
```

Important parts:

- `extract_graph`: uses the completion model to extract entities and relationships from each text chunk.
- `extract_covariates`: optional claim/fact extraction workflow. In this workspace, `extract_claims.enabled` is false, so it should not create claim-heavy output.
- `create_community_reports`: uses the completion model to summarize graph communities.
- `generate_text_embeddings`: writes embedding vectors to LanceDB according to `embed_text.names`.

Standard is useful when:

- you need high-quality graph-aware `local` search;
- you need `global` overview queries;
- you can wait for full indexing;
- external completion is allowed, or you have a fast enough local model.

Command:

```bash
graphrag index \
  --root graphrag-workspace \
  --method standard
```

## 6. What workflows Means

`workflows` in `settings.yaml` is the GraphRAG indexing pipeline. It is not a business workflow, deployment workflow, or application workflow.

If `settings.yaml` contains an explicit `workflows:` list, that list overrides the default pipeline selected by `--method fast` or `--method standard`.

That means:

```bash
graphrag index --root graphrag-workspace --method standard
```

does not necessarily run the full standard pipeline if `settings.yaml` has a custom `workflows:` list.

For a new project, if you trust GraphRAG defaults, you can omit `workflows:` and let `--method fast` or `--method standard` choose the pipeline.

For this workspace, `workflows:` was explicitly edited during experimentation. Keep it explicit only when you intentionally want a fixed profile.

## 7. Recommended Profiles

### 7.1 Pure Local Daily Profile

Use this for confidential projects and daily updates.

Completion model:

```yaml
completion_models:
  default_completion_model:
    model_provider: ollama
    model: qwen2.5:14b
    auth_method: api_key
    api_key: ollama
    api_base: http://localhost:11434
    call_args:
      temperature: 0
      num_ctx: 16384
    retry:
      type: exponential_backoff
```

Embedding model:

```yaml
embedding_models:
  default_embedding_model:
    model_provider: ollama
    model: nomic-embed-text
    auth_method: api_key
    api_key: ollama
    api_base: http://localhost:11434
    retry:
      type: exponential_backoff
```

Lightweight workflows:

```yaml
workflows:
  - load_input_documents
  - create_base_text_units
  - create_final_documents
  - extract_graph_nlp
  - prune_graph
  - finalize_graph
  - create_communities
  - create_final_text_units
  - generate_text_embeddings
```

Embeddings:

```yaml
embed_text:
  embedding_model_id: default_embedding_model
  batch_size: 4
  batch_max_tokens: 3000
  names:
    - entity_description
    - text_unit_text
```

Command:

```bash
graphrag index --root graphrag-workspace --method fast
```

Query with:

```bash
graphrag query --root graphrag-workspace --method basic --response-type "List of 5 concise points with data references" "<question>"
```

### 7.2 Pure Local Full Profile

Use this when the project requires full local/global GraphRAG and the machine can wait.

Completion and embedding remain Ollama.

Full standard workflows:

```yaml
workflows:
  - load_input_documents
  - create_base_text_units
  - create_final_documents
  - extract_graph
  - finalize_graph
  - extract_covariates
  - create_communities
  - create_final_text_units
  - create_community_reports
  - generate_text_embeddings
```

Embeddings:

```yaml
embed_text:
  embedding_model_id: default_embedding_model
  batch_size: 4
  batch_max_tokens: 3000
  names:
    - entity_description
    - text_unit_text
    - community_full_content
```

Command:

```bash
graphrag index --root graphrag-workspace --method standard
```

Expected cost:

- Very slow with local `qwen2.5:14b`.
- In this workspace, local standard extraction reached about `9 / 123` text units before being stopped.
- Full local standard indexing can be hours-level or longer depending on model, hardware, and document size.

After completion, validate:

```bash
ls -lh graphrag-workspace/output/community_reports.parquet
find graphrag-workspace/output/lancedb -maxdepth 1 -type d | sort
```

Then query:

```bash
graphrag query --root graphrag-workspace --method local --response-type "List of 8 concise points with data references" "<local relationship question>"
graphrag query --root graphrag-workspace --method global --response-type "List of 8 concise points with data references" "<global overview question>"
```

### 7.3 <external-provider> External Completion Profile

Use this only when external model calls are allowed.

Completion model:

```yaml
completion_models:
  default_completion_model:
    model_provider: deepseek
    model: deepseek-chat
    auth_method: api_key
    api_key: ${GRAPHRAG_API_KEY}
    api_base: https://api.deepseek.com
    call_args:
      temperature: 0
    retry:
      type: exponential_backoff
```

`.env`:

```bash
GRAPHRAG_API_KEY=<do not write the real key in docs>
```

Embedding can still remain local:

```yaml
embedding_models:
  default_embedding_model:
    model_provider: ollama
    model: nomic-embed-text
    auth_method: api_key
    api_key: ollama
    api_base: http://localhost:11434
```

This profile means:

- entity extraction can be sent to <external-provider>;
- community report generation can be sent to <external-provider>;
- query answer generation can be sent to <external-provider>;
- embeddings and LanceDB remain local.

It is not a pure local or strict confidential profile.

## 8. First-Time Setup Commands

Install or confirm Ollama models:

```bash
ollama pull nomic-embed-text
ollama pull qwen2.5:14b
ollama list
```

Check active local models:

```bash
ollama ps
```

Create or inspect GraphRAG workspace:

```bash
graphrag init --root graphrag-workspace
```

This workspace already exists, so do not re-run `init` unless intentionally recreating configuration.

Check available GraphRAG commands:

```bash
graphrag --help
graphrag index --help
graphrag update --help
graphrag query --help
```

## 9. Safe Reindex Procedure

Before rebuilding, back up the current index:

```bash
ts=$(date +%Y%m%d%H%M%S)
mkdir -p graphrag-workspace/backups

if [ -d graphrag-workspace/output ]; then
  mv graphrag-workspace/output graphrag-workspace/backups/output.before-reindex.$ts
fi

if [ -d graphrag-workspace/cache ]; then
  mv graphrag-workspace/cache graphrag-workspace/backups/cache.before-reindex.$ts
fi
```

For a daily pure local lightweight refresh:

```bash
graphrag index --root graphrag-workspace --method fast
```

For a full standard refresh:

```bash
graphrag index --root graphrag-workspace --method standard
```

If you want to keep cache for speed, back up only `output` and leave `cache` in place:

```bash
ts=$(date +%Y%m%d%H%M%S)
mkdir -p graphrag-workspace/backups

if [ -d graphrag-workspace/output ]; then
  mv graphrag-workspace/output graphrag-workspace/backups/output.before-reindex.$ts
fi

graphrag index --root graphrag-workspace --method fast
```

For clean rebuilds after deleting documents or changing many documents, move both `output` and `cache`.

## 10. Document Update Policy

GraphRAG does not automatically watch files. Updates are explicit.

### 10.1 New Document Arrives

Put the document under:

```bash
graphrag-workspace/input/
```

Prefer Markdown:

```bash
graphrag-workspace/input/my-new-note.md
```

Then run the selected index profile:

```bash
graphrag index --root graphrag-workspace --method fast
```

Validate with a question that should only be answerable from the new document:

```bash
graphrag query \
  --root graphrag-workspace \
  --method basic \
  --response-type "List of 5 concise points with data references" \
  "刚新增的文档记录了什么关键事实？"
```

If this is a major architecture document and you need graph-aware relationships, run the full standard profile and validate with `local`.

### 10.2 Old Document Is Updated

Edit the existing file under:

```bash
graphrag-workspace/input/
```

Then rebuild. For small daily updates:

```bash
graphrag index --root graphrag-workspace --method fast
```

For large semantic rewrites or architecture changes:

```bash
graphrag index --root graphrag-workspace --method standard
```

Validate with:

```bash
graphrag query --root graphrag-workspace --method basic --response-type "List of 5 concise points with data references" "<question about the changed fact>"
```

If `local` is available:

```bash
graphrag query --root graphrag-workspace --method local --response-type "List of 8 concise points with data references" "<relationship question about the changed area>"
```

### 10.3 Document Is Deleted

Remove it from:

```bash
graphrag-workspace/input/
```

Then perform a clean rebuild. Do not rely on old `output`, because deleted facts can remain in existing parquet/vector outputs.

```bash
ts=$(date +%Y%m%d%H%M%S)
mkdir -p graphrag-workspace/backups

mv graphrag-workspace/output graphrag-workspace/backups/output.before-delete-reindex.$ts
mv graphrag-workspace/cache graphrag-workspace/backups/cache.before-delete-reindex.$ts

graphrag index --root graphrag-workspace --method fast
```

Validate by asking about the deleted document. A strict prompt should respond that the context has insufficient evidence.

## 11. Incremental Update

This GraphRAG version exposes:

```bash
graphrag update --root graphrag-workspace
```

and index methods:

```text
standard-update
fast-update
```

However, `graphrag update` writes to an update output location and has more moving parts. For this workspace, prefer the simpler and safer operational rule:

```text
small update -> rebuild lightweight index
delete/large update -> clean rebuild
major graph refresh -> full standard rebuild
```

Use `update` only after separately testing it on a copy of the workspace.

## 12. Team Sharing

A git commit does not automatically share GraphRAG output.

This project intentionally ignores local knowledge artifacts:

```text
graphrag-workspace/
docs/architecture/
graphify-corpus/
graphify-out/
.planning/
```

For a confidential project, recommended team model:

1. Commit only source code and safe project docs.
2. Each developer builds their own local GraphRAG index from approved local input docs.
3. If sharing indexes is required, distribute `graphrag-workspace/output` as an internal artifact, not through git.
4. Never distribute `.env`, API keys, production credentials, copied secrets, or logs containing secrets.

If one person runs a full `local/global` index, other people do not get that index from git unless the team explicitly shares the generated artifacts.

## 13. Commands Used During This Setup

Check hardware/model state:

```bash
ollama list
ollama ps
```

Install local models:

```bash
ollama pull qwen2.5:14b
ollama pull nomic-embed-text
```

Run lightweight pure local index:

```bash
graphrag index --root graphrag-workspace --method fast --verbose
```

Run full standard index:

```bash
graphrag index --root graphrag-workspace --method standard
```

Stop a long-running index if needed:

```bash
ps -axo pid,ppid,stat,etime,command | rg 'graphrag index|python.*graphrag'
kill <pid>
```

Inspect output tables:

```bash
/Users/frigidcrow/.local/share/uv/tools/graphrag/bin/python - <<'PY'
import pandas as pd
from pathlib import Path

out = Path('graphrag-workspace/output')
for name in ['documents', 'text_units', 'entities', 'relationships', 'communities', 'community_reports']:
    p = out / f'{name}.parquet'
    print(name, pd.read_parquet(p).shape if p.exists() else 'MISSING')

print('lancedb dirs:')
for p in sorted((out / 'lancedb').glob('*.lance')):
    print('-', p.name)
PY
```

Inspect LanceDB folders:

```bash
find graphrag-workspace/output/lancedb -maxdepth 2 -type d | sort
```

Query basic:

```bash
graphrag query \
  --root graphrag-workspace \
  --method basic \
  --response-type "List of 5 concise points with data references" \
  "GraphRAG 工作区里记录的优乐享后端部署原则是什么？"
```

Query local:

```bash
graphrag query \
  --root graphrag-workspace \
  --method local \
  --response-type "List of 8 concise points with data references" \
  "我现在测试环境部署和生产环境部署都是咋做的？全流程是啥啊"
```

Query global:

```bash
graphrag query \
  --root graphrag-workspace \
  --method global \
  --response-type "List of 8 concise points with data references" \
  "这个项目整体架构、核心子系统和主要边界是什么？"
```

Check git ignore protection:

```bash
git check-ignore -v \
  graphrag-workspace/.env \
  graphrag-workspace/settings.yaml \
  graphrag-workspace/output \
  graphrag-workspace/cache
```

## 14. Troubleshooting and Lessons Learned

### 14.1 `basic` worked before `local`

The lightweight pure local index created:

```text
text_units.parquet
entities.parquet
relationships.parquet
communities.parquet
lancedb/entity_description.lance
lancedb/text_unit_text.lance
```

But it intentionally did not create:

```text
community_reports.parquet
lancedb/community_full_content.lance
```

Therefore `basic` worked, while `local/global` required a full community report step.

### 14.2 Why there were more than 100 communities

Communities are graph clusters, not documents.

This workspace had 15 input documents, but the graph clustering created 122 communities in one lightweight run:

```text
level 0: 8
level 1: 28
level 2: 61
level 3: 20
level 4: 5
total: 122
```

This is normal for architecture and Graphify-derived documents because they contain many services, controllers, files, modules, flows, and deployment concepts.

### 14.3 Local standard indexing is slow

With `qwen2.5:14b`, standard `extract_graph` was much slower than fast indexing because it uses the LLM for each text unit.

The run reached about:

```text
extract_graph 9 / 123
```

before being stopped.

Reducing `num_ctx` from `32768` to `16384` lowered Ollama memory usage from about 14GB to about 11GB, but full standard indexing was still slow.

### 14.4 LiteLLM Bedrock/SageMaker warnings

Warnings like these appeared:

```text
could not pre-load bedrock-runtime response stream shape
could not pre-load sagemaker-runtime response stream shape
```

They are optional-provider warnings from LiteLLM. They do not mean GraphRAG is calling Bedrock or SageMaker.

To verify the active local models:

```bash
ollama ps
```

To verify the configured model provider:

```bash
grep -n "model_provider\\|model:\\|api_base" -A4 -B2 graphrag-workspace/settings.yaml
```

### 14.5 <external-provider> is faster but not confidential

<external-provider> can make full standard indexing more practical, but it is external. If used, treat all GraphRAG input documents and query context as data that may leave the machine.

For strict confidential projects, keep completion and embedding both on Ollama.

## 15. Practical Recommendation

For confidential daily work:

```text
Pure local Ollama + lightweight fast index + basic query
```

For periodic deeper analysis:

```text
Pure local full standard index, run overnight or on a stronger machine
```

For non-confidential speed:

```text
<external-provider> completion + Ollama embedding + full standard index
```

For this repository, keep GraphRAG artifacts local-only unless the team creates an explicit secure artifact distribution policy.
