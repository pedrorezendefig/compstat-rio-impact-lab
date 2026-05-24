# CompStat Rio — Protótipo (Relatório Analítico Assistido e Auditável)

Plataforma que gera o **Relatório Analítico de Área** do CompStat de forma assistida por IA,
**auditável** (cada conclusão da IA mostra *por que*, *de onde* e *quão confiável*, em linguagem
de negócio) e **editável**, com um **motor de match** (o "bingo": cruza mancha criminal × fator
urbano × dinâmica criminal × cobertura de câmera) e um **copiloto** que consulta as tabelas e
propõe reescritas. Decisão final sempre humana.

## Arquitetura
- **Backend** `app/backend` — FastAPI + DuckDB (lê os CSVs `dados_normalizados/`), motor de match
  (DuckDB spatial), síntese e copiloto via Claude (`claude-sonnet-4-6`), export DOCX.
- **Frontend** `app/frontend` — React + Vite + TypeScript, MapLibre, React Query.
- Reusa o pipeline `normalizacao/` (extração da dinâmica com citação/confiança).

## Como rodar

Pré-requisitos: o `.venv` na raiz do repo e a `ANTHROPIC_API_KEY` no `.env` da raiz (já configurados).

```bash
# 1) Backend (porta 8010 — a 8000 está ocupada por um container Docker local)
cd <repo>
PYTHONPATH="$PWD" .venv/bin/uvicorn app.backend.main:app --host 127.0.0.1 --port 8010

# 2) Frontend (porta 5173; o proxy /api aponta para 127.0.0.1:8010)
npm --prefix app/frontend run dev
```

Abra **http://localhost:5173**.

> Sem backend no ar, o frontend cai automaticamente para *fixtures* (dados de exemplo), então a UI
> sempre renderiza. Para forçar fixtures: `VITE_USE_FIXTURES=1 npm --prefix app/frontend run dev`.

## Roteiro de demonstração
1. Selecione uma área (ex.: **Presidente Vargas / Central**) no topo.
2. **Mapa de segmentos quentes**: heatmap de ocorrências + polígono da área + câmeras + fatores +
   os **segmentos críticos** do match (coloridos por score).
3. **Painel de Coincidências**: os "bingos" com score e justificativa; abra o **ProvenanceCard**
   para ver a citação literal (RELINT/Disque) clicável, o nível de confiança e o aviso "indício".
4. **Dinâmica Criminal**: clique em *gerar* → texto sintetizado pela IA com as fontes citadas.
5. **Copiloto** (lateral): pergunte "qual o horário de pico?" (mostra a ferramenta consultada);
   peça "reescreva o resumo destacando a Uruguaiana" → aceite/ajuste/rejeite a sugestão.
6. Edite um campo inline; exporte em **DOCX** (marca "RASCUNHO — validação humana").

## Endpoints (prefixo `/api`)
`GET /areas` · `GET /areas/{id}/map` · `GET /report/{id}` · `GET /report/{id}/temporal` ·
`GET /report/{id}/coincidencias` · `POST /report/{id}/section/{secao}/regenerate` ·
`PATCH /report/{id}/section/{secao}` · `POST /copilot/{id}/chat` (SSE) · `POST /copilot/{id}/apply` ·
`GET /report/{id}/export.docx`

## Guardrails de IA responsável
Decisão final humana (banner de rascunho) · foco no ambiente, não no indivíduo · texto livre
(Disque/RELINT) é **indício, não fato** · nunca inventar (declara ausência/baixa confiança) ·
cita a fonte de toda conclusão · LGPD (dados despersonalizados; copiloto sem SQL livre).

## Segurança
- A `ANTHROPIC_API_KEY` vive só no `.env` local (gitignored). **Revogue/gere outra após o evento.**
- Dados com PII (`dados/`, `dinamica_extraida.csv`, etc.) estão no `.gitignore`; alguns brutos já
  estavam no histórico do git — ver pendência no plano.
