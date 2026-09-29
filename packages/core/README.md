# @react-plc-diagram/core

Framework-independent TypeScript model for ladder diagrams (LD) and function
block diagrams (FBD).

```bash
pnpm add @react-plc-diagram/core
```

```ts
import type { OpenPlcProgram } from "@react-plc-diagram/core";

const program: OpenPlcProgram = {
  name: "Motor control",
  diagram: {
    language: "ld",
    bounds: { x: 0, y: 0, width: 500, height: 240 },
    nodes: [],
    edges: [],
  },
};
```

The package exports `OpenPlcProgram`, `OpenPlcDiagram`, `OpenPlcNode`,
`OpenPlcPin`, `OpenPlcEdge`, `OpenPlcPoint`, `OpenPlcBounds`, and their related
union types. It has no runtime dependencies.

Licensed under the MIT License.

