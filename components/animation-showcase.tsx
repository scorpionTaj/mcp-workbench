"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Zap, Star, TrendingUp } from "lucide-react";

export function AnimationShowcase() {
  return (
    <div className="space-y-8 p-8">
      {/* Hero Section with Gradient Text */}
      <div className="text-center space-y-4 animate-in fade-in-up duration-700">
        <h1 className="text-6xl font-bold text-gradient">
          Beautiful Animations
        </h1>
        <p className="text-xl text-muted-foreground">
          Elegant, smooth, and performant
        </p>
      </div>

      {/* Card Grid with Staggered Animations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6 card-hover animate-in fade-in-up duration-500 delay-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/10 animate-pulse-glow">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Card Hover Effect</h3>
          </div>
          <p className="text-muted-foreground text-sm">
            Hover over this card to see the elegant lift and glow effect
          </p>
        </Card>

        <Card className="p-6 card-hover glass animate-in fade-in-up duration-500 delay-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-accent/10">
              <Zap className="w-5 h-5 text-accent" />
            </div>
            <h3 className="font-semibold text-lg">Glass Morphism</h3>
          </div>
          <p className="text-muted-foreground text-sm">
            Beautiful frosted glass effect with backdrop blur
          </p>
        </Card>

        <Card className="p-6 card-hover border-glow animate-in fade-in-up duration-500 delay-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-success/10 animate-float">
              <Star className="w-5 h-5 text-success" />
            </div>
            <h3 className="font-semibold text-lg">Border Glow</h3>
          </div>
          <p className="text-muted-foreground text-sm">
            Animated gradient border that appears on hover
          </p>
        </Card>
      </div>

      {/* Button Showcase */}
      <div className="flex flex-wrap gap-4 justify-center animate-in scale-in duration-500 delay-300">
        <Button className="btn-glow" size="lg">
          <Sparkles className="w-4 h-4 mr-2" />
          Glowing Button
        </Button>

        <Button variant="outline" className="card-hover" size="lg">
          Hover Effect
        </Button>

        <Button variant="secondary" className="card-interactive" size="lg">
          <TrendingUp className="w-4 h-4 mr-2" />
          Interactive
        </Button>
      </div>

      {/* Badge Showcase */}
      <div className="flex flex-wrap gap-3 justify-center animate-in fade-in duration-700 delay-500">
        <Badge className="animate-pulse-glow">Pulse Glow</Badge>
        <Badge variant="secondary" className="animate-float-slow">
          Floating
        </Badge>
        <Badge variant="outline" className="border-glow">
          Border Glow
        </Badge>
      </div>

      {/* Shimmer Text Example */}
      <div className="text-center space-y-4 animate-in fade-in-down duration-700 delay-700">
        <p className="text-2xl font-bold text-shimmer">Shimmer Text Effect</p>
        <p className="text-xl neon-glow">Neon Glow Effect</p>
      </div>

      {/* Glass Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-8 glass-strong card-hover animate-in slide-in-from-left duration-700">
          <h3 className="text-xl font-semibold mb-3 text-gradient">
            Strong Glass Effect
          </h3>
          <p className="text-muted-foreground">
            Enhanced glass morphism with more blur and saturation for a premium
            look
          </p>
        </Card>

        <Card className="p-8 glass card-hover animate-in slide-in-from-right duration-700">
          <h3 className="text-xl font-semibold mb-3">Subtle Glass Effect</h3>
          <p className="text-muted-foreground">
            Light glass effect that maintains readability while adding depth
          </p>
        </Card>
      </div>

      {/* Loading State */}
      <Card className="p-6 animate-shimmer">
        <div className="h-4 bg-muted rounded w-3/4 mb-3"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
      </Card>
    </div>
  );
}
