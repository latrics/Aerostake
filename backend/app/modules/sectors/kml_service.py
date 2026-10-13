import io
import math
import re
import zipfile
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple
from defusedxml import ElementTree as ET
from fastapi import HTTPException, status


@dataclass
class ParsedSectorGeometry:
    sector_code: str
    name: str
    description: Optional[str]
    target_area_sqkm: float
    geojson: Dict[str, Any]
    centroid: Dict[str, float]
    bbox: List[float]
    polygon_coordinates: Dict[str, Any]


def calculate_geodetic_area_sqkm(coords: List[Tuple[float, float]]) -> float:
    """
    Calculate the surface area of a polygon on the WGS-84 Earth ellipsoid
    in square kilometers using spherical excess algorithm.
    coords: list of (longitude, latitude) tuples.
    """
    if len(coords) < 3:
        return 0.0

    R = 6378137.0  # Equatorial radius in meters
    rad_coords = [(math.radians(pt[0]), math.radians(pt[1])) for pt in coords]

    # Ensure closed polygon
    if rad_coords[0] != rad_coords[-1]:
        rad_coords.append(rad_coords[0])

    total = 0.0
    n = len(rad_coords) - 1
    for i in range(n):
        p1 = rad_coords[i]
        p2 = rad_coords[i + 1]
        total += (p2[0] - p1[0]) * (2 + math.sin(p1[1]) + math.sin(p2[1]))

    area_sqm = abs(total * R * R / 2.0)
    return area_sqm / 1_000_000.0


def parse_kml_coordinates(coord_text: str) -> List[Tuple[float, float]]:
    """
    Extracts (lng, lat) tuples from a KML <coordinates> text node.
    KML formats are space or newline separated tuples: lng,lat,alt or lng,lat
    """
    cleaned = coord_text.strip()
    raw_tuples = re.split(r"\s+", cleaned)
    points: List[Tuple[float, float]] = []

    for raw in raw_tuples:
        if not raw:
            continue
        parts = raw.split(",")
        if len(parts) >= 2:
            try:
                lng = float(parts[0].strip())
                lat = float(parts[1].strip())
                # Validate range
                if -180.0 <= lng <= 180.0 and -90.0 <= lat <= 90.0:
                    points.append((lng, lat))
            except ValueError:
                continue

    # Ensure polygon is closed for GeoJSON
    if points and points[0] != points[-1]:
        points.append(points[0])

    return points


def extract_sector_code(name: str, fallback_idx: int) -> str:
    """
    Extracts a concise sector code like 'S1', 'S2', 'SEC-01' from Placemark name.
    Falls back to 'S{fallback_idx}' if no code pattern is detected.
    """
    if not name:
        return f"S{fallback_idx}"

    clean = name.strip()

    # Match S1, S01, S-1, S_1
    m = re.search(r"\bS\s*[-_]?\s*(\d+)\b", clean, re.IGNORECASE)
    if m:
        return f"S{int(m.group(1))}"

    # Match Sector 1, Sector-01, Sector_1
    m = re.search(r"\bSector\s*[-_]?\s*(\d+)\b", clean, re.IGNORECASE)
    if m:
        return f"S{int(m.group(1))}"

    # Match SEC 1, SEC-01
    m = re.search(r"\bSEC\s*[-_]?\s*(\w+)\b", clean, re.IGNORECASE)
    if m:
        return f"SEC-{m.group(1).upper()}"

    return f"S{fallback_idx}"


class KMLParserService:
    """Service to safely parse KML/KMZ files and extract sectorised flight polygons."""

    @staticmethod
    def parse_kml_or_kmz(file_bytes: bytes, filename: str) -> List[ParsedSectorGeometry]:
        if not file_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded KML/KMZ file is empty.",
            )

        kml_content: str = ""

        # Handle KMZ compressed archive
        if filename.lower().endswith(".kmz") or file_bytes[:4] == b"PK\x03\x04":
            try:
                with zipfile.ZipFile(io.BytesIO(file_bytes)) as zf:
                    # Look for doc.kml or any .kml file
                    kml_names = [n for n in zf.namelist() if n.lower().endswith(".kml")]
                    if not kml_names:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail="KMZ archive contains no .kml document.",
                        )
                    target_kml = "doc.kml" if "doc.kml" in kml_names else kml_names[0]
                    with zf.open(target_kml) as kml_file:
                        kml_content = kml_file.read().decode("utf-8", errors="replace")
            except Exception as e:
                if isinstance(e, HTTPException):
                    raise e
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to uncompress KMZ archive: {str(e)}",
                )
        else:
            kml_content = file_bytes.decode("utf-8", errors="replace")

        # Parse XML tree
        try:
            root = ET.fromstring(kml_content)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid XML syntax in KML file: {str(e)}",
            )

        # Helper to find elements ignoring namespace prefixes
        def find_all_by_local_name(element: ET.Element, local_name: str) -> List[ET.Element]:
            matches = []
            for elem in element.iter():
                tag_local = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag
                if tag_local.lower() == local_name.lower():
                    matches.append(elem)
            return matches

        placemarks = find_all_by_local_name(root, "Placemark")
        if not placemarks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No Placemarks found in KML file. Ensure the KML contains sector polygons.",
            )

        parsed_sectors: List[ParsedSectorGeometry] = []
        sector_idx = 1

        for pm in placemarks:
            # Check for polygon coordinates
            polygon_nodes = find_all_by_local_name(pm, "Polygon")
            if not polygon_nodes:
                continue

            # Extract Placemark name and description
            name_nodes = find_all_by_local_name(pm, "name")
            desc_nodes = find_all_by_local_name(pm, "description")

            name_val = name_nodes[0].text.strip() if name_nodes and name_nodes[0].text else ""
            desc_val = desc_nodes[0].text.strip() if desc_nodes and desc_nodes[0].text else None

            # Get coordinates from outerBoundaryIs
            coords_nodes = find_all_by_local_name(polygon_nodes[0], "coordinates")
            if not coords_nodes or not coords_nodes[0].text:
                continue

            points = parse_kml_coordinates(coords_nodes[0].text)
            if len(points) < 4:  # At least 3 points + closing point
                continue

            sector_code = extract_sector_code(name_val, sector_idx)
            area_sqkm = calculate_geodetic_area_sqkm(points)

            # Bounding box & Centroid
            lngs = [p[0] for p in points]
            lats = [p[1] for p in points]
            min_lng, max_lng = min(lngs), max(lngs)
            min_lat, max_lat = min(lats), max(lats)
            centroid_lng = round((min_lng + max_lng) / 2.0, 6)
            centroid_lat = round((min_lat + max_lat) / 2.0, 6)

            geojson_geometry = {
                "type": "Polygon",
                "coordinates": [[[round(p[0], 6), round(p[1], 6)] for p in points]],
            }

            poly_coords_payload = {
                "geojson": geojson_geometry,
                "centroid": {"lng": centroid_lng, "lat": centroid_lat},
                "bbox": [round(min_lng, 6), round(min_lat, 6), round(max_lng, 6), round(max_lat, 6)],
                "planning": {
                    "sector_name": name_val or f"Sector {sector_code}",
                    "target_area_sqkm": area_sqkm,
                    "planned_sorties": 1,
                    "description": desc_val,
                },
                "flight_logs": [],
            }

            parsed_sectors.append(
                ParsedSectorGeometry(
                    sector_code=sector_code,
                    name=name_val or f"Sector {sector_code}",
                    description=desc_val,
                    target_area_sqkm=area_sqkm,
                    geojson=geojson_geometry,
                    centroid={"lng": centroid_lng, "lat": centroid_lat},
                    bbox=[min_lng, min_lat, max_lng, max_lat],
                    polygon_coordinates=poly_coords_payload,
                )
            )
            sector_idx += 1

        if not parsed_sectors:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="KML file contains Placemarks, but none contain valid closed Polygon geometries.",
            )

        # Natural numerical sort (S1, S2, ... S9, S10, ... S100)
        def natural_sort_key(s: ParsedSectorGeometry):
            nums = re.findall(r"\d+", s.sector_code)
            return (int(nums[0]) if nums else 0, s.sector_code)

        parsed_sectors.sort(key=natural_sort_key)
        return parsed_sectors


kml_parser_service = KMLParserService()
