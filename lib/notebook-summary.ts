import { schema } from "@/lib/db";

export const notebookSummary = {
  id: schema.notebooks.id,
  title: schema.notebooks.title,
  createdAt: schema.notebooks.createdAt,
  updatedAt: schema.notebooks.updatedAt,
};
