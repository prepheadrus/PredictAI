"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { leagues } from "@/lib/mock-data";
import { Checkbox } from "../ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { BellRing } from "lucide-react";

const notificationsFormSchema = z.object({
  highConfidence: z.boolean().default(false).describe("High-confidence predictions (>70%)"),
  dailySummary: z.boolean().default(true).describe("Daily prediction summary"),
  minConfidence: z.number().min(50).max(100).default(75),
  leagues: z.array(z.number()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one league.",
  }),
});

type NotificationsFormValues = z.infer<typeof notificationsFormSchema>;

const defaultValues: Partial<NotificationsFormValues> = {
  highConfidence: true,
  dailySummary: false,
  minConfidence: 75,
  leagues: [1, 2], // Default to Premier League and La Liga
};

export function NotificationsForm() {
  const { toast } = useToast();
  const form = useForm<NotificationsFormValues>({
    resolver: zodResolver(notificationsFormSchema),
    defaultValues,
  });

  function onSubmit(data: NotificationsFormValues) {
    toast({
      title: "Settings Saved!",
      description: "Your notification preferences have been updated.",
    });
    console.log(data);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline flex items-center gap-2">
            <BellRing /> Telegram Notifications
        </CardTitle>
        <CardDescription>Customize the alerts you receive from the BetWise Pro Telegram bot.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="highConfidence"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">High-Confidence Alerts</FormLabel>
                    <FormDescription>
                      Receive instant notifications for predictions with over 70% confidence.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="dailySummary"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Daily Summary</FormLabel>
                    <FormDescription>
                      Get a summary of all upcoming predictions once a day.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="minConfidence"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Confidence Level</FormLabel>
                  <FormControl>
                    <Slider
                      min={50}
                      max={100}
                      step={1}
                      defaultValue={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                    />
                  </FormControl>
                  <FormDescription>
                    Only get alerts for predictions above {field.value}%.
                  </FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="leagues"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Favorite Leagues</FormLabel>
                    <FormDescription>
                      Select the leagues you want to receive notifications for.
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {leagues.map((league) => (
                      <FormField
                        key={league.id}
                        control={form.control}
                        name="leagues"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={league.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(league.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, league.id])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== league.id
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {league.name}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                </FormItem>
              )}
            />
            <Button type="submit">Save Preferences</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
