"""Transformação das fontes para o esquema canônico (silver).

Cada fonte vira um `fact_spatial` no mesmo esquema (FACT_COLUMNS), ligado às áreas FM
por point-in-polygon. CPSR e domínio territorial têm tabelas próprias (LGPD / polígonos).
"""
import json
from datetime import datetime, timezone

import numpy as np
import pandas as pd
import shapely

from . import config as C
from . import geo

NOW = datetime.now(timezone.utc).isoformat(timespec="seconds")


# ----------------------------------------------------------------------------- helpers
def _attrs(df, cols):
    """Serializa as colunas originais como JSON por linha (acentos preservados)."""
    cols = [c for c in cols if c in df.columns]
    recs = df[cols].to_dict("records")
    return [
        json.dumps({k: (None if pd.isna(v) else v) for k, v in r.items()}, ensure_ascii=False)
        for r in recs
    ]


def _finalize_geo(lon, lat, repaired_mask, tree, fids, fid_to_nome):
    """Aplica geom_quality + bbox + point-in-polygon. Retorna (lon, lat, gq, area, nome)."""
    lon = np.asarray(lon, dtype="float64")
    lat = np.asarray(lat, dtype="float64")
    finite = np.isfinite(lon) & np.isfinite(lat)
    inb = finite & geo.in_bbox(lon, lat)

    gq = np.full(len(lon), "missing", dtype=object)
    gq[finite] = "ok"
    if repaired_mask is not None:
        gq[finite & np.asarray(repaired_mask, bool)] = "repaired"
    gq[finite & ~inb] = "out_of_bbox"

    area = geo.assign_area_fm(np.where(inb, lon, np.nan), np.where(inb, lat, np.nan), tree, fids)
    nome = [fid_to_nome.get(a) if a is not None else None for a in area]
    return lon, lat, gq, area, nome


def _assemble(source, layer, n, lon, lat, gq, area, nome, bairro, ano, mes, hora,
              dia_semana, category, orgao, attrs, prov_file):
    df = pd.DataFrame({
        "fact_id": [f"{source}:{i}" for i in range(n)],
        "source": source,
        "layer": layer,
        "lat": np.round(np.asarray(lat, "float64"), 7),
        "lon": np.round(np.asarray(lon, "float64"), 7),
        "geom_quality": gq,
        "area_fm_id": area,
        "area_fm_nome": nome,
        "bairro": bairro,
        "ano": ano,
        "mes": mes,
        "hora": hora,
        "dia_semana": dia_semana,
        "category": category,
        "orgao_responsavel": orgao,
        "attributes_json": attrs,
        "prov_file": prov_file,
        "prov_row_id": list(range(n)),
        "ingested_at": NOW,
    })
    return df[C.FACT_COLUMNS]


def _hora_int(series):
    return pd.to_numeric(series.astype(str).str.slice(0, 2), errors="coerce").astype("Int64")


# ----------------------------------------------------------------------------- dimensões
def dim_area_fm():
    fids, nomes, polys, _ = geo.load_area_polygons()
    return pd.DataFrame({
        "area_fm_id": fids,
        "nome_subarea": nomes,
        "geometry_wkt": [shapely.to_wkt(p) for p in polys],
    })


def dim_dominio(tree_areas, fids, fid_to_nome):
    df = pd.read_csv(C.F_DOMINIO, dtype=str)
    geoms = shapely.from_wkt(df["geometria"].fillna("").values)
    valid = shapely.is_valid(geoms) & ~shapely.is_missing(geoms)
    geoms = np.where(valid, geoms, shapely.make_valid(geoms))

    cent = shapely.centroid(geoms)
    clon, clat = shapely.get_x(cent), shapely.get_y(cent)
    in_rio = geo.in_bbox(clon, clat) & shapely.is_valid(geoms)

    rows = []
    for i in np.flatnonzero(in_rio):
        g = geoms[i]
        hit = tree_areas.query(g, predicate="intersects")
        area_ids = sorted({int(np.asarray(fids)[t]) for t in hit})
        rows.append({
            "territorio_id": i,
            "nome_territorio": df.iloc[i]["nome_territorio"],
            "dominio_orcrim": df.iloc[i]["dominio_orcrim"],
            "area_fm_ids": ";".join(str(a) for a in area_ids),
            "geom_quality": "ok" if valid[i] else "repaired",
            "geometry_wkt": shapely.to_wkt(g),
        })
    return pd.DataFrame(rows), int(len(df)), int(in_rio.sum())


# ----------------------------------------------------------------------------- fontes pontuais
def silver_ocorrencias(tree, fids, fid_to_nome):
    df = pd.read_csv(C.F_OCORRENCIAS, dtype=str)
    n = len(df)
    lon, lat = geo.parse_wkt_points(df["geometria"])
    miss = ~(np.isfinite(lon) & np.isfinite(lat))
    repaired = np.zeros(n, bool)
    if miss.any():
        clon, rlon = geo.fix_decimal_shift(pd.to_numeric(df["longitude"], errors="coerce"))
        clat, rlat = geo.fix_decimal_shift(pd.to_numeric(df["latitude"], errors="coerce"))
        lon = np.where(miss, clon, lon)
        lat = np.where(miss, clat, lat)
        repaired = miss & np.isfinite(lon) & np.isfinite(lat)
    lon, lat, gq, area, nome = _finalize_geo(lon, lat, repaired, tree, fids, fid_to_nome)
    dia = df["dia_semana"].astype(str).str.strip().str.lower().map(C.DIA_SEMANA_CANON)
    return _assemble(
        "ocorrencias", "mancha_criminal", n, lon, lat, gq, area, nome,
        bairro=None,
        ano=pd.to_numeric(df["ano"], errors="coerce").astype("Int64"),
        mes=pd.to_numeric(df["mes"], errors="coerce").astype("Int64"),
        hora=_hora_int(df["hora"]),
        dia_semana=dia,
        category=df["desc_delito"],
        orgao=None,
        attrs=_attrs(df, ["id_criptografado", "delito", "desc_delito", "aisp", "risp", "locf"]),
        prov_file=C.F_OCORRENCIAS.name,
    )


def silver_disque(tree, fids, fid_to_nome):
    raw = pd.read_csv(C.F_DISQUE, sep=";", encoding="latin-1", dtype=str)
    is_head = raw["numero_denuncia"].notna()
    grp = is_head.cumsum()
    # agrega filhos (assuntos/tipos/órgãos) por denúncia
    def _uniq(s):
        return ";".join(sorted({str(v) for v in s.dropna()}))
    agg = raw.groupby(grp).agg(
        assuntos=("assuntos.classe", _uniq),
        tipos=("assuntos.tipos.tipo", _uniq),
        orgaos=("orgaos.nome", _uniq),
    )
    df = raw[is_head].reset_index(drop=True)
    g = agg.loc[grp[is_head].values].reset_index(drop=True)
    df["_assuntos"], df["_tipos"], df["_orgaos"] = g["assuntos"], g["tipos"], g["orgaos"]
    n = len(df)

    lon = pd.to_numeric(df["longitude"].astype(str).str.replace(",", ".", regex=False), errors="coerce")
    lat = pd.to_numeric(df["latitude"].astype(str).str.replace(",", ".", regex=False), errors="coerce")
    lon, lat, gq, area, nome = _finalize_geo(lon, lat, None, tree, fids, fid_to_nome)

    dt = pd.to_datetime(df["data_denuncia"], format="%m/%d/%Y %H:%M:%S", errors="coerce")
    dia = dt.dt.weekday.map(lambda i: C.WEEKDAY_PT[int(i)] if pd.notna(i) else None)
    return _assemble(
        "disque_denuncia", "dinamica_criminal", n, lon, lat, gq, area, nome,
        bairro=df["bairro_logradouro"],
        ano=dt.dt.year.astype("Int64"),
        mes=dt.dt.month.astype("Int64"),
        hora=dt.dt.hour.astype("Int64"),
        dia_semana=dia,
        category=df["classe"],
        orgao=None,
        attrs=_attrs(df, ["id_denuncia", "numero_denuncia", "classe", "tipo", "logradouro",
                          "_assuntos", "_tipos", "_orgaos", "relato_redacted"]),
        prov_file=C.F_DISQUE.name,
    )


def silver_fatores(tree, fids, fid_to_nome):
    df = pd.read_csv(C.F_FATORES, dtype=str)
    n = len(df)
    # INVERSÃO: coordenada_x é latitude, coordenada_y é longitude
    lat = pd.to_numeric(df["coordenada_x"], errors="coerce")
    lon = pd.to_numeric(df["coordenada_y"], errors="coerce")
    lon, lat, gq, area, nome = _finalize_geo(lon, lat, None, tree, fids, fid_to_nome)
    return _assemble(
        "fatores_urbanos", "fator_urbano", n, lon, lat, gq, area, nome,
        bairro=df["bairro_nome"],
        ano=None, mes=None, hora=None, dia_semana=None,
        category=df["tipo_ocorrencia_descricao"],
        orgao=df["orgao_responsavel"],
        attrs=_attrs(df, ["id_resposta_ocorrencia", "logradouro", "subarea_nome", "valido",
                          "tipo_pessoa_descricao", "ocupacao_drogas_descricao", "item_praca_descricao"]),
        prov_file=C.F_FATORES.name,
    )


def silver_cameras(tree, fids, fid_to_nome):
    df = pd.read_csv(C.F_CAMERAS, dtype=str)
    n = len(df)
    lon, lat = geo.parse_wkt_points(df["geometry"])
    lon, lat, gq, area, nome = _finalize_geo(lon, lat, None, tree, fids, fid_to_nome)
    return _assemble(
        "cameras", "suporte", n, lon, lat, gq, area, nome,
        bairro=None, ano=None, mes=None, hora=None, dia_semana=None,
        category="camera", orgao=None,
        attrs=_attrs(df, ["id_ponto", "id_trecho", "nome_area_fm"]),
        prov_file=C.F_CAMERAS.name,
    )


def agg_cpsr(tree, fids, fid_to_nome):
    """Agregado LGPD: contagem de PSR por (área FM, bairro, ano). Nenhum dado individual."""
    df = pd.read_excel(C.F_CPSR, sheet_name="Censo_histórico", dtype=str)
    lat = pd.to_numeric(df["Latitude"], errors="coerce")
    lon = pd.to_numeric(df["Longitude"], errors="coerce")
    area = geo.assign_area_fm(lon, lat, tree, fids)  # apenas em memória
    out = pd.DataFrame({
        "area_fm_id": area,
        "bairro": df["Nome do Bairro"],
        "ano": pd.to_numeric(df["Ano"], errors="coerce").astype("Int64"),
    })
    g = out.groupby(["area_fm_id", "bairro", "ano"], dropna=False).size().reset_index(name="n_pessoas")
    g["area_fm_nome"] = g["area_fm_id"].map(lambda a: fid_to_nome.get(a) if pd.notna(a) else None)
    return g, int(len(df))
