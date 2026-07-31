# Taste

## Workflow & deliverables

- Prefers full codebase reviews/analyses to be written out to a project file (e.g., `.agent/output.txt`) containing the complete analysis plus a prioritized roadmap of what to build next, rather than delivered only as a chat summary. Confidence: 0.95
- Wants a persistent always-loaded agent contract file (e.g., `AGENTS.md`) at the repo root that agents read at the start of every prompt — recording non-negotiable rules, codebase conventions, and standing decisions — mirroring the convention used in sibling projects. Confidence: 0.9
- Prefers keeping the project minimal and self-contained over pulling in external systems (e.g., sibling IAM/UI libraries) unless there's a clear, low-risk win — in a final-year project context, favors "keep it minimal" and explicitly records integration decisions in the roadmap file rather than leaving them open. Confidence: 0.75
- Wants the project's agent docs (`.agent/output.txt`, `AGENTS.md`) kept continuously in sync with the actual codebase state — verified against the code (git log, greps, file listings) before calling them current, with version banners bumped, completed items marked `[DONE]`, and spec items that were never implemented flagged honestly as gaps rather than implied to exist. Confidence: 0.85
- When an integration option is abandoned, prefers scrubbing all mentions of it from the docs entirely (no lingering "don't use X" warnings or rationale), while genuinely deferred alternatives are marked as on hold / "awaiting" with a pointer to the decision record — docs should reflect only the current decision state. Confidence: 0.7
