"""Singletons compartilhados: conexão DuckDB read-only (com lock) e cache de geometrias.

DuckDB lê os CSVs nativamente via read_csv_auto; uma única conexão em memória é
reusada e cada consulta roda num cursor próprio protegido por lock (as queries são
de milissegundos e somente leitura).
"""
from __future__ import annotations

import threading
from typing import Any, Dict, List, Optional, Sequence

import duckdb

from . import config

_con: Optional[duckdb.DuckDBPyConnection] = None
_lock = threading.Lock()


def _get_con() -> duckdb.DuckDBPyConnection:
    global _con
    if _con is None:
        _con = duckdb.connect(database=":memory:")
    return _con


def query(sql: str, params: Optional[Sequence[Any]] = None) -> List[Dict[str, Any]]:
    """Executa um SELECT e devolve uma lista de dicts (uma por linha)."""
    con = _get_con()
    with _lock:
        cur = con.cursor()
        cur.execute(sql, list(params) if params else [])
        cols = [d[0] for d in cur.description]
        rows = cur.fetchall()
    return [dict(zip(cols, r)) for r in rows]


def query_one(sql: str, params: Optional[Sequence[Any]] = None) -> Optional[Dict[str, Any]]:
    rows = query(sql, params)
    return rows[0] if rows else None


def gold(name: str) -> str:
    """Caminho (string) de um CSV da camada gold, para uso em read_csv_auto."""
    return str(config.OUT_GOLD / name)


def silver(name: str) -> str:
    return str(config.OUT_SILVER / name)
