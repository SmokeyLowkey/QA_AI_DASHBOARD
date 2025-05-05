"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Plus, Trash, Save, ChevronDown, ChevronUp, Edit, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Define types for checklist items
type ChecklistItem = {
  id: string;
  text: string;
};

type ChecklistSection = {
  id: string;
  title: string;
  items: ChecklistItem[];
};

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
  checklistItems?: ChecklistSection[];
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
  teamId: z.string().optional(),
});

// Helper function to generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 9);

export function CriteriaFormChecklist({
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
  
  // Checklist state
  const [checklistSections, setChecklistSections] = useState<ChecklistSection[]>(
    criteria?.checklistItems || []
  );
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newItemText, setNewItemText] = useState("");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState("");
  const [editingItemId, setEditingItemId] = useState<{sectionId: string, itemId: string} | null>(null);
  const [editingItemText, setEditingItemText] = useState("");
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);

  // Form
  const form = useForm({
    resolver: zodResolver(criteriaFormSchema),
    defaultValues: {
      name: criteria?.name || "",
      description: criteria?.description || "",
      isDefault: criteria?.isDefault || false,
      isPublic: criteria?.isPublic || false,
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

  // Checklist management
  const addSection = () => {
    if (newSectionTitle.trim()) {
      const newSection: ChecklistSection = {
        id: generateId(),
        title: newSectionTitle.trim(),
        items: [],
      };
      setChecklistSections([...checklistSections, newSection]);
      setNewSectionTitle("");
      setCurrentSectionId(newSection.id);
    }
  };

  const removeSection = (sectionId: string) => {
    setChecklistSections(checklistSections.filter(section => section.id !== sectionId));
    if (currentSectionId === sectionId) {
      setCurrentSectionId(null);
    }
  };

  const updateSectionTitle = () => {
    if (editingSectionId && editingSectionTitle.trim()) {
      setChecklistSections(
        checklistSections.map(section => 
          section.id === editingSectionId 
            ? { ...section, title: editingSectionTitle.trim() } 
            : section
        )
      );
      setEditingSectionId(null);
      setEditingSectionTitle("");
    }
  };

  const startEditingSection = (section: ChecklistSection) => {
    setEditingSectionId(section.id);
    setEditingSectionTitle(section.title);
  };

  const addItem = (sectionId: string) => {
    if (newItemText.trim()) {
      const newItem: ChecklistItem = {
        id: generateId(),
        text: newItemText.trim(),
      };
      
      setChecklistSections(
        checklistSections.map(section => 
          section.id === sectionId 
            ? { ...section, items: [...section.items, newItem] } 
            : section
        )
      );
      
      setNewItemText("");
    }
  };

  const removeItem = (sectionId: string, itemId: string) => {
    setChecklistSections(
      checklistSections.map(section => 
        section.id === sectionId 
          ? { ...section, items: section.items.filter(item => item.id !== itemId) } 
          : section
      )
    );
  };

  const startEditingItem = (sectionId: string, item: ChecklistItem) => {
    setEditingItemId({ sectionId, itemId: item.id });
    setEditingItemText(item.text);
  };

  const updateItemText = () => {
    if (editingItemId && editingItemText.trim()) {
      setChecklistSections(
        checklistSections.map(section => 
          section.id === editingItemId.sectionId 
            ? { 
                ...section, 
                items: section.items.map(item => 
                  item.id === editingItemId.itemId 
                    ? { ...item, text: editingItemText.trim() } 
                    : item
                ) 
              } 
            : section
        )
      );
      setEditingItemId(null);
      setEditingItemText("");
    }
  };

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    const sectionIndex = checklistSections.findIndex(section => section.id === sectionId);
    if (
      (direction === 'up' && sectionIndex === 0) || 
      (direction === 'down' && sectionIndex === checklistSections.length - 1)
    ) {
      return;
    }

    const newSections = [...checklistSections];
    const targetIndex = direction === 'up' ? sectionIndex - 1 : sectionIndex + 1;
    [newSections[sectionIndex], newSections[targetIndex]] = [newSections[targetIndex], newSections[sectionIndex]];
    setChecklistSections(newSections);
  };

  const moveItem = (sectionId: string, itemId: string, direction: 'up' | 'down') => {
    const sectionIndex = checklistSections.findIndex(section => section.id === sectionId);
    const section = checklistSections[sectionIndex];
    const itemIndex = section.items.findIndex(item => item.id === itemId);
    
    if (
      (direction === 'up' && itemIndex === 0) || 
      (direction === 'down' && itemIndex === section.items.length - 1)
    ) {
      return;
    }

    const newItems = [...section.items];
    const targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
    [newItems[itemIndex], newItems[targetIndex]] = [newItems[targetIndex], newItems[itemIndex]];
    
    const newSections = [...checklistSections];
    newSections[sectionIndex] = { ...section, items: newItems };
    setChecklistSections(newSections);
  };

  // Save criteria
  const onSubmit = async (data: z.infer<typeof criteriaFormSchema>) => {
    try {
      setIsSaving(true);
      
      const criteriaData = {
        ...data,
        requiredPhrases,
        prohibitedPhrases,
        checklistItems: checklistSections,
        // Keep the weights for backward compatibility
        customerServiceWeight: criteria?.customerServiceWeight || 25,
        productKnowledgeWeight: criteria?.productKnowledgeWeight || 25,
        communicationSkillsWeight: criteria?.communicationSkillsWeight || 25,
        complianceAdherenceWeight: criteria?.complianceAdherenceWeight || 25,
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
      
      // Force a hard navigation to ensure redirect works
      window.location.href = "/dashboard/criteria";
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
              <TabsTrigger value="checklist">Checklist Items</TabsTrigger>
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
            
            {/* Checklist Tab */}
            <TabsContent value="checklist" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Checklist Sections</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Create sections and items for your evaluation checklist. Each item will be evaluated as either met (1) or not met (0).
                  </p>
                  
                  <div className="flex space-x-2">
                    <Input
                      value={newSectionTitle}
                      onChange={(e) => setNewSectionTitle(e.target.value)}
                      placeholder="Add a new section"
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSection();
                        }
                      }}
                    />
                    <Button type="button" onClick={addSection}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Section
                    </Button>
                  </div>
                  
                  {checklistSections.length === 0 ? (
                    <div className="text-center py-6 border rounded-md">
                      <p className="text-muted-foreground">
                        No sections added yet. Add a section to get started.
                      </p>
                    </div>
                  ) : (
                    <Accordion
                      type="single"
                      collapsible
                      value={currentSectionId || undefined}
                      onValueChange={(value) => setCurrentSectionId(value || null)}
                      className="w-full"
                    >
                      {checklistSections.map((section, sectionIndex) => (
                        <AccordionItem key={section.id} value={section.id} className="border rounded-md mb-2">
                          <AccordionTrigger className="px-4 hover:no-underline">
                            <div className="flex items-center justify-between w-full pr-4">
                              <div className="flex items-center">
                                {editingSectionId === section.id ? (
                                  <div className="flex items-center space-x-2">
                                    <Input
                                      value={editingSectionTitle}
                                      onChange={(e) => setEditingSectionTitle(e.target.value)}
                                      className="w-64"
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          updateSectionTitle();
                                        }
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateSectionTitle();
                                      }}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="font-medium">{section.title}</span>
                                )}
                                <Badge variant="outline" className="ml-2">
                                  {section.items.length} {section.items.length === 1 ? "item" : "items"}
                                </Badge>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveSection(section.id, 'up');
                                  }}
                                  disabled={sectionIndex === 0}
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveSection(section.id, 'down');
                                  }}
                                  disabled={sectionIndex === checklistSections.length - 1}
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditingSection(section);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeSection(section.id);
                                  }}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <div className="space-y-4">
                              <div className="flex space-x-2">
                                <Input
                                  value={newItemText}
                                  onChange={(e) => setNewItemText(e.target.value)}
                                  placeholder="Add a new checklist item"
                                  className="flex-1"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      addItem(section.id);
                                    }
                                  }}
                                />
                                <Button type="button" onClick={() => addItem(section.id)}>
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Item
                                </Button>
                              </div>
                              
                              {section.items.length === 0 ? (
                                <div className="text-center py-4 border rounded-md">
                                  <p className="text-muted-foreground">
                                    No items added yet. Add an item to this section.
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {section.items.map((item, itemIndex) => (
                                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-md">
                                      {editingItemId && editingItemId.sectionId === section.id && editingItemId.itemId === item.id ? (
                                        <div className="flex items-center space-x-2 flex-1">
                                          <Input
                                            value={editingItemText}
                                            onChange={(e) => setEditingItemText(e.target.value)}
                                            className="flex-1"
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                e.preventDefault();
                                                updateItemText();
                                              }
                                            }}
                                          />
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="ghost"
                                            onClick={updateItemText}
                                          >
                                            <Check className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      ) : (
                                        <span className="flex-1">{item.text}</span>
                                      )}
                                      <div className="flex items-center space-x-1">
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => moveItem(section.id, item.id, 'up')}
                                          disabled={itemIndex === 0}
                                        >
                                          <ChevronUp className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => moveItem(section.id, item.id, 'down')}
                                          disabled={itemIndex === section.items.length - 1}
                                        >
                                          <ChevronDown className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => startEditingItem(section.id, item)}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          className="text-destructive"
                                          onClick={() => removeItem(section.id, item.id)}
                                        >
                                          <Trash className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  )}
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
