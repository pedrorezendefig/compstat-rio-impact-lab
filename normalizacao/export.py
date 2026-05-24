"""Entregáveis de entendimento: XLSX (dicionário + amostras) e MODELO_DE_DADOS.md (conexões)."""
import pandas as pd

from . import config as C

# Dicionário do esquema canônico (fact_spatial / fato_unificado)
DICIONARIO = [
    ("fact_id", "texto", "ID estável do fato: f\"{source}:{linha}\""),
    ("source", "enum", "Fonte: ocorrencias · disque_denuncia · fatores_urbanos · cameras · cpsr"),
    ("layer", "enum", "Camada do bingo: mancha_criminal · fator_urbano · dinamica_criminal · suporte"),
    ("lat", "float", "Latitude WGS84 (validada no bbox do Rio)"),
    ("lon", "float", "Longitude WGS84 (validada no bbox do Rio)"),
    ("geom_quality", "enum", "ok · repaired · out_of_bbox · missing — rastreabilidade do conserto geográfico"),
    ("area_fm_id", "int", "Área FM atribuída por point-in-polygon (2/9/10/11/12/14/19/20) ou vazio"),
    ("area_fm_nome", "texto", "Nome da subárea FM correspondente"),
    ("bairro", "texto", "Bairro de origem (quando a fonte traz)"),
    ("ano", "int", "Ano do fato (tempo canônico)"),
    ("mes", "int", "Mês do fato (1-12)"),
    ("hora", "int", "Hora do fato (0-23)"),
    ("dia_semana", "texto", "Dia da semana normalizado (com acento)"),
    ("category", "texto", "Categoria conforme a fonte (delito, fator, classe da denúncia, 'camera')"),
    ("orgao_responsavel", "texto", "Órgão responsável (fatores urbanos)"),
    ("attributes_json", "json", "Campos originais da fonte preservados (não destrói o formato de origem)"),
    ("prov_file", "texto", "Arquivo de origem (proveniência)"),
    ("prov_row_id", "int", "Linha de origem no arquivo (proveniência)"),
    ("ingested_at", "texto", "Timestamp ISO da normalização"),
]

# Inventário: (arquivo, camada, chave principal, descrição)
TABELAS = [
    ("silver/fact_ocorrencias.csv", "mancha_criminal", "area_fm_id + (ano,mes,hora,dia_semana)",
     "Ocorrências de roubo georreferenciadas (fonte de verdade geográfica = WKT)."),
    ("silver/fact_disque_denuncia.csv", "dinamica_criminal", "area_fm_id",
     "Denúncias-cabeça com geo (~99%) e relato_redacted; insumo do extrator de dinâmica."),
    ("silver/fact_fatores_urbanos.csv", "fator_urbano", "area_fm_id + orgao_responsavel",
     "Fatores urbanos (coordenadas corrigidas da inversão x/y) com órgão responsável."),
    ("silver/fact_cameras.csv", "suporte", "area_fm_id",
     "Câmeras CIVITAS/COR; suporte operacional e cobertura."),
    ("silver/agg_cpsr_area_ano.csv", "fator_urbano", "area_fm_id + ano",
     "CPSR agregado por área/bairro/ano (LGPD — sem nenhum dado individual)."),
    ("silver/dim_area_fm.csv", "suporte", "area_fm_id (PK)",
     "Os 8 polígonos da Força Municipal (geometria WKT). Eixo de junção espacial."),
    ("silver/dim_dominio_territorial.csv", "dinamica_criminal", "area_fm_ids (interseção)",
     "Domínio de facções (polígonos válidos no Rio); indício colaborativo."),
    ("silver/dinamica_extraida.csv", "dinamica_criminal", "area_fm_id + doc_id",
     "Afirmações estruturadas extraídas de RELINTs/Disque por LLM, com citação e confiança."),
    ("fato_unificado.csv", "(todas pontuais)", "area_fm_id",
     "Concentra ocorrências + disque + fatores + câmeras no esquema canônico único."),
    ("gold/area_brief.csv", "(consolidado)", "area_fm_id (PK)",
     "Perfil por área pronto para o match: o que o match consome e cruza."),
    ("gold/gold_temporal.csv", "mancha_criminal", "area_fm_id + dia_semana + hora",
     "Matriz temporal (contagem por dia × hora) para análise de pico."),
    ("gold/gold_ocorrencias_tipo.csv", "mancha_criminal", "area_fm_id + category",
     "Distribuição de ocorrências por tipo de delito."),
    ("gold/gold_fatores_orgao.csv", "fator_urbano", "area_fm_id + category + orgao",
     "Fatores por tipo e órgão responsável (alimenta o Plano de Ação)."),
]


def _count(path):
    try:
        return sum(1 for _ in open(path, encoding="utf-8")) - 1
    except Exception:
        return None


def build_xlsx():
    leiame = pd.DataFrame({"Camada de Normalização CompStat Rio": [
        "Este workbook serve para ENTENDER os dados normalizados (não é o dado completo).",
        "Os dados completos estão nos arquivos .csv (sem limite de linha) nas pastas silver/ e gold/.",
        "fato_unificado.csv concentra as 4 fontes pontuais no esquema canônico único.",
        "A chave que liga tudo é area_fm_id, atribuída por point-in-polygon nos 8 polígonos da FM.",
        "Veja MODELO_DE_DADOS.md para o mapa de conexões e os cruzamentos sugeridos (o 'bingo').",
        "",
        "Abas: 01_Tabelas (inventário) · 02_Dicionario (esquema canônico) · 03_Conexoes ·",
        "      04_area_brief (perfil por área) · amostras das tabelas.",
    ]})

    inv = pd.DataFrame(
        [(t[0], t[1], _count(C.OUT / t[0]), t[2], t[3]) for t in TABELAS],
        columns=["arquivo", "camada", "linhas", "chave_principal", "descricao"],
    )
    dic = pd.DataFrame(DICIONARIO, columns=["coluna", "tipo", "descricao"])
    conx = pd.DataFrame(CONEXOES, columns=["de", "para", "chave", "tipo", "para_que_serve"])

    out = C.OUT / "entendimento_dados_normalizados.xlsx"
    with pd.ExcelWriter(out, engine="openpyxl") as xl:
        leiame.to_excel(xl, sheet_name="00_Leia-me", index=False)
        inv.to_excel(xl, sheet_name="01_Tabelas", index=False)
        dic.to_excel(xl, sheet_name="02_Dicionario", index=False)
        conx.to_excel(xl, sheet_name="03_Conexoes", index=False)
        pd.read_csv(C.OUT_GOLD / "area_brief.csv").to_excel(xl, sheet_name="04_area_brief", index=False)
        # amostras (grandes = head 100; pequenas = completas)
        amostras = {
            "amostra_ocorrencias": ("silver/fact_ocorrencias.csv", 100),
            "amostra_disque": ("silver/fact_disque_denuncia.csv", 100),
            "amostra_fatores": ("silver/fact_fatores_urbanos.csv", 100),
            "amostra_cameras": ("silver/fact_cameras.csv", 100),
            "agg_cpsr_area_ano": ("silver/agg_cpsr_area_ano.csv", None),
            "amostra_dominio": ("silver/dim_dominio_territorial.csv", 50),
        }
        for sheet, (rel, n) in amostras.items():
            df = pd.read_csv(C.OUT / rel)
            (df.head(n) if n else df).to_excel(xl, sheet_name=sheet, index=False)
    return out


# Conexões: (de, para, chave, tipo, para_que_serve)
CONEXOES = [
    ("fact_ocorrencias", "dim_area_fm", "area_fm_id", "N:1 (point-in-polygon)",
     "Recorta a mancha criminal por área FM."),
    ("fact_fatores_urbanos", "dim_area_fm", "area_fm_id", "N:1 (point-in-polygon)",
     "Recorta os fatores urbanos por área FM."),
    ("fact_disque_denuncia", "dim_area_fm", "area_fm_id", "N:1 (point-in-polygon)",
     "Recorta a dinâmica criminal (denúncias) por área."),
    ("fact_cameras", "dim_area_fm", "area_fm_id", "N:1 (point-in-polygon)",
     "Cobertura de câmeras por área (suporte operacional)."),
    ("dinamica_extraida", "dim_area_fm", "area_fm_id", "N:1",
     "Liga as afirmações qualitativas (LLM) à área."),
    ("dim_dominio_territorial", "dim_area_fm", "area_fm_ids", "N:N (interseção espacial)",
     "Facções que influenciam cada área."),
    ("fact_ocorrencias × fact_fatores_urbanos × dinamica_extraida", "(o bingo)", "area_fm_id", "cruzamento de camadas",
     "Sobrepõe mancha × fator × dinâmica na mesma área = coincidência de alto risco."),
    ("fact_ocorrencias", "gold_temporal", "area_fm_id + dia_semana + hora", "derivação",
     "Matriz temporal para descobrir o pico (horário de cobertura da FM)."),
]


def build_modelo_md():
    """Gera MODELO_DE_DADOS.md — dicionário, mapa de conexões e cruzamentos sugeridos."""
    L = []
    a = L.append
    a("# Modelo de Dados Normalizados — CompStat Rio\n")
    a("Esta pasta concentra as fontes do CompStat **já normalizadas**, prontas para a pipeline "
      "de IA que faz o *match* (o \"bingo\": sobrepor mancha criminal × fator urbano × dinâmica "
      "criminal numa mesma área). Os dados completos estão em `.csv` (sem limite de linha); "
      "`fato_unificado.csv` concentra as fontes pontuais no esquema canônico único; o "
      "`entendimento_dados_normalizados.xlsx` ajuda a inspecionar visualmente.\n")
    a("> **A chave que liga tudo é `area_fm_id`**, atribuída por *point-in-polygon* sobre os 8 "
      "polígonos da Força Municipal. O match raramente precisa de mais que um `GROUP BY area_fm_id`.\n")

    a("## 1. Tabelas destino\n")
    a("| Arquivo | Camada | Linhas | Chave principal | Descrição |")
    a("|---|---|---:|---|---|")
    for arq, camada, chave, desc in TABELAS:
        n = _count(C.OUT / arq)
        a(f"| `{arq}` | {camada} | {n if n is not None else '—'} | {chave} | {desc} |")
    a("")

    a("## 2. As três camadas do \"bingo\"\n")
    a("| Camada | Tabelas | O que responde |")
    a("|---|---|---|")
    a("| 🔴 Mancha criminal | `fact_ocorrencias` | Onde e quando o crime acontece |")
    a("| 🟡 Fator urbano | `fact_fatores_urbanos`, `agg_cpsr_area_ano` | Que condições ambientais facilitam |")
    a("| 🔵 Dinâmica criminal | `fact_disque_denuncia`, `dinamica_extraida`, `dim_dominio_territorial` | Como o crime opera (modus, rotas, facção) |")
    a("| ⚪ Suporte | `dim_area_fm`, `fact_cameras` | Recorte territorial e cobertura operacional |")
    a("\nQuando ≥2 camadas coincidem na mesma `area_fm_id`, é uma **coincidência de alto risco**. "
      "Quanto mais camadas sobrepostas, maior a prioridade.\n")

    a("## 3. Esquema canônico (`fact_spatial` / `fato_unificado`)\n")
    a("| Coluna | Tipo | Descrição |")
    a("|---|---|---|")
    for col, tipo, desc in DICIONARIO:
        a(f"| `{col}` | {tipo} | {desc} |")
    a("")

    a("## 4. Chaves e conexões\n")
    a("- **`area_fm_id` (eixo central):** vem de *point-in-polygon* (`fact.lat/lon` dentro de "
      "`dim_area_fm.geometry_wkt`). É a junção confiável entre todas as fontes.")
    a("- **`lat`/`lon` (WGS84):** permite proximidade/buffer e o próprio point-in-polygon.")
    a("- **`bairro`:** granularidade grossa, boa para agregação.")
    a("- **⚠️ Nome de área (evitar como chave):** `fact_cameras.nome_area_fm` tem 9 grafias que "
      "**não batem** com as 8 do shapefile (inclui \"Lauro Müller\", \"Bangu\"; falta \"Rio Sul\"). "
      "Por isso `area_fm_id` é sempre derivado de geometria, nunca de texto.\n")
    a("```mermaid")
    a("flowchart LR")
    a("  OC[fact_ocorrencias]:::m --> AFM[dim_area_fm]")
    a("  FU[fact_fatores_urbanos]:::f --> AFM")
    a("  DD[fact_disque_denuncia]:::d --> AFM")
    a("  CAM[fact_cameras]:::s --> AFM")
    a("  DIN[dinamica_extraida]:::d --> AFM")
    a("  DT[dim_dominio_territorial]:::d -. interseção .-> AFM")
    a("  CPSR[agg_cpsr_area_ano]:::f --> AFM")
    a("  AFM --> BR[gold/area_brief]")
    a("  classDef m fill:#ffd7d7; classDef f fill:#fff3cd; classDef d fill:#ffe5cc; classDef s fill:#e9ecef;")
    a("```\n")

    a("## 5. Cruzamentos sugeridos (responder as 4 perguntas norteadoras)\n")
    a("Exemplos em DuckDB (rode a partir desta pasta; DuckDB lê CSV nativamente):\n")
    a("**(a) Rota da FM — locais de maior incidência por área**")
    a("```sql")
    a("SELECT area_fm_id, category, count(*) AS n")
    a("FROM 'silver/fact_ocorrencias.csv'")
    a("WHERE area_fm_id IS NOT NULL")
    a("GROUP BY 1,2 ORDER BY area_fm_id, n DESC;")
    a("```\n")
    a("**(b) Horário/dias de patrulhamento vs pico criminal**")
    a("```sql")
    a("SELECT dia_semana, hora, count(*) AS n")
    a("FROM 'silver/fact_ocorrencias.csv'")
    a("WHERE area_fm_id = 20  -- Presidente Vargas")
    a("GROUP BY 1,2 ORDER BY n DESC LIMIT 5;")
    a("```\n")
    a("**(c) Modelo de emprego da FM (moto/a pé/viatura) — vem da dinâmica (LLM)**")
    a("```sql")
    a("SELECT area_fm_id, valor, trecho_fonte, confianca")
    a("FROM 'silver/dinamica_extraida.csv'")
    a("WHERE campo = 'deslocamento_autor' AND area_fm_id = 20;")
    a("```\n")
    a("**(d) Quais órgãos resolvem cada fator urbano (Plano de Ação)**")
    a("```sql")
    a("SELECT area_fm_id, category AS fator, orgao_responsavel, count(*) AS n")
    a("FROM 'silver/fact_fatores_urbanos.csv'")
    a("WHERE area_fm_id IS NOT NULL")
    a("GROUP BY 1,2,3 ORDER BY area_fm_id, n DESC;")
    a("```\n")
    a("**O \"bingo\" (sobreposição de camadas na mesma área):**")
    a("```sql")
    a("SELECT a.area_fm_id,")
    a("       (SELECT count(*) FROM 'silver/fact_ocorrencias.csv' o WHERE o.area_fm_id=a.area_fm_id) AS roubos,")
    a("       (SELECT count(*) FROM 'silver/fact_fatores_urbanos.csv' f WHERE f.area_fm_id=a.area_fm_id) AS fatores,")
    a("       (SELECT count(*) FROM 'silver/fact_disque_denuncia.csv' d WHERE d.area_fm_id=a.area_fm_id) AS denuncias")
    a("FROM 'silver/dim_area_fm.csv' a ORDER BY roubos DESC;")
    a("```\n")

    a("## 6. Avisos de qualidade e LGPD (por fonte)\n")
    a("- **Ocorrências:** só roubo (sem furto); coluna `data` original é lixo (datas falsas) — o "
      "tempo canônico usa `ano/mes/hora/dia_semana`; geografia vem do WKT. 36 pontos reparados.")
    a("- **Fatores urbanos:** coordenadas vinham invertidas no dicionário (`x`=lat, `y`=lon); já corrigido.")
    a("- **Disque Denúncia:** indício, não fato — `relato_redacted` tem PII mascarada (imperfeita); "
      "o bloco `envolvidos.*` (nome/idade/cor) **não** foi propagado. Citar a fonte.")
    a("- **Domínio territorial:** mapa colaborativo (não oficial); polígonos fora do Rio/quebrados foram descartados. Indício.")
    a("- **CPSR:** microdado individual sensível **não** sai daqui — só o agregado por área/bairro/ano (`agg_cpsr_area_ano`).")
    a("- **Granularidade:** MVP no nível de **área FM** (falta a geometria dos trechos viários para granularidade de segmento).")
    a("- **Governança:** todo `area_brief` é rascunho; priorização e decisão final são humanas.\n")

    out = C.OUT / "MODELO_DE_DADOS.md"
    out.write_text("\n".join(L), encoding="utf-8")
    return out
