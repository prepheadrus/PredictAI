import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface FormResult {
  result: "W" | "D" | "L";
  opponentName: string;
  score: string;
}

interface TeamFormProps {
  form: FormResult[];
  teamName: string;
}

const formVariant = {
  W: "bg-green-500 hover:bg-green-500",
  D: "bg-gray-500 hover:bg-gray-500",
  L: "bg-red-500 hover:bg-red-500",
};

export function TeamForm({ form, teamName }: TeamFormProps) {
  return (
    <div>
      <h3 className="font-semibold mb-2">{teamName} Form (Last 5)</h3>
      <TooltipProvider>
        <div className="flex gap-2">
          {form.map((game, index) => (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <Badge
                  className={cn(
                    "w-8 h-8 flex items-center justify-center text-white font-bold text-sm cursor-help",
                    formVariant[game.result]
                  )}
                >
                  {game.result}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>vs. {game.opponentName} ({game.score})</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}
