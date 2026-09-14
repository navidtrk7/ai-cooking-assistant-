"""Read-only seed catalog used for browsing and future recipe enrichment."""
import csv
from functools import lru_cache
from pathlib import Path
from typing import Any

CATALOG_PATH = Path(__file__).with_name("iranian_recipe_seed_catalog.csv")

@lru_cache(maxsize=1)
def get_recipe_catalog() -> list[dict[str, Any]]:
    with CATALOG_PATH.open(encoding="utf-8", newline="") as file:
        rows = list(csv.DictReader(file))
    for row in rows:
        row["prep_min"] = int(row["prep_min"])
        row["cook_min"] = int(row["cook_min"])
        row["total_min"] = row["prep_min"] + row["cook_min"]
        row["health_tags"] = row["health_tags"].split()
        row["ingredient_keywords"] = row["ingredient_keywords"].split()
    return rows
