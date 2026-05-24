"""Conversão de geometria WKT para GeoJSON (usado no mapa de segmentos quentes)."""
from __future__ import annotations

from typing import Any, Dict

from shapely.geometry import mapping
from shapely.wkt import loads as wkt_loads


def wkt_to_geojson(wkt_str: str) -> Dict[str, Any]:
    """Converte uma string WKT (polígono da área FM) num dict GeoJSON de geometria."""
    geom = wkt_loads(wkt_str)
    return mapping(geom)


def feature(geometry: Dict[str, Any], properties: Dict[str, Any]) -> Dict[str, Any]:
    return {"type": "Feature", "geometry": geometry, "properties": properties}


def feature_collection(features: list) -> Dict[str, Any]:
    return {"type": "FeatureCollection", "features": features}


def point_feature(lon: float, lat: float, properties: Dict[str, Any]) -> Dict[str, Any]:
    return feature({"type": "Point", "coordinates": [lon, lat]}, properties)
