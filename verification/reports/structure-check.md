# Zhulong Structure Audit Verification

生成时间: 2026-07-10T04:45:23.132Z

## 摘要

- 状态: PASS
- 问题数: 0

## 证据

- structure audit --target <tmp>/zhulong-structure-CZLRxj/project: exit 0
- advisory: missing artifacts do not block default mode
- structure audit --target <tmp>/zhulong-structure-CZLRxj/project --strict: exit 1
- structure audit --target <tmp>/zhulong-structure-CZLRxj/project --strict: exit 0
- strict pass: all mini-schema contracts pass
- compliance rate: rate is 1 for valid fixture
- contract count: five key artifacts checked

## 问题

未发现问题。
