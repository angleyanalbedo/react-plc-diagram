# @react-plc-diagram/react

Interactive React SVG viewer for ladder diagrams (LD) and function block
diagrams (FBD).

```bash
pnpm add @react-plc-diagram/react react react-dom
```

```tsx
import {
  OpenPlcViewer,
  parsePlcopenFbd,
  type OpenPlcProgram,
} from "@react-plc-diagram/react";
import "@react-plc-diagram/react/style.css";

const program: OpenPlcProgram = parsePlcopenFbd(xmlText, { pouName: "Main" });

export function Diagram() {
  return <OpenPlcViewer program={program} height={480} initialView="fit" />;
}
```

`OpenPlcViewer` supports mouse panning, pointer-centered wheel zoom, 100% reset,
fit-to-window, configurable controls and zoom limits, and viewport change events.
The PLCopen parser uses the browser's `DOMParser` implementation.

Licensed under the MIT License.

