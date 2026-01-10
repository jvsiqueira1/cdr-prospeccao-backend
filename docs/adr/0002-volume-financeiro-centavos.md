# ADR 0002 — Valores monetários em centavos (Int)

## Contexto

Precisamos adicionar volume financeiro por lead.

## Decisão

Armazenar valores monetários em **centavos** (`Int`) e não em float.

## Consequências

- Evita erro de arredondamento
- UI converte para BRL ao exibir
- Facilita somatórios e relatórios
