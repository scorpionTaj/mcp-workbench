"use client";

import { EmbeddingsGenerator } from "@/components/embeddings/embeddings-generator";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function EmbeddingsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-primary">
              <path d="M3 3v18h18" />
              <path d="m19 9-5 5-4-4-3 3" />
            </svg>
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gradient">
              Embeddings
            </h1>
            <p className="text-muted-foreground text-lg">
              Generate vector embeddings from text using various AI models
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl">
        <EmbeddingsGenerator />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-blue-500">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <path d="M12 17h.01" />
            </svg>
            About Embeddings
          </h3>
          <div className="text-muted-foreground space-y-3">
            <p>
              Embeddings are vector representations of text that capture semantic meaning. 
              Similar texts will have similar embeddings (vectors that are close together in vector space).
            </p>
            <p>
              They transform text into high-dimensional numerical vectors that preserve 
              semantic relationships between words, phrases, and documents.
            </p>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-green-500">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Common Use Cases
          </h3>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Badge variant="secondary" className="mt-0.5 h-6 w-6 p-0 flex items-center justify-center text-xs">1</Badge>
              <div>
                <div className="font-medium">Semantic Search</div>
                <div className="text-sm text-muted-foreground">Find documents with similar meaning, not just keyword matches</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="secondary" className="mt-0.5 h-6 w-6 p-0 flex items-center justify-center text-xs">2</Badge>
              <div>
                <div className="font-medium">RAG Systems</div>
                <div className="text-sm text-muted-foreground">Retrieve relevant context for language models</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="secondary" className="mt-0.5 h-6 w-6 p-0 flex items-center justify-center text-xs">3</Badge>
              <div>
                <div className="font-medium">Document Clustering</div>
                <div className="text-sm text-muted-foreground">Group similar documents together automatically</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 mt-4">
        <h3 className="font-semibold text-lg mb-3">How to Use</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-secondary/30 rounded-lg">
            <div className="text-2xl font-bold text-primary mb-2">1</div>
            <h4 className="font-medium mb-2">Select Provider & Model</h4>
            <p className="text-sm text-muted-foreground">Choose from your connected embedding-capable providers</p>
          </div>
          <div className="text-center p-4 bg-secondary/30 rounded-lg">
            <div className="text-2xl font-bold text-primary mb-2">2</div>
            <h4 className="font-medium mb-2">Enter Text</h4>
            <p className="text-sm text-muted-foreground">Input the text you want to convert to embeddings</p>
          </div>
          <div className="text-center p-4 bg-secondary/30 rounded-lg">
            <div className="text-2xl font-bold text-primary mb-2">3</div>
            <h4 className="font-medium mb-2">Generate & Use</h4>
            <p className="text-sm text-muted-foreground">Get the embedding vector for your applications</p>
          </div>
        </div>
      </Card>
    </div>
  );
}