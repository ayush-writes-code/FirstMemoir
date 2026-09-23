# Catalog Import Contract

*Defines the structure, required fields, and mapping logic for transferring the verified FirstMemoir source catalog into the Prisma database.*

## 1. Schema Mapping Contract

### `Product`
| Field | Source Mapping | Classification | Notes |
|---|---|---|---|
| `id` | Generated (UUID) | DERIVED | - |
| `name` | Extracted from `info.txt` | **REQUIRED** | Cleaned of any metadata/pricing text |
| `slug` | Derived from `name` | DERIVED | URL-safe, lowercase, hyphen-separated |
| `description` | Provided by Client | **BUSINESS_CONFIRMATION_REQUIRED** | Source info.txt does NOT contain product descriptions |
| `base_price` | Extracted from `info.txt` | **REQUIRED** | Must resolve items with `[Generate XXX rupees]` |
| `compare_at_price`| Extracted from `info.txt` | OPTIONAL | e.g. "strike price" from source |
| `sku` | Extracted or Generated | **BUSINESS_CONFIRMATION_REQUIRED** | Policy approval pending for generated SKUs |
| `is_active` | Default to `true` | DERIVED | - |

### `ProductOption` & `ProductOptionValue` (Variants)
| Field | Source Mapping | Classification | Notes |
|---|---|---|---|
| `name` | E.g. "Design", "Player", "Size" | **BUSINESS_CONFIRMATION_REQUIRED** | Must determine if F&F Cars / Motivations are variants vs separate products |
| `value` | E.g. folder name ("Lambo", "Messi")| **BUSINESS_CONFIRMATION_REQUIRED** | Pending above decision |

### `ProductImage` (Assets)
| Field | Source Mapping | Classification | Notes |
|---|---|---|---|
| `url` | R2 Public URL | DERIVED | Mapped after R2 upload |
| `alt_text`| Derived from folder/file name | DERIVED | - |
| `order` | Based on filename sequence | DERIVED | Typically `-1.jpg` is `0`, `-2.jpg` is `1` |

### `MockupMetadata` & `ManufacturingMetadata`
| Field | Source Mapping | Classification | Notes |
|---|---|---|---|
| `print_width/height`| Dimensions from client | **BUSINESS_CONFIRMATION_REQUIRED** | Source lacks definitive print dimensions |
| `packaging_size` | Box mapping | **BUSINESS_CONFIRMATION_REQUIRED** | Requires cardinality mapping |

---

## 2. Importer Behavior Rules
1. **Safety First**: The importer must support a strict `--dry-run` mode.
2. **No Invention**: If a required field is missing (e.g. price is "Generate XXX rupees"), the importer MUST flag it as `MISSING_DATA` and refuse to import the record unless explicitly bypassed.
3. **No Destructive Drops**: The importer should `upsert` based on SKU or distinct slug. It should not perform a `TRUNCATE` or `DELETE` on existing catalog records.
4. **Isolated Environments**: The catalog data is imported into standard PostgreSQL tables. The prototype data in `prototype-data.ts` will be deleted post-import.
