"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Bug,
  Lightbulb,
  Star,
  Send,
  CheckCircle2,
} from "lucide-react";

export default function FeedbackPage() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    feedbackType: "general",
    subject: "",
    message: "",
    rating: 0,
  });

  const feedbackTypes = [
    { value: "general", label: "General Feedback", icon: MessageSquare },
    { value: "bug", label: "Bug Report", icon: Bug },
    { value: "feature", label: "Feature Request", icon: Lightbulb },
    { value: "improvement", label: "Improvement", icon: Star },
    { value: "question", label: "Question", icon: MessageSquare },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.message.trim()) {
      toast({
        title: "Error",
        description: "Please provide your feedback message",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim() || null,
          email: formData.email.trim() || null,
          feedbackType: formData.feedbackType,
          subject: formData.subject.trim() || null,
          message: formData.message.trim(),
          rating: formData.rating > 0 ? formData.rating : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit feedback");
      }

      setIsSubmitted(true);
      toast({
        title: "Success!",
        description: data.message || "Thank you for your feedback!",
      });

      // Reset form
      setFormData({
        name: "",
        email: "",
        feedbackType: "general",
        subject: "",
        message: "",
        rating: 0,
      });

      // Reset submitted state after 5 seconds
      setTimeout(() => {
        setIsSubmitted(false);
      }, 5000);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="border-green-500/50">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <CheckCircle2 className="h-16 w-16 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold">Thank You!</h2>
                <p className="text-muted-foreground">
                  Your feedback has been submitted successfully. We appreciate
                  your input and will review it carefully.
                </p>
                <Button onClick={() => setIsSubmitted(false)} className="mt-4">
                  Submit Another Feedback
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">We Value Your Feedback</h1>
          <p className="text-muted-foreground">
            Help us improve MCP Workbench by sharing your thoughts, reporting
            bugs, or suggesting new features.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Share Your Feedback</CardTitle>
            <CardDescription>
              All fields except the message are optional, but providing your
              email helps us follow up if needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name and Email Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name (Optional)</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Feedback Type */}
              <div className="space-y-2">
                <Label htmlFor="feedbackType">Feedback Type</Label>
                <Select
                  value={formData.feedbackType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, feedbackType: value })
                  }
                >
                  <SelectTrigger id="feedbackType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {feedbackTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          <span>{type.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject">Subject (Optional)</Label>
                <Input
                  id="subject"
                  placeholder="Brief summary of your feedback"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                />
              </div>

              {/* Rating */}
              <div className="space-y-2">
                <Label>Overall Experience (Optional)</Label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          rating: star === formData.rating ? 0 : star,
                        })
                      }
                      className="transition-colors hover:scale-110"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          star <= formData.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="message">
                  Your Feedback <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="message"
                  placeholder="Tell us what you think, report a bug, or suggest a feature..."
                  value={formData.message}
                  onChange={(e) =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  className="min-h-[150px]"
                  maxLength={5000}
                  required
                />
                <p className="text-xs text-muted-foreground text-right">
                  {formData.message.length} / 5000 characters
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting || !formData.message.trim()}
              >
                {isSubmitting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <Bug className="h-8 w-8 mb-2 text-red-500" />
              <CardTitle className="text-sm">Report a Bug</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Found something not working? Let us know so we can fix it.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <Lightbulb className="h-8 w-8 mb-2 text-yellow-500" />
              <CardTitle className="text-sm">Request a Feature</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Have an idea? Share your feature requests with us.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <MessageSquare className="h-8 w-8 mb-2 text-blue-500" />
              <CardTitle className="text-sm">General Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Share your thoughts on how we can improve.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
