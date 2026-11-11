# Django REST Framework — HTTP Test Mapping

Framework-specific **rules** only. All paths, `base_url`, auth URLs, and canonical `.http` files come from [`project-discovery.md`](project-discovery.md).

---

## What to read (order — locate files per project)

1. **View / ViewSet** — `@action`, `get_queryset`, `get_serializer_class`, `filter_queryset`, `action_alias`, `search_fields`, `ordering_fields`.
2. **URL routing** — router `basename`, `urlpatterns`, extra `path()` routes (defines prefix and resource name).
3. **`FilterSet`** (`filterset_class`) — filters, `lookup_expr`, custom methods, choices.
4. **Serializers** used by the view — fields, read-only, `validate_*`, nested validation.
5. **Model** — choices, constraints, `clean()`, validators affecting writes.
6. **Pagination class** — `page_size_query_param`, `max_page_size`.
7. **Permissions** — document only what is explicit; comment when RBAC is opaque.

Skip missing pieces. **Never invent** filters, actions, or choices.

---

## Variables block (adapt per project)

```http
@base_url = <from config or existing .http — include module prefix if any>
@access_token = {{ login.response.body.access }}   # adjust JSON path to project
@first_<resource>_id = {{ <list_name>.response.body.results.0.id }}
@nonexistent_id = 00000000-0000-0000-0000-000000000000
@malformed_uuid = not-a-uuid
```

Sign-in URL may be **outside** `@base_url` — take from `urls.py`, config, or sibling `.http`.

Seed credentials: use **only** values documented in project config, `.env.example`, README, or existing tests — never skill defaults.

---

## Section order

```
1. AUTHENTICATION (if API requires it)
2. LIST — filters, search, ordering, combined
3. COUNTS / aggregations (@action detail=False) when present
4. Other list-level @actions
5. DETAIL (retrieve)
6. UPDATE (partial_update / update)
7. Detail @actions (detail=True)
… CREATION when exposed
N. AUTH / METHOD ERRORS
```

---

## Mapping table (view → tests)

| In code                             | Generate                                                                          |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| `list`                              | Section 2 + filters + search + ordering                                           |
| `retrieve`                          | Detail — valid id + 404                                                           |
| `update` / `partial_update`         | Per-field valid/invalid                                                           |
| `create` / `destroy`                | When exposed                                                                      |
| `@action(detail=False)`             | Dedicated section                                                                 |
| `@action(detail=True)`              | Valid pk + 404 (+ malformed id)                                                   |
| `action_alias`                      | Case using alias URL                                                              |
| Each filter                         | valid + invalid                                                                   |
| `search_fields` / `ordering_fields` | coverage per field; ordering alias if any                                         |
| Pagination                          | small, above max, page 2, out-of-range                                            |
| Update validation                   | happy, enum/type errors, custom validators, read-only ignored, PUT vs PATCH cases |

See filter-type bullets in prior internal docs: Boolean, Char, method filters, MultipleChoice, Date — valid + invalid + empty where relevant.

---

## Section 1 template (auth from project)

```http
### 1.1 Signin (success)
# @name login
POST <signin_url from project>
Content-Type: application/json

{ "username": "<from config>", "password": "<from config>" }

### 1.2 Signin failure (expect 401)
...
```

---

## Section N template

```http
### N.1 No auth header (expect 401)
GET {{ base_url }}/<resource>/

### N.2 Invalid token (expect 401)
...

### N.3 OPTIONS
### N.4 HEAD
```

Add method-error cases for POST/DELETE only when routed or explicitly blocked.

---

## DRF checklist (add to common checklist)

- [ ] Auth block matches project (or N/A documented).
- [ ] Every `@action` has coverage or explicit N/A.
- [ ] Every `FilterSet` filter: valid + invalid.
- [ ] Search and ordering fields covered.
- [ ] Extra `get_queryset` filters covered.
- [ ] Pagination scenarios when paginated.
- [ ] Update/create validation and 404 on missing id.
- [ ] Detail-actions: valid + missing id (+ malformed when UUID).
