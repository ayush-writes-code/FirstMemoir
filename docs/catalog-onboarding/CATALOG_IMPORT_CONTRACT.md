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
1. **Safety First**: The importer must support a strict `--dry-run` mode (default).
2. **Mutation Architecture**: 
   The catalog import follows a strict state machine:
   `DRY RUN` → `VALIDATED MANIFEST` → `BUSINESS APPROVAL` → `MUTATION IMPORT` → `POST-IMPORT VERIFICATION`
3. **Safety Switch**: The mutation mode will strictly require an explicit `--apply` flag. It must refuse to run if there are any `MISSING_DATA` or `BUSINESS_CONFIRMATION_REQUIRED` records unless bypassed explicitly per-record.
4. **No Invention**: If a required field is missing (e.g. price is "Generate XXX rupees"), the importer MUST flag it as `MISSING_DATA`.
5. **No Destructive Operations**: 
   - Uses `upsert` based on SKU or distinct slug. 
   - No `DELETE` commands. 
   - No `TRUNCATE` commands. 
   - No database resets (`prisma migrate reset`).
6. **Isolated Environments**: The catalog data is imported into standard PostgreSQL tables. The prototype data in `prototype-data.ts` will be deleted post-import.
