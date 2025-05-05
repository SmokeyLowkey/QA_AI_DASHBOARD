"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar, Clock } from "lucide-react";

export function DateTimeDisplay() {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    // Update time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="flex items-center text-sm text-muted-foreground">
      <Calendar className="h-4 w-4 mr-2" />
      <span>{format(currentTime, "EEEE, MMMM d, yyyy")}</span>
      <Clock className="h-4 w-4 ml-4 mr-2" />
      <span>{format(currentTime, "h:mm a")}</span>
    </div>
  );
}
