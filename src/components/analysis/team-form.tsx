import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TeamFormProps {
  form: ("W" | "D" | "L")[];
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
      <div className="flex gap-2">
        {form.map((result, index) => (
          <Badge
            key={index}
            className={cn(
              "w-8 h-8 flex items-center justify-center text-white font-bold text-sm",
              formVariant[result]
            )}
          >
            {result}
          </Badge>
        ))}
      </div>
    </div>
  );
}
