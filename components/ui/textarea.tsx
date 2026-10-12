"use client";

import * as React from "react";
import { TextArea } from "@heroui/react";

function Textarea(props: React.ComponentProps<"textarea">) {
  return <TextArea data-slot="textarea" fullWidth {...(props as React.ComponentProps<typeof TextArea>)} />;
}

export { Textarea };
