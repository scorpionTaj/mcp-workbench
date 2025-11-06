"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Bug,
  Lightbulb,
  Star,
  CheckCircle2,
  Clock,
  Archive,
  Trash2,
  Mail,
  User,
  Calendar,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Feedback {
  id: string;
  name: string | null;
  email: string | null;
  feedbackType: string;
  subject: string | null;
  message: string;
  rating: number | null;
  status: string;
  resolved: boolean;
  resolvedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface FeedbackStats {
  total: number;
  new: number;
  resolved: number;
  averageRating: number | null;
}

export function FeedbackManagement() {
  const { toast } = useToast();
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats>({
    total: 0,
    new: 0,
    resolved: 0,
    averageRating: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(
    null
  );
  const [notes, setNotes] = useState("");

  const feedbackTypeIcons: Record<string, any> = {
    general: MessageSquare,
    bug: Bug,
    feature: Lightbulb,
    improvement: Star,
    question: MessageSquare,
  };

  const statusColors: Record<string, string> = {
    new: "bg-blue-500",
    "in-progress": "bg-yellow-500",
    resolved: "bg-green-500",
    archived: "bg-gray-500",
  };

  const fetchFeedback = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== "all") {
        if (filter === "resolved") {
          params.append("resolved", "true");
        } else if (filter === "unresolved") {
          params.append("resolved", "false");
        } else {
          params.append("status", filter);
        }
      }

      const response = await fetch(`/api/feedback?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch feedback");
      }

      const data = await response.json();
      setFeedbackList(data.feedback);
      setStats(data.stats);
    } catch (error) {
      console.error("Error fetching feedback:", error);
      toast({
        title: "Error",
        description: "Failed to load feedback",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, [filter]);

  const updateFeedbackStatus = async (
    id: string,
    status: string,
    resolved?: boolean
  ) => {
    try {
      const response = await fetch(`/api/feedback/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          resolved: resolved !== undefined ? resolved : undefined,
          notes: notes || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update feedback");
      }

      toast({
        title: "Success",
        description: "Feedback updated successfully",
      });

      // Refresh feedback list
      fetchFeedback();
      setSelectedFeedback(null);
      setNotes("");
    } catch (error) {
      console.error("Error updating feedback:", error);
      toast({
        title: "Error",
        description: "Failed to update feedback",
        variant: "destructive",
      });
    }
  };

  const deleteFeedback = async (id: string) => {
    if (!confirm("Are you sure you want to delete this feedback?")) {
      return;
    }

    try {
      const response = await fetch(`/api/feedback/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete feedback");
      }

      toast({
        title: "Success",
        description: "Feedback deleted successfully",
      });

      fetchFeedback();
      setSelectedFeedback(null);
    } catch (error) {
      console.error("Error deleting feedback:", error);
      toast({
        title: "Error",
        description: "Failed to delete feedback",
        variant: "destructive",
      });
    }
  };

  const FeedbackIcon = ({ type }: { type: string }) => {
    const Icon = feedbackTypeIcons[type] || MessageSquare;
    return <Icon className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Total Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">New</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{stats.new}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {stats.resolved}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">
                {stats.averageRating?.toFixed(1) || "N/A"}
              </div>
              {stats.averageRating && (
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Feedback List</CardTitle>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Feedback</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="unresolved">Unresolved</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {feedbackList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No feedback found
              </div>
            ) : (
              feedbackList.map((feedback) => (
                <Card
                  key={feedback.id}
                  className={`cursor-pointer hover:border-primary transition-colors ${
                    selectedFeedback?.id === feedback.id ? "border-primary" : ""
                  }`}
                  onClick={() => {
                    setSelectedFeedback(feedback);
                    setNotes(feedback.notes || "");
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="gap-1">
                            <FeedbackIcon type={feedback.feedbackType} />
                            {feedback.feedbackType}
                          </Badge>
                          <Badge
                            className={`${
                              statusColors[feedback.status]
                            } text-white`}
                          >
                            {feedback.status}
                          </Badge>
                          {feedback.resolved && (
                            <Badge className="bg-green-500 text-white gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Resolved
                            </Badge>
                          )}
                          {feedback.rating && (
                            <Badge variant="outline" className="gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {feedback.rating}/5
                            </Badge>
                          )}
                        </div>
                        {feedback.subject && (
                          <h4 className="font-semibold">{feedback.subject}</h4>
                        )}
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {feedback.message}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      {feedback.name && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {feedback.name}
                        </div>
                      )}
                      {feedback.email && (
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {feedback.email}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(feedback.createdAt), {
                          addSuffix: true,
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Selected Feedback Detail */}
      {selectedFeedback && (
        <Card>
          <CardHeader>
            <CardTitle>Feedback Details</CardTitle>
            <CardDescription>
              Manage and respond to this feedback
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Message</h4>
              <p className="text-sm whitespace-pre-wrap">
                {selectedFeedback.message}
              </p>
            </div>

            {selectedFeedback.notes && (
              <div className="space-y-2">
                <h4 className="font-semibold">Existing Notes</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedFeedback.notes}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="font-semibold">Add Notes</h4>
              <Textarea
                placeholder="Add internal notes about this feedback..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  updateFeedbackStatus(selectedFeedback.id, "in-progress")
                }
              >
                <Clock className="mr-2 h-4 w-4" />
                Mark In Progress
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  updateFeedbackStatus(selectedFeedback.id, "resolved", true)
                }
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Mark Resolved
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  updateFeedbackStatus(selectedFeedback.id, "archived")
                }
              >
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => deleteFeedback(selectedFeedback.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
