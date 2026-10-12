"use client";

import Link from "next/link";
import { EmbeddingsGenerator } from "@/components/embeddings/embeddings-generator";

export default function EmbeddingsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Embeddings</h1>
        <p className="text-muted-foreground">
          Try embedding models side by side before choosing one for a{" "}
          <Link href="/knowledge" className="text-accent underline-offset-4 hover:underline">
            knowledge base
          </Link>
          .
        </p>
      </div>
      <EmbeddingsGenerator />
    </div>
  );
}
