# ADR 0001 — Gamificação calculada no servidor

## Contexto

Hoje o client chama um endpoint para somar pontos. Isso permite fraude.

## Decisão

A pontuação deve ser derivada de **eventos de domínio** no servidor (ex.: contato registrado, lead convertido, atraso resolvido).

## Consequências

- Criar ledger de eventos (`PontuacaoEvento`)
- Endpoints do client executam ações; servidor emite eventos e calcula pontos
- Facilita adicionar perda de pontos (rank points) e anti-spam
