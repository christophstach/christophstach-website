import { HydrationScript } from "@solidjs/web";
import type { ParentProps } from "solid-js";

// The document shell, picked up by the src/Document.* convention.
export default function Document(props: ParentProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <HydrationScript />
      </head>
      <body>{props.children}</body>
    </html>
  );
}
