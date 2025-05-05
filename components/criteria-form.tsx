"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Trash, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

// Define types
type QACriteria = {
  id?: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isPublic: boolean;
  customerServiceWeight: number;
  productKnowledgeWeight: number;
  communicationSkillsWeight: number;
  complianceAdherenceWeight: number;
  requiredPhrases: string[];
  prohibitedPhrases: string[];
  teamId?: string;
};

type Team = {
  id: string;
  name: string;
};

// Form schema
const criteriaFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  isDefault: z.boolean(),
  isPublic: z.boolean(),
  customerServiceWeight: z.number().min(0).max(100),
  productKnowledgeWeight: z.number().min(0).max(100),
  communicationSkillsWeight: z.number().min(0).max(100),
  complianceAdherenceWeight: z.number().min(0).max(100),
  teamId: z.string().optional(),
}).refine((data) => {
  const totalWeight = 
    data.customerServiceWeight + 
    data.productKnowledgeWeight + 
    data.communicationSkillsWeight + 
    data.complianceAdherenceWeight;
  return totalWeight === 100;
}, {
  message: "Weights must add up to 100%",
  path: ["customerServiceWeight"],
});

export function CriteriaForm({
  criteria,
  teams,
}: {
  criteria?: QACriteria;
  teams: Team[];
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [requiredPhrases, setRequiredPhrases] = useState<string[]>(
    criteria?.requiredPhrases || []
  );
  const [prohibitedPhrases, setProhibitedPhrases] = useState<string[]>(
    criteria?.prohibitedPhrases || []
  );
  const [newRequiredPhrase, setNewRequiredPhrase] = useState("");
  const [newProhibitedPhrase, setNewProhibitedPhrase] = useState("");

  // Form
  const form = useForm({
    resolver: zodResolver(criteriaFormSchema),
    defaultValues: {
      name: criteria?.name || "",
      description: criteria?.description || "",
      isDefault: criteria?.isDefault || false,
      isPublic: criteria?.isPublic || false,
      customerServiceWeight: criteria?.customerServiceWeight || 25,
      productKnowledgeWeight: criteria?.productKnowledgeWeight || 25,
      communicationSkillsWeight: criteria?.communicationSkillsWeight || 25,
      complianceAdherenceWeight: criteria?.complianceAdherenceWeight || 25,
      teamId: criteria?.teamId || "",
    },
  });

  // Phrase management
  const addRequiredPhrase = () => {
    if (newRequiredPhrase.trim()) {
      setRequiredPhrases([...requiredPhrases, newRequiredPhrase.trim()]);
      setNewRequiredPhrase("");
    }
  };

  const removeRequiredPhrase = (index: number) => {
    setRequiredPhrases(requiredPhrases.filter((_, i) => i !== index));
  };

  const addProhibitedPhrase = () => {
    if (newProhibitedPhrase.trim()) {
      setProhibitedPhrases([...prohibitedPhrases, newProhibitedPhrase.trim()]);
      setNewProhibitedPhrase("");
    }
  };

  const removeProhibitedPhrase = (index: number) => {
    setProhibitedPhrases(prohibitedPhrases.filter((_, i) => i !== index));
  };

  // Save criteria
  const onSubmit = async (data: z.infer<typeof criteriaFormSchema>) => {
    try {
      setIsSaving(true);
      
      const criteriaData = {
        ...data,
        requiredPhrases,
        prohibitedPhrases,
      };
      
      const url = criteria?.id 
        ? `/api/criteria/${criteria.id}`
        : "/api/criteria";
      
      const response = await fetch(url, {
        method: criteria?.id ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(criteriaData),
      });

      if (!response.ok) {
        throw new Error("Failed to save criteria");
      }

      toast({
        title: "Success",
        description: `Criteria ${criteria?.id ? "updated" : "created"} successfully.`,
      });
      
      router.push("/dashboard/criteria");
      router.refresh();
    } catch (error) {
      console.error("Error saving criteria:", error);
      toast({
        title: "Error",
        description: "Failed to save criteria. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="weights">Weights</TabsTrigger>
              <TabsTrigger value="phrases">Phrases</TabsTrigger>
            </TabsList>
            
            {/* General Tab */}
            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>General Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter criteria name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Enter a description for this criteria"
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {teams.length > 0 && (
                    <FormField
                      control={form.control}
                      name="teamId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Team</FormLabel>
                          <FormControl>
                            <select
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              {...field}
                              value={field.value || ""}
                            >
                              <option value="">None (Personal)</option>
                              {teams.map((team) => (
                                <option key={team.id} value={team.id}>
                                  {team.name}
                                </option>
                              ))}
                            </select>
                          </FormControl>
                          <FormDescription>
                            Assign this criteria to a team to share it with team members.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="isDefault"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Default Criteria</FormLabel>
                            <FormDescription>
                              Make this the default criteria for new recordings.
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
                      name="isPublic"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Public Criteria</FormLabel>
                            <FormDescription>
                              Make this criteria available to all users.
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
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Weights Tab */}
            <TabsContent value="weights" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Evaluation Weights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-sm text-muted-foreground">
                    Adjust the weights for each evaluation category. The total must equal 100%.
                  </p>
                  
                  <FormField
                    control={form.control}
                    name="customerServiceWeight"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between">
                          <FormLabel>Customer Service</FormLabel>
                          <span className="text-sm">{field.value}%</span>
                        </div>
                        <FormControl>
                          <Slider
                            min={0}
                            max={100}
                            step={5}
                            value={[field.value]}
                            onValueChange={(value) => field.onChange(value[0])}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="productKnowledgeWeight"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between">
                          <FormLabel>Product Knowledge</FormLabel>
                          <span className="text-sm">{field.value}%</span>
                        </div>
                        <FormControl>
                          <Slider
                            min={0}
                            max={100}
                            step={5}
                            value={[field.value]}
                            onValueChange={(value) => field.onChange(value[0])}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="communicationSkillsWeight"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between">
                          <FormLabel>Communication Skills</FormLabel>
                          <span className="text-sm">{field.value}%</span>
                        </div>
                        <FormControl>
                          <Slider
                            min={0}
                            max={100}
                            step={5}
                            value={[field.value]}
                            onValueChange={(value) => field.onChange(value[0])}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="complianceAdherenceWeight"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between">
                          <FormLabel>Compliance Adherence</FormLabel>
                          <span className="text-sm">{field.value}%</span>
                        </div>
                        <FormControl>
                          <Slider
                            min={0}
                            max={100}
                            step={5}
                            value={[field.value]}
                            onValueChange={(value) => field.onChange(value[0])}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-between items-center pt-4 border-t">
                    <span className="font-medium">Total</span>
                    <span className={`font-bold ${
                      form.getValues("customerServiceWeight") +
                      form.getValues("productKnowledgeWeight") +
                      form.getValues("communicationSkillsWeight") +
                      form.getValues("complianceAdherenceWeight") === 100
                        ? "text-green-600"
                        : "text-red-600"
                    }`}>
                      {form.getValues("customerServiceWeight") +
                        form.getValues("productKnowledgeWeight") +
                        form.getValues("communicationSkillsWeight") +
                        form.getValues("complianceAdherenceWeight")}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Phrases Tab */}
            <TabsContent value="phrases" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Required Phrases</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Add phrases that should be included in the conversation.
                  </p>
                  
                  <div className="flex space-x-2">
                    <Input
                      value={newRequiredPhrase}
                      onChange={(e) => setNewRequiredPhrase(e.target.value)}
                      placeholder="Add a required phrase"
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addRequiredPhrase();
                        }
                      }}
                    />
                    <Button type="button" onClick={addRequiredPhrase}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    {requiredPhrases.map((phrase, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="flex items-center gap-1 px-3 py-1"
                      >
                        {phrase}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0 ml-1"
                          onClick={() => removeRequiredPhrase(index)}
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Prohibited Phrases</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Add phrases that should not be included in the conversation.
                  </p>
                  
                  <div className="flex space-x-2">
                    <Input
                      value={newProhibitedPhrase}
                      onChange={(e) => setNewProhibitedPhrase(e.target.value)}
                      placeholder="Add a prohibited phrase"
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addProhibitedPhrase();
                        }
                      }}
                    />
                    <Button type="button" onClick={addProhibitedPhrase}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    {prohibitedPhrases.map((phrase, index) => (
                      <Badge
                        key={index}
                        variant="destructive"
                        className="flex items-center gap-1 px-3 py-1"
                      >
                        {phrase}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0 ml-1"
                          onClick={() => removeProhibitedPhrase(index)}
                        >
                          <Trash className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : criteria?.id ? "Update Criteria" : "Create Criteria"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
