# Modelo de Dados Normalizados — CompStat Rio

Esta pasta concentra as fontes do CompStat **já normalizadas**, prontas para a pipeline de IA que faz o *match* (o "bingo": sobrepor mancha criminal × fator urbano × dinâmica criminal numa mesma área). Os dados completos estão em `.csv` (sem limite de linha); `fato_unificado.csv` concentra as fontes pontuais no esquema canônico único; o `entendimento_dados_normalizados.xlsx` ajuda a inspecionar visualmente.

> **A chave que liga tudo é `area_fm_id`**, atribuída por *point-in-polygon* sobre os 8 polígonos da Força Municipal. O match raramente precisa de mais que um `GROUP BY area_fm_id`.

## 1. Tabelas destino

| Arquivo | Camada | Linhas | Chave principal | Descrição |
|---|---|---:|---|---|
| `silver/fact_ocorrencias.csv` | mancha_criminal | 115354 | area_fm_id + (ano,mes,hora,dia_semana) | Ocorrências de roubo georreferenciadas (fonte de verdade geográfica = WKT). |
| `silver/fact_disque_denuncia.csv` | dinamica_criminal | 18003 | area_fm_id | Denúncias-cabeça com geo (~99%) e relato_redacted; insumo do extrator de dinâmica. |
| `silver/fact_fatores_urbanos.csv` | fator_urbano | 2085 | area_fm_id + orgao_responsavel | Fatores urbanos (coordenadas corrigidas da inversão x/y) com órgão responsável. |
| `silver/fact_cameras.csv` | suporte | 985 | area_fm_id | Câmeras CIVITAS/COR; suporte operacional e cobertura. |
| `silver/agg_cpsr_area_ano.csv` | fator_urbano | 442 | area_fm_id + ano | CPSR agregado por área/bairro/ano (LGPD — sem nenhum dado individual). |
| `silver/dim_area_fm.csv` | suporte | 8 | area_fm_id (PK) | Os 8 polígonos da Força Municipal (geometria WKT). Eixo de junção espacial. |
| `silver/dim_dominio_territorial.csv` | dinamica_criminal | 1085 | area_fm_ids (interseção) | Domínio de facções (polígonos válidos no Rio); indício colaborativo. |
| `silver/dinamica_extraida.csv` | dinamica_criminal | 422 | area_fm_id + doc_id | Afirmações estruturadas extraídas de RELINTs/Disque por LLM, com citação e confiança. |
| `fato_unificado.csv` | (todas pontuais) | 136427 | area_fm_id | Concentra ocorrências + disque + fatores + câmeras no esquema canônico único. |
| `gold/area_brief.csv` | (consolidado) | 8 | area_fm_id (PK) | Perfil por área pronto para o match: o que o match consome e cruza. |
| `gold/gold_temporal.csv` | mancha_criminal | 1220 | area_fm_id + dia_semana + hora | Matriz temporal (contagem por dia × hora) para análise de pico. |
| `gold/gold_ocorrencias_tipo.csv` | mancha_criminal | 24 | area_fm_id + category | Distribuição de ocorrências por tipo de delito. |
| `gold/gold_fatores_orgao.csv` | fator_urbano | 129 | area_fm_id + category + orgao | Fatores por tipo e órgão responsável (alimenta o Plano de Ação). |

## 2. As três camadas do "bingo"

| Camada | Tabelas | O que responde |
|---|---|---|
| 🔴 Mancha criminal | `fact_ocorrencias` | Onde e quando o crime acontece |
| 🟡 Fator urbano | `fact_fatores_urbanos`, `agg_cpsr_area_ano` | Que condições ambientais facilitam |
| 🔵 Dinâmica criminal | `fact_disque_denuncia`, `dinamica_extraida`, `dim_dominio_territorial` | Como o crime opera (modus, rotas, facção) |
| ⚪ Suporte | `dim_area_fm`, `fact_cameras` | Recorte territorial e cobertura operacional |

Quando ≥2 camadas coincidem na mesma `area_fm_id`, é uma **coincidência de alto risco**. Quanto mais camadas sobrepostas, maior a prioridade.

## 3. Esquema canônico (`fact_spatial` / `fato_unificado`)

| Coluna | Tipo | Descrição |
|---|---|---|
| `fact_id` | texto | ID estável do fato: f"{source}:{linha}" |
| `source` | enum | Fonte: ocorrencias · disque_denuncia · fatores_urbanos · cameras · cpsr |
| `layer` | enum | Camada do bingo: mancha_criminal · fator_urbano · dinamica_criminal · suporte |
| `lat` | float | Latitude WGS84 (validada no bbox do Rio) |
| `lon` | float | Longitude WGS84 (validada no bbox do Rio) |
| `geom_quality` | enum | ok · repaired · out_of_bbox · missing — rastreabilidade do conserto geográfico |
| `area_fm_id` | int | Área FM atribuída por point-in-polygon (2/9/10/11/12/14/19/20) ou vazio |
| `area_fm_nome` | texto | Nome da subárea FM correspondente |
| `bairro` | texto | Bairro de origem (quando a fonte traz) |
| `ano` | int | Ano do fato (tempo canônico) |
| `mes` | int | Mês do fato (1-12) |
| `hora` | int | Hora do fato (0-23) |
| `dia_semana` | texto | Dia da semana normalizado (com acento) |
| `category` | texto | Categoria conforme a fonte (delito, fator, classe da denúncia, 'camera') |
| `orgao_responsavel` | texto | Órgão responsável (fatores urbanos) |
| `attributes_json` | json | Campos originais da fonte preservados (não destrói o formato de origem) |
| `prov_file` | texto | Arquivo de origem (proveniência) |
| `prov_row_id` | int | Linha de origem no arquivo (proveniência) |
| `ingested_at` | texto | Timestamp ISO da normalização |

## 4. Chaves e conexões

- **`area_fm_id` (eixo central):** vem de *point-in-polygon* (`fact.lat/lon` dentro de `dim_area_fm.geometry_wkt`). É a junção confiável entre todas as fontes.
- **`lat`/`lon` (WGS84):** permite proximidade/buffer e o próprio point-in-polygon.
- **`bairro`:** granularidade grossa, boa para agregação.
- **⚠️ Nome de área (evitar como chave):** `fact_cameras.nome_area_fm` tem 9 grafias que **não batem** com as 8 do shapefile (inclui "Lauro Müller", "Bangu"; falta "Rio Sul"). Por isso `area_fm_id` é sempre derivado de geometria, nunca de texto.

```mermaid
flowchart LR
  OC[fact_ocorrencias]:::m --> AFM[dim_area_fm]
  FU[fact_fatores_urbanos]:::f --> AFM
  DD[fact_disque_denuncia]:::d --> AFM
  CAM[fact_cameras]:::s --> AFM
  DIN[dinamica_extraida]:::d --> AFM
  DT[dim_dominio_territorial]:::d -. interseção .-> AFM
  CPSR[agg_cpsr_area_ano]:::f --> AFM
  AFM --> BR[gold/area_brief]
  classDef m fill:#ffd7d7; classDef f fill:#fff3cd; classDef d fill:#ffe5cc; classDef s fill:#e9ecef;
```

## 5. Cruzamentos sugeridos (responder as 4 perguntas norteadoras)

Exemplos em DuckDB (rode a partir desta pasta; DuckDB lê CSV nativamente):

**(a) Rota da FM — locais de maior incidência por área**
```sql
SELECT area_fm_id, category, count(*) AS n
FROM 'silver/fact_ocorrencias.csv'
WHERE area_fm_id IS NOT NULL
GROUP BY 1,2 ORDER BY area_fm_id, n DESC;
```

**(b) Horário/dias de patrulhamento vs pico criminal**
```sql
SELECT dia_semana, hora, count(*) AS n
FROM 'silver/fact_ocorrencias.csv'
WHERE area_fm_id = 20  -- Presidente Vargas
GROUP BY 1,2 ORDER BY n DESC LIMIT 5;
```

**(c) Modelo de emprego da FM (moto/a pé/viatura) — vem da dinâmica (LLM)**
```sql
SELECT area_fm_id, valor, trecho_fonte, confianca
FROM 'silver/dinamica_extraida.csv'
WHERE campo = 'deslocamento_autor' AND area_fm_id = 20;
```

**(d) Quais órgãos resolvem cada fator urbano (Plano de Ação)**
```sql
SELECT area_fm_id, category AS fator, orgao_responsavel, count(*) AS n
FROM 'silver/fact_fatores_urbanos.csv'
WHERE area_fm_id IS NOT NULL
GROUP BY 1,2,3 ORDER BY area_fm_id, n DESC;
```

**O "bingo" (sobreposição de camadas na mesma área):**
```sql
SELECT a.area_fm_id,
       (SELECT count(*) FROM 'silver/fact_ocorrencias.csv' o WHERE o.area_fm_id=a.area_fm_id) AS roubos,
       (SELECT count(*) FROM 'silver/fact_fatores_urbanos.csv' f WHERE f.area_fm_id=a.area_fm_id) AS fatores,
       (SELECT count(*) FROM 'silver/fact_disque_denuncia.csv' d WHERE d.area_fm_id=a.area_fm_id) AS denuncias
FROM 'silver/dim_area_fm.csv' a ORDER BY roubos DESC;
```

## 6. Avisos de qualidade e LGPD (por fonte)

- **Ocorrências:** só roubo (sem furto); coluna `data` original é lixo (datas falsas) — o tempo canônico usa `ano/mes/hora/dia_semana`; geografia vem do WKT. 36 pontos reparados.
- **Fatores urbanos:** coordenadas vinham invertidas no dicionário (`x`=lat, `y`=lon); já corrigido.
- **Disque Denúncia:** indício, não fato — `relato_redacted` tem PII mascarada (imperfeita); o bloco `envolvidos.*` (nome/idade/cor) **não** foi propagado. Citar a fonte.
- **Domínio territorial:** mapa colaborativo (não oficial); polígonos fora do Rio/quebrados foram descartados. Indício.
- **CPSR:** microdado individual sensível **não** sai daqui — só o agregado por área/bairro/ano (`agg_cpsr_area_ano`).
- **Granularidade:** MVP no nível de **área FM** (falta a geometria dos trechos viários para granularidade de segmento).
- **Governança:** todo `area_brief` é rascunho; priorização e decisão final são humanas.
