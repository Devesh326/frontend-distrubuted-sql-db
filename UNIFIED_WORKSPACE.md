# Combined cluster playground

Branch: `ui/unified-workspace`, based on frontend checkpoint `6eca9f7`.
Backend compatibility: the existing failure-demo backend checkpoint; no backend
or control API changes are required by this interface change.

The Playground navigation item now opens one workspace containing the live cluster
graph and SQL console. The console sits beside the graph on wide screens and below
it on smaller screens. Hide SQL expands the graph without discarding the draft,
results or an already submitted request. Navigating to another page also preserves
the console instead of cancelling its display controller.

Use the existing node drawers to stop/start physical storage nodes, coordinators
and metadata members, or hold/resume automatic recovery. Then run SQL in the same
workspace and inspect Results, Execution or History. Queries use the existing live
backend API. Query replay highlights coordinator-recorded targets on the graph;
it does not manufacture live traffic or Raft replication packets. Replay speed
changes only the display. The separate cinematic camera control is not exposed
in this combined view.

## Validation

The retained local evidence is in workspace `.ui-unified-evidence`.

- All 21 frontend regression tests passed; production TypeScript/Vite build and
  lint passed. Lint retains two existing Fast Refresh warnings.
- Browser storage-leader Stop reached Docker, both replacement leaders appeared,
  and a subsequent query returned the retained row while the original leader was
  off. Browser Start restored the original container.
- Browser coordinator Stop persisted Hold; SQL executed through the surviving
  coordinator. Resume automatic restored the stopped coordinator.
- Browser metadata-leader Stop persisted Hold, the graph showed the replacement
  leader and SQL remained usable. Resume automatic restored the held member.
- Keyboard query execution, backend rejection of unsupported SQL, recorded
  execution steps, successful-query history, draft preservation across navigation,
  and console collapse during a submitted query were checked in the browser.

These are focused interface/failure-workflow checks, not a new full backend race,
security or exhaustive failure-suite result. The deployment remains one shared
cluster; this change does not provision independent environments for visitors.

## Local preview

The isolated preview at `http://127.0.0.1:8088/` mounts this checkout's `dist/`
directory. Run `npm test`, `npm run build` and `npm run lint` in this checkout;
reload the preview after a successful build. The original frontend checkout and
backend packaged bundle are preserved separately. For a normal paired checkout,
use this frontend branch when running the backend's existing packaging script.
