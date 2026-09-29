# React PLC Diagram

React PLC Diagram is a small, read-only SVG viewer for ladder diagrams (LD) and
function block diagrams (FBD). It renders a framework-independent diagram model
and includes mouse panning, pointer-centered wheel zoom, 100% reset, and fit-to-window controls.

## Packages

- `@react-plc-diagram/core` contains the TypeScript data model.
- `@react-plc-diagram/react` contains the React SVG viewer and PLCopen FBD parser.

## Install

```bash
pnpm add @react-plc-diagram/react react react-dom
```

React 18 and React 19 are supported.

## Render a diagram

```tsx
import {
  OpenPlcViewer,
  type OpenPlcProgram,
  type OpenPlcViewport,
} from "@react-plc-diagram/react";
import "@react-plc-diagram/react/style.css";

const program: OpenPlcProgram = {
  name: "Motor control",
  diagram: {
    language: "ld",
    bounds: { x: 0, y: 0, width: 500, height: 240 },
    nodes: [],
    edges: [],
  },
};

function App() {
  const handleViewportChange = (viewport: OpenPlcViewport) => {
    console.log(viewport.x, viewport.y, viewport.scale);
  };

  return (
    <OpenPlcViewer
      program={program}
      height={480}
      initialView="fit"
      minZoom={0.1}
      maxZoom={8}
      onViewportChange={handleViewportChange}
    />
  );
}
```

The canvas uses the diagram's existing bounds and edge points. Panning and zooming
change only the SVG view box; they do not mutate node or edge geometry.

## `OpenPlcViewer` props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `program` | `OpenPlcProgram` | required | LD or FBD program to render. |
| `className` | `string` | — | Class name applied to the viewer root. |
| `ariaLabel` | `string` | program name and language | Accessible SVG label. |
| `height` | CSS height | `340` | Canvas height. Numbers are CSS pixels. |
| `initialView` | `"fit" \| "actual-size"` | `"fit"` | Initial camera mode. |
| `showControls` | `boolean` | `true` | Shows zoom, reset, and fit controls. |
| `minZoom` | `number` | `0.1` | Minimum scale. |
| `maxZoom` | `number` | `8` | Maximum scale. |
| `onViewportChange` | `(viewport) => void` | — | Receives viewport changes from pan, zoom, fit, and resize. |

`OpenPlcViewport.x` and `.y` are the world coordinates at the canvas's top-left
corner. `scale` is the number of screen pixels per diagram unit, so `1` means 100%.

## Parse PLCopen FBD XML

`parsePlcopenFbd` uses the browser's `DOMParser`. It selects the first FBD by
default or a named POU when `pouName` is provided.

```tsx
import {
  OpenPlcViewer,
  parsePlcopenFbd,
  PlcopenFbdParseError,
} from "@react-plc-diagram/react";

try {
  const program = parsePlcopenFbd(xmlText, {
    pouName: "Main",
    name: "Production line",
  });
  return <OpenPlcViewer program={program} />;
} catch (error) {
  if (error instanceof PlcopenFbdParseError) {
    console.error(error.code, error.message);
  }
  throw error;
}
```

Parser error codes are `DOM_PARSER_UNAVAILABLE`, `INVALID_XML`, `POU_NOT_FOUND`,
and `FBD_NOT_FOUND`.

## Core model

The public model consists of `OpenPlcProgram`, `OpenPlcDiagram`, `OpenPlcNode`,
`OpenPlcPin`, `OpenPlcEdge`, `OpenPlcPoint`, and `OpenPlcBounds`. All model types
are exported from both packages, so React consumers normally need only
`@react-plc-diagram/react`.

The current release is a viewer. It does not edit diagram nodes, write PLCopen
XML, simulate PLC programs, or perform global automatic routing.

## License

[MIT](./LICENSE)
