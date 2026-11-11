# Bug Log

### B-001 - New-entry URL was immutable  [v1.1 / task 5]

| Field | Detail |
| :--- | :--- |
| **Observed Behavior** | A new note always used the active URL. Users could not create a site-wide URL rule. |
| **Design Vulnerability** | The editor used one read-only URL field for new and existing entries. Grouping required strict URL equality. |
| **Structural Resolution** | New entries unlock the URL field. Storage validates exact URLs and `*` patterns. Grouping now calls one safe pattern matcher. |
| **Design Heuristic** | Lock identity after creation, but permit scoped identity input before creation. |

`src/storage.js`, `popup.js`
