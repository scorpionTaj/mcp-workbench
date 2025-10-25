"use client"

import { useState } from "react"
import { useDatasets } from "@/hooks/use-datasets"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Upload, Database, FileText, Trash2, Eye, SearchIcon, Sparkles } from "lucide-react"
import { DatasetPreview } from "@/components/datasets/dataset-preview"
import { DatasetUpload } from "@/components/datasets/dataset-upload"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function DatasetsPage() {
  const { datasets, isLoading, deleteDataset, indexDataset } = useDatasets()
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredDatasets = datasets.filter((dataset) => dataset.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Datasets</h1>
          <p className="text-muted-foreground text-lg">Upload, preview, and index your data files</p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Upload Dataset
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload Dataset</DialogTitle>
              <DialogDescription>Upload CSV or Parquet files to preview and index for vector search</DialogDescription>
            </DialogHeader>
            <DatasetUpload />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Database className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Datasets</p>
              <p className="text-2xl font-bold">{datasets.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-success/10 rounded-lg">
              <Sparkles className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Indexed</p>
              <p className="text-2xl font-bold">{datasets.filter((d) => d.indexed).length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Rows</p>
              <p className="text-2xl font-bold">{datasets.reduce((sum, d) => sum + (d.rows || 0), 0)}</p>
            </div>
          </div>
        </Card>
      </div>

      {datasets.length > 0 && (
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search datasets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-3/4 mb-4" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </Card>
          ))}
        </div>
      ) : filteredDatasets.length === 0 ? (
        <Card className="p-12 text-center">
          <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{datasets.length === 0 ? "No Datasets" : "No Results Found"}</h3>
          <p className="text-muted-foreground text-sm mb-4">
            {datasets.length === 0
              ? "Upload CSV or Parquet files to get started with data analysis"
              : "Try adjusting your search query"}
          </p>
          {datasets.length === 0 && (
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Dataset
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Upload Dataset</DialogTitle>
                  <DialogDescription>
                    Upload CSV or Parquet files to preview and index for vector search
                  </DialogDescription>
                </DialogHeader>
                <DatasetUpload />
              </DialogContent>
            </Dialog>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDatasets.map((dataset) => (
            <Card key={dataset.id} className="p-6 hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2 break-all">{dataset.name}</h3>
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <Badge variant="secondary" className="text-xs uppercase">
                      {dataset.type}
                    </Badge>
                    {dataset.indexed && (
                      <Badge variant="default" className="text-xs bg-success/20 text-success hover:bg-success/30">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Indexed
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Size</span>
                  <span className="font-medium">{(dataset.size / 1024).toFixed(2)} KB</span>
                </div>
                {dataset.rows && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Rows</span>
                    <span className="font-medium">{dataset.rows.toLocaleString()}</span>
                  </div>
                )}
                {dataset.columns && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Columns</span>
                    <span className="font-medium">{dataset.columns.length}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Uploaded</span>
                  <span className="font-medium">{new Date(dataset.uploadedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-transparent"
                      onClick={() => setSelectedDataset(dataset.id)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{dataset.name}</DialogTitle>
                      <DialogDescription>Dataset preview and details</DialogDescription>
                    </DialogHeader>
                    <DatasetPreview datasetId={dataset.id} />
                  </DialogContent>
                </Dialog>

                {!dataset.indexed ? (
                  <Button variant="default" size="sm" className="flex-1" onClick={() => indexDataset(dataset.id)}>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Index
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="flex-1 bg-transparent" disabled>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Indexed
                  </Button>
                )}

                <Button variant="destructive" size="sm" onClick={() => deleteDataset(dataset.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
