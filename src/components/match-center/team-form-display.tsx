"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "../ui/skeleton";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FormResult {
  result: "W" | "D" | "L";
  opponentName: string;
  score: string;
}

interface TeamFormProps {
  teamId: number;
  teamName: string;
}

const formVariant: { [key in "W" | "D" | "L"]: string } = {
  W: "bg-green-500 hover:bg-green-600 text-white",
  D: "bg-gray-400 hover:bg-gray-500 text-white",
  L: "bg-red-500 hover:bg-red-600 text-white",
};

export function TeamFormDisplay({ teamId, teamName }: TeamFormProps) {
  const [form, setForm] = useState<FormResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchForm = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/team-form?teamId=${teamId}`);
        if (response.ok) {
          const data = await response.json();
          setForm(data);
        } else {
          console.error("Failed to fetch team form");
        }
      } catch (error) {
        console.error("Error fetching team form:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchForm();
  }, [teamId]);

  return (
    <div className="p-3 bg-background rounded-md">
      <h3 className="font-semibold mb-2 text-sm">{teamName} - Son 5 Maç</h3>
      {isLoading ? (
        <div className="flex gap-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="w-8 h-6" />)}
        </div>
      ) : form.length > 0 ? (
        <TooltipProvider>
          <div className="flex gap-2">
            {form.map((game, index) => (
              <Tooltip key={index}>
                <TooltipTrigger asChild>
                  <Badge
                    className={cn(
                      "w-7 h-7 flex items-center justify-center font-bold text-sm cursor-help",
                      formVariant[game.result]
                    )}
                  >
                    {game.result}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">vs. {game.opponentName} ({game.score})</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      ) : (
        <p className="text-xs text-muted-foreground">Form verisi bulunamadı.</p>
      )}
    </div>
  );
}