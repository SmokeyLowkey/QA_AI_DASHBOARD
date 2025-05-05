"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Play, Pause, SkipBack, SkipForward, Save, Plus, Trash, Edit, X } from "lucide-react"; // Added X icon for dialog close

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"; // Added DialogClose

// Define types
export type Speaker = {
  id: string;
  name: string;
  role: string;
};

export type Section = {
  id: string;
  name: string;
  color: string;
};

export type Segment = {
  id: string;
  transcriptionId: string;
  startTime: number;
  endTime: number;
  text: string;
  speakerId?: string;
  confidence?: number;
  edited: boolean;
  sectionType?: string;
  createdAt: string;
  updatedAt: string;
};

export type Transcription = {
  id: string;
  recordingId: string;
  text: string;
  status: string;
  originalText?: string;
  editedAt?: string;
  editedById?: string;
  speakerMap?: Record<string, Speaker>;
  sections?: Record<string, Section>;
  contextNotes?: string;
  createdAt: string;
  updatedAt: string;
};

// Form schemas
const speakerFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
});

const sectionFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  color: z.string().min(1, "Color is required").regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format"), // Basic color validation
});

const segmentFormSchema = z.object({
  text: z.string().min(1, "Text is required"),
  speakerId: z.string().optional().nullable(), // Allow null or undefined
  sectionType: z.string().optional().nullable(), // Allow null or undefined
  startTime: z.number().min(0),
  endTime: z.number().min(0),
});

const transcriptionFormSchema = z.object({
  contextNotes: z.string().optional(),
});

export function TranscriptEditor({
  recordingId,
  audioUrl,
  transcription,
  segments,
}: {
  recordingId: string;
  audioUrl: string;
  transcription: Transcription;
  segments: Segment[];
}) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentSegment, setCurrentSegment] = useState<Segment | null>(null);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null); // State to hold the segment being edited
  const [localSegments, setLocalSegments] = useState<Segment[]>(segments);
  const [speakerMap, setSpeakerMap] = useState<Record<string, Speaker>>(
    transcription.speakerMap || {}
  );
  const [sections, setSections] = useState<Record<string, Section>>(
    transcription.sections || {}
  );
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("transcript");

  // Forms
  const transcriptionForm = useForm<z.infer<typeof transcriptionFormSchema>>({
    resolver: zodResolver(transcriptionFormSchema),
    defaultValues: {
      contextNotes: transcription.contextNotes || "",
    },
  });

  const speakerForm = useForm<z.infer<typeof speakerFormSchema>>({
    resolver: zodResolver(speakerFormSchema),
    defaultValues: {
      name: "",
      role: "",
      id: undefined, // Explicitly set id as undefined for new speaker form
    },
  });

  const sectionForm = useForm<z.infer<typeof sectionFormSchema>>({
    resolver: zodResolver(sectionFormSchema),
    defaultValues: {
      name: "",
      color: "#3b82f6", // Default blue
      id: undefined, // Explicitly set id as undefined for new section form
    },
  });

  const segmentForm = useForm<z.infer<typeof segmentFormSchema>>({
    resolver: zodResolver(segmentFormSchema),
    defaultValues: {
      text: "",
      speakerId: "", // Use empty string for Select default
      sectionType: "", // Use empty string for Select default
      startTime: 0,
      endTime: 0,
    },
  });

  // Audio player controls
  useEffect(() => {
    if (audioRef.current) {
      const audio = audioRef.current;

      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
        
        // Find current segment based on time
        // Use a slightly larger window for better UX around segment boundaries
        const segment = localSegments.find(
          (s) => audio.currentTime >= s.startTime && audio.currentTime < s.endTime + 0.1 // Add a small buffer
        );
        
        if (segment && (!currentSegment || segment.id !== currentSegment.id)) {
          setCurrentSegment(segment);
        } else if (!segment && currentSegment) {
          // Clear current segment if outside any segment
          setCurrentSegment(null);
        }
      };

      const handleDurationChange = () => {
        setDuration(audio.duration);
      };

      const handlePlay = () => {
        setIsPlaying(true);
      };

      const handlePause = () => {
        setIsPlaying(false);
      };

      const handleEnded = () => {
        setIsPlaying(false);
        setCurrentSegment(null); // Clear current segment when audio ends
      };


      audio.addEventListener("timeupdate", handleTimeUpdate);
      audio.addEventListener("durationchange", handleDurationChange);
      audio.addEventListener("play", handlePlay);
      audio.addEventListener("pause", handlePause);
      audio.addEventListener("ended", handleEnded);


      return () => {
        audio.removeEventListener("timeupdate", handleTimeUpdate);
        audio.removeEventListener("durationchange", handleDurationChange);
        audio.removeEventListener("play", handlePlay);
        audio.removeEventListener("pause", handlePause);
        audio.removeEventListener("ended", handleEnded);
      };
    }
  }, [audioRef, localSegments, currentSegment]); // Depend on localSegments and currentSegment

  // Player controls
  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 5);
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(
        audioRef.current.duration,
        audioRef.current.currentTime + 5
      );
    }
  };

  const seekToTime = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const seekToSegment = (segment: Segment) => {
    if (audioRef.current) {
      audioRef.current.currentTime = segment.startTime;
      // Optional: Play segment automatically?
      // audioRef.current.play();
      setCurrentSegment(segment); // Highlight the segment immediately
    }
  };

  // Speaker management
  const addUpdateSpeaker = (data: z.infer<typeof speakerFormSchema>) => {
    const id = data.id || `speaker-${Date.now()}`;
    const newSpeaker: Speaker = {
      id,
      name: data.name,
      role: data.role,
    };

    setSpeakerMap((prev) => ({
      ...prev,
      [id]: newSpeaker,
    }));

    speakerForm.reset({ name: "", role: "", id: undefined }); // Reset form for adding new
    toast({
      title: data.id ? "Speaker updated" : "Speaker added",
      description: `${data.name} (${data.role}) has been ${data.id ? 'updated' : 'added'} to the transcript.`,
    });
  };

  const startEditingSpeaker = (id: string) => {
    const speaker = speakerMap[id];
    if (speaker) {
      speakerForm.setValue("id", id);
      speakerForm.setValue("name", speaker.name);
      speakerForm.setValue("role", speaker.role);
    }
  };

  const deleteSpeaker = (id: string) => {
    const newSpeakerMap = { ...speakerMap };
    delete newSpeakerMap[id];
    setSpeakerMap(newSpeakerMap);

    // Update segments that use this speaker
    const updatedSegments = localSegments.map((segment) => {
      if (segment.speakerId === id) {
        // Use undefined or null consistently based on schema/API
        return { ...segment, speakerId: undefined }; // Or null
      }
      return segment;
    });
    setLocalSegments(updatedSegments);

    toast({
      title: "Speaker removed",
      description: "Speaker has been removed from the transcript and segments updated.",
    });
    // If the speaker being edited is deleted, reset the form
    if (speakerForm.getValues("id") === id) {
        speakerForm.reset({ name: "", role: "", id: undefined });
    }
  };

  // Section management
  const addUpdateSection = (data: z.infer<typeof sectionFormSchema>) => {
    const id = data.id || `section-${Date.now()}`;
    const newSection: Section = {
      id,
      name: data.name,
      color: data.color,
    };

    setSections((prev) => ({
      ...prev,
      [id]: newSection,
    }));

    sectionForm.reset({ name: "", color: "#3b82f6", id: undefined }); // Reset form for adding new
    toast({
      title: data.id ? "Section updated" : "Section added",
      description: `${data.name} section has been ${data.id ? 'updated' : 'added'} to the transcript.`,
    });
  };

  const startEditingSection = (id: string) => {
    const section = sections[id];
    if (section) {
      sectionForm.setValue("id", id);
      sectionForm.setValue("name", section.name);
      sectionForm.setValue("color", section.color);
    }
  };

  const deleteSection = (id: string) => {
    const newSections = { ...sections };
    delete newSections[id];
    setSections(newSections);

    // Update segments that use this section
    const updatedSegments = localSegments.map((segment) => {
      if (segment.sectionType === id) {
        // Use undefined or null consistently based on schema/API
        return { ...segment, sectionType: undefined }; // Or null
      }
      return segment;
    });
    setLocalSegments(updatedSegments);

    toast({
      title: "Section removed",
      description: "Section has been removed from the transcript and segments updated.",
    });
    // If the section being edited is deleted, reset the form
     if (sectionForm.getValues("id") === id) {
        sectionForm.reset({ name: "", color: "#3b82f6", id: undefined });
    }
  };


  // Segment management (API interactions)
  const handleAddSegment = async (data: z.infer<typeof segmentFormSchema>) => {
    try {
      // Clean up optional fields before sending (empty string to null/undefined)
      const payload = {
         ...data,
         speakerId: data.speakerId || undefined,
         sectionType: data.sectionType || undefined,
      }
      const response = await fetch(`/api/recordings/${recordingId}/transcript/segments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to add segment");
      }

      const result = await response.json();
      // Add and re-sort
      setLocalSegments((prev) => [...prev, result.segment].sort((a, b) => a.startTime - b.startTime));
      segmentForm.reset({
          text: "",
          speakerId: "",
          sectionType: "",
          startTime: result.segment.endTime, // Suggest next segment starts after the one just added
          endTime: result.segment.endTime + 5, // Suggest a default duration
      });
      
      toast({
        title: "Segment added",
        description: "New segment has been added to the transcript.",
      });
    } catch (error) {
      console.error("Error adding segment:", error);
      toast({
        title: "Error",
        description: "Failed to add segment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateSegment = async (segment: Segment, data: z.infer<typeof segmentFormSchema>) => {
    try {
      // Clean up optional fields before sending (empty string to null/undefined)
       const payload = {
         ...data,
         speakerId: data.speakerId || undefined,
         sectionType: data.sectionType || undefined,
         // Mark as edited if text changed
         edited: data.text !== segment.text || segment.edited,
      }

      const response = await fetch(
        `/api/recordings/${recordingId}/transcript/segments/${segment.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update segment");
      }

      const result = await response.json();
      // Update and re-sort
      setLocalSegments((prev) =>
        prev.map((s) => (s.id === segment.id ? result.segment : s))
          .sort((a, b) => a.startTime - b.startTime)
      );
      setEditingSegment(null); // Close dialog
      
      toast({
        title: "Segment updated",
        description: "Segment has been updated successfully.",
      });
    } catch (error) {
      console.error("Error updating segment:", error);
      toast({
        title: "Error",
        description: "Failed to update segment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSegment = async (segment: Segment) => {
    if (!confirm(`Are you sure you want to delete this segment? "${segment.text.substring(0, 50)}..."`)) {
        return;
    }
    try {
      const response = await fetch(
        `/api/recordings/${recordingId}/transcript/segments/${segment.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete segment");
      }

      setLocalSegments((prev) => prev.filter((s) => s.id !== segment.id));
       // If the segment being edited is deleted, close the dialog
      if (editingSegment?.id === segment.id) {
          setEditingSegment(null);
      }
      
      toast({
        title: "Segment deleted",
        description: "Segment has been removed from the transcript.",
      });
    } catch (error) {
      console.error("Error deleting segment:", error);
      toast({
        title: "Error",
        description: "Failed to delete segment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const startEditingSegment = (segment: Segment) => {
    setEditingSegment(segment);
    // Populate the segment form with the segment data
    segmentForm.reset({ // Using reset to ensure all fields are set, including unselected ones
        text: segment.text,
        speakerId: segment.speakerId || "", // Use "" for Select empty state
        sectionType: segment.sectionType || "", // Use "" for Select empty state
        startTime: segment.startTime,
        endTime: segment.endTime,
    });
  };

   const cancelEditingSegment = () => {
    setEditingSegment(null);
    segmentForm.reset(); // Reset form state
   }


  // Save all changes (Metadata: speakers, sections, context notes)
  const saveTranscriptionMetadata = async (data: z.infer<typeof transcriptionFormSchema>) => {
    try {
      setIsSaving(true);
      const response = await fetch(`/api/recordings/${recordingId}/transcript`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Only send the map values that have an ID (prevent adding form defaults)
          speakerMap: Object.fromEntries(Object.entries(speakerMap).filter(([id, speaker]) => id && speaker.name && speaker.role)),
          sections: Object.fromEntries(Object.entries(sections).filter(([id, section]) => id && section.name && section.color)),
          contextNotes: data.contextNotes,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save transcript metadata");
      }

      toast({
        title: "Transcript Metadata Saved",
        description: "Speakers, sections, and notes have been saved.",
      });
      
      // router.refresh(); // Consider if a full refresh is necessary or if state updates are enough
    } catch (error) {
      console.error("Error saving transcript metadata:", error);
      toast({
        title: "Error",
        description: "Failed to save transcript metadata. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Format time (seconds to MM:SS.Ms) - Added milliseconds for precision
  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00.000";
    const totalMilliseconds = Math.floor(time * 1000);
    const minutes = Math.floor(totalMilliseconds / (1000 * 60));
    const seconds = Math.floor((totalMilliseconds % (1000 * 60)) / 1000);
    const milliseconds = totalMilliseconds % 1000;

    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
  };


  // Effect to scroll to current segment
  useEffect(() => {
    if (currentSegment) {
      const element = document.getElementById(`segment-${currentSegment.id}`);
      if (element) {
        // Use requestAnimationFrame for smoother scrolling
        requestAnimationFrame(() => {
             element.scrollIntoView({
                behavior: "smooth",
                block: "center", // Center the element in the viewport
            });
        });
      }
    }
  }, [currentSegment]);


  return (
    <div className="space-y-6">
      {/* Audio Player */}
      <Card>
        <CardHeader>
          <CardTitle>Audio Player</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Hidden Audio Element */}
            <audio ref={audioRef} src={audioUrl} className="hidden" />
            
            {/* Playback Controls */}
            <div className="flex items-center justify-center space-x-4">
              <Button variant="outline" size="icon" onClick={skipBackward}>
                <SkipBack className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={togglePlayPause}>
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={skipForward}>
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Seek Slider and Timers */}
            <div className="space-y-2">
              <Slider
                value={[currentTime]}
                max={duration || 0} // Ensure max is not NaN
                step={0.01} // Use a smaller step for finer control
                onValueChange={(value) => seekToTime(value[0])}
                className="w-full" // Ensure slider takes full width
              />
              <div className="flex justify-between text-sm text-muted-foreground tabular-nums"> {/* tabular-nums helps align digits */}
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
            
            {/* Currently Playing Segment Info */}
            {currentSegment && (
              <div className="rounded-md border p-3 bg-muted/50">
                <div className="flex justify-between">
                  <div className="text-sm text-muted-foreground tabular-nums">
                    {formatTime(currentSegment.startTime)} - {formatTime(currentSegment.endTime)}
                  </div>
                  <div className="flex items-center space-x-2">
                     {currentSegment.speakerId && speakerMap[currentSegment.speakerId] && (
                        <Badge variant="outline">
                        {speakerMap[currentSegment.speakerId].name}
                        </Badge>
                    )}
                    {currentSegment.sectionType && sections[currentSegment.sectionType] && (
                        <Badge
                            style={{
                                backgroundColor: sections[currentSegment.sectionType].color,
                                // Simple logic for white/black text based on color brightness (optional)
                                color: isColorDark(sections[currentSegment.sectionType].color) ? 'white' : 'black',
                            }}
                        >
                        {sections[currentSegment.sectionType].name}
                        </Badge>
                    )}
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap">{currentSegment.text}</p> {/* Use whitespace-pre-wrap to respect newlines */}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
          <TabsTrigger value="speakers">Speakers</TabsTrigger>
          <TabsTrigger value="sections">Sections</TabsTrigger>
        </TabsList>
        
        {/* Transcript Tab Content */}
        <TabsContent value="transcript">
          <div className="space-y-4">
            {/* Segment List */}
            <Card>
              <CardHeader>
                <CardTitle>Transcript Segments</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4"> {/* Increased height slightly */}
                  <div className="space-y-4">
                    {localSegments.map((segment) => (
                      <div
                        key={segment.id}
                        id={`segment-${segment.id}`} // Add ID for scrolling
                        className={`rounded-md border p-3 ${
                          currentSegment?.id === segment.id ? "bg-muted" : ""
                        } ${editingSegment?.id === segment.id ? "border-primary ring-2 ring-primary/50" : ""}`}
                        // Highlight current segment and editing segment
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center space-x-2">
                            {/* Play button for segment */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => seekToSegment(segment)}
                              aria-label={`Play segment starting at ${formatTime(segment.startTime)}`}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <span className="text-sm text-muted-foreground tabular-nums">
                              {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                            </span>
                             {segment.edited && (
                                <Badge variant="secondary" className="ml-2">Edited</Badge>
                             )}
                          </div>
                          <div className="flex items-center space-x-1"> {/* Reduced space here */}
                            {/* Speaker and Section Badges */}
                            {segment.speakerId && speakerMap[segment.speakerId] && (
                              <Badge variant="outline" className="truncate max-w-[100px]"> {/* Added truncate */}
                                {speakerMap[segment.speakerId].name}
                              </Badge>
                            )}
                            {segment.sectionType && sections[segment.sectionType] && (
                              <Badge
                                className="truncate max-w-[100px]" // Added truncate
                                style={{
                                  backgroundColor: sections[segment.sectionType].color,
                                   color: isColorDark(sections[segment.sectionType].color) ? 'white' : 'black',
                                }}
                              >
                                {sections[segment.sectionType].name}
                              </Badge>
                            )}
                             {/* Edit Button (opens dialog) */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEditingSegment(segment)}
                              aria-label={`Edit segment starting at ${formatTime(segment.startTime)}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {/* Delete Button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteSegment(segment)}
                               aria-label={`Delete segment starting at ${formatTime(segment.startTime)}`}
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {/* Segment Text */}
                        <p className="mt-2 whitespace-pre-wrap">{segment.text}</p> {/* Use whitespace-pre-wrap */}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Add New Segment */}
            <Card>
              <CardHeader>
                <CardTitle>Add New Segment</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...segmentForm}>
                  <form
                    onSubmit={segmentForm.handleSubmit(handleAddSegment)}
                    className="space-y-4"
                  >
                    <FormField
                      control={segmentForm.control}
                      name="text"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Text</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Enter segment transcription" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"> {/* Added sm: breakpoint for grid */}
                      <FormField
                        control={segmentForm.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Time (seconds)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01" // Allow milliseconds
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                placeholder="0.00"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={segmentForm.control}
                        name="endTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Time (seconds)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01" // Allow milliseconds
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                placeholder="0.00"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={segmentForm.control}
                      name="speakerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Speaker</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""} // Convert null to empty string
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a speaker" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem> {/* Option for no speaker */}
                              {Object.values(speakerMap).map((speaker) => (
                                <SelectItem key={speaker.id} value={speaker.id}>
                                  {speaker.name} ({speaker.role})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={segmentForm.control}
                      name="sectionType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Section</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value || ""} // Use value prop for controlled component
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a section" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">None</SelectItem> {/* Option for no section */}
                              {Object.values(sections).map((section) => (
                                <SelectItem key={section.id} value={section.id}>
                                  {section.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit">Add Segment</Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Context Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Context Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...transcriptionForm}>
                  <form
                    onSubmit={transcriptionForm.handleSubmit(saveTranscriptionMetadata)}
                    className="space-y-4"
                  >
                    <FormField
                      control={transcriptionForm.control}
                      name="contextNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes for Analysis</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Add notes about this conversation to help with analysis..."
                              className="min-h-[100px]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save Transcript Metadata"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Speakers Tab Content */}
        <TabsContent value="speakers">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Manage Speakers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                   {/* List of existing speakers */}
                   <ScrollArea className="h-[250px] pr-4"> {/* Added ScrollArea */}
                     <div className="grid gap-3"> {/* Reduced gap */}
                        {Object.values(speakerMap).length === 0 ? (
                            <p className="text-center text-muted-foreground">No speakers added yet.</p>
                        ) : (
                            Object.values(speakerMap).map((speaker) => (
                            <div
                                key={speaker.id}
                                className="flex items-center justify-between rounded-md border p-3"
                            >
                                <div>
                                <p className="font-medium">{speaker.name}</p>
                                <p className="text-sm text-muted-foreground">{speaker.role}</p>
                                </div>
                                <div className="flex space-x-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => startEditingSpeaker(speaker.id)}
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteSpeaker(speaker.id)}
                                >
                                    <Trash className="h-4 w-4" />
                                </Button>
                                </div>
                            </div>
                            ))
                        )}
                     </div>
                   </ScrollArea>
                  
                  <Separator />
                  
                  {/* Form to Add/Edit Speaker */}
                  <Form {...speakerForm}>
                    <form
                      onSubmit={speakerForm.handleSubmit(addUpdateSpeaker)}
                      className="space-y-4"
                    >
                      {/* Hidden ID field for editing */}
                      <FormField
                         control={speakerForm.control}
                         name="id"
                         render={({ field }) => (
                            <FormItem className="hidden"> {/* Hide the ID field */}
                                <FormControl>
                                    <Input type="hidden" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                         )}
                      />
                      <FormField
                        control={speakerForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Speaker name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={speakerForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., Agent, Customer" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full"> {/* Make button full width */}
                        {speakerForm.getValues("id") ? "Update Speaker" : "Add Speaker"}
                      </Button>
                      {speakerForm.getValues("id") && ( // Show Cancel button only when editing
                           <Button type="button" variant="outline" className="w-full" onClick={() => speakerForm.reset({ name: "", role: "", id: undefined })}> {/* Reset form on cancel */}
                               Cancel Edit
                           </Button>
                      )}
                    </form>
                  </Form>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Sections Tab Content */}
        <TabsContent value="sections">
           <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Manage Sections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                   {/* List of existing sections */}
                   <ScrollArea className="h-[250px] pr-4"> {/* Added ScrollArea */}
                      <div className="grid gap-3"> {/* Reduced gap */}
                        {Object.values(sections).length === 0 ? (
                             <p className="text-center text-muted-foreground">No sections added yet.</p>
                        ) : (
                           Object.values(sections).map((section) => (
                            <div
                                key={section.id}
                                className="flex items-center justify-between rounded-md border p-3"
                            >
                                <div className="flex items-center space-x-3">
                                <div
                                    className="w-6 h-6 rounded-full"
                                    style={{ backgroundColor: section.color }}
                                />
                                <p className="font-medium">{section.name}</p>
                                </div>
                                <div className="flex space-x-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => startEditingSection(section.id)}
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteSection(section.id)}
                                >
                                    <Trash className="h-4 w-4" />
                                </Button>
                                </div>
                            </div>
                           ))
                        )}
                      </div>
                   </ScrollArea>
                  
                  <Separator />
                  
                  {/* Form to Add/Edit Section */}
                  <Form {...sectionForm}>
                    <form
                      onSubmit={sectionForm.handleSubmit(addUpdateSection)}
                      className="space-y-4"
                    >
                       {/* Hidden ID field for editing */}
                      <FormField
                         control={sectionForm.control}
                         name="id"
                         render={({ field }) => (
                            <FormItem className="hidden"> {/* Hide the ID field */}
                                <FormControl>
                                    <Input type="hidden" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                         )}
                      />
                      <FormField
                        control={sectionForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Section name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={sectionForm.control}
                        name="color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Color</FormLabel>
                            <FormControl>
                              <div className="flex items-center space-x-2">
                                <Input {...field} type="color" className="w-full h-9" /> {/* Full width for color input */}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full"> {/* Make button full width */}
                        {sectionForm.getValues("id") ? "Update Section" : "Add Section"}
                      </Button>
                       {sectionForm.getValues("id") && ( // Show Cancel button only when editing
                           <Button type="button" variant="outline" className="w-full" onClick={() => sectionForm.reset({ name: "", color: "#3b82f6", id: undefined })}> {/* Reset form on cancel */}
                               Cancel Edit
                           </Button>
                      )}
                    </form>
                  </Form>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Segment Dialog */}
      <Dialog open={editingSegment !== null} onOpenChange={(isOpen) => {
        // Close dialog logic
        if (!isOpen) {
          cancelEditingSegment();
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Segment</DialogTitle>
             {/* Close button */}
             <DialogClose asChild>
                 <Button variant="ghost" size="icon" className="absolute right-4 top-4 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                 </Button>
             </DialogClose>
          </DialogHeader>
          {/* Render form only if a segment is selected for editing */}
          {editingSegment && ( 
            <Form {...segmentForm}>
              <form
                onSubmit={segmentForm.handleSubmit(async (data) => {
                  // Call the update handler with the segment being edited
                  await handleUpdateSegment(editingSegment, data);
                  // Dialog will close via handleUpdateSegment on success
                })}
                className="space-y-4 py-4" // Added padding
              >
                <FormField
                  control={segmentForm.control}
                  name="text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Text</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Edit segment transcription" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={segmentForm.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time (seconds)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            placeholder="0.00"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={segmentForm.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time (seconds)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            placeholder="0.00"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={segmentForm.control}
                  name="speakerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Speaker</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a speaker" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {Object.values(speakerMap).map((speaker) => (
                            <SelectItem key={speaker.id} value={speaker.id}>
                              {speaker.name} ({speaker.role})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={segmentForm.control}
                  name="sectionType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Section</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a section" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                           <SelectItem value="">None</SelectItem>
                           {Object.values(sections).map((section) => (
                             <SelectItem key={section.id} value={section.id}>
                               {section.name}
                             </SelectItem>
                           ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 {/* Add a button to play this segment from within the dialog */}
                 <Button
                   variant="outline"
                   type="button" // Important: Prevent form submission
                   onClick={() => {
                     if (editingSegment) {
                        seekToSegment(editingSegment);
                     }
                   }}
                   className="w-full"
                 >
                   Play Segment
                 </Button>
                <Button type="submit" className="w-full">
                  Save Changes
                </Button>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


// Helper function to determine if text color should be black or white
// based on background color luminance. Useful for dynamic badge text color.
function isColorDark(hexColor: string): boolean {
    // Remove # if it exists
    const cleanHex = hexColor.replace('#', '');
    // Parse hex color to RGB
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    // Calculate luminance (ITU-R BT.709)
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    // Return true if luminance is below a threshold (e.g., 0.5)
    return luminance < 0.5;
}
