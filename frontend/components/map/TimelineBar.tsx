"use client";

import React, { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import { Play, Pause, SkipBack, SkipForward, Calendar } from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Slider } from "../ui/slider";
import { useTimelineStore, TimelineData } from "../../lib/timeline-store";

interface TimelineBarProps {
    timelineData: TimelineData[];
    onTimelineChange: (data: TimelineData, index: number) => void;
    className?: string;
    position?: "top" | "bottom";
}

export default function TimelineBar({
    timelineData,
    onTimelineChange,
    className = "",
    position = "bottom",
}: TimelineBarProps) {
    const {
        currentIndex,
        isPlaying,
        playbackSpeed,
        setTimelineData,
        setCurrentIndex,
        setIsPlaying,
        nextFrame,
        previousFrame,
    } = useTimelineStore();

    // Update store when timeline data changes
    useEffect(() => {
        if (timelineData.length > 0) {
            setTimelineData(timelineData);
        }
    }, [timelineData, setTimelineData]);

    // Auto-play functionality
    useEffect(() => {
        if (!isPlaying || timelineData.length === 0) return;

        const interval = setInterval(() => {
            nextFrame();
        }, playbackSpeed);

        return () => clearInterval(interval);
    }, [isPlaying, playbackSpeed, nextFrame, timelineData.length]);

    // Notify parent when current index changes
    useEffect(() => {
        if (timelineData.length > 0 && timelineData[currentIndex]) {
            onTimelineChange(timelineData[currentIndex], currentIndex);
        }
    }, [currentIndex, timelineData, onTimelineChange]);

    const handleSliderChange = useCallback(
        (value: number[]) => {
            const newIndex = value[0];
            setCurrentIndex(newIndex);
            setIsPlaying(false); // Stop playing when manually adjusting
        },
        [setCurrentIndex, setIsPlaying]
    );

    const togglePlayback = useCallback(() => {
        setIsPlaying(!isPlaying);
    }, [isPlaying, setIsPlaying]);

    const handlePrevious = useCallback(() => {
        previousFrame();
        setIsPlaying(false);
    }, [previousFrame, setIsPlaying]);

    const handleNext = useCallback(() => {
        nextFrame();
        setIsPlaying(false);
    }, [nextFrame, setIsPlaying]);

    if (timelineData.length === 0) {
        return null;
    }

    const currentData = timelineData[currentIndex];
    const currentDate = currentData ? parseISO(currentData.date) : new Date();

    const positionClasses = position === "top" ? "top-4" : "bottom-4";

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: position === "top" ? -20 : 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: position === "top" ? -20 : 20 }}
                transition={{ duration: 0.3 }}
                className={`absolute ${positionClasses} left-4 right-4 z-20 ${className}`}
            >
                <Card className="bg-background/95 backdrop-blur-sm border border-border/50 shadow-lg">
                    <div className="p-4">
                        {/* Header with date and controls */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <div>
                                    <div className="font-semibold text-sm">
                                        {format(currentDate, "MMM dd, yyyy")}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        Frame {currentIndex + 1} of{" "}
                                        {timelineData.length}
                                    </div>
                                </div>
                            </div>

                            {/* Playback Controls */}
                            <div className="flex items-center space-x-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handlePrevious}
                                    disabled={timelineData.length <= 1}
                                >
                                    <SkipBack className="h-4 w-4" />
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={togglePlayback}
                                    disabled={timelineData.length <= 1}
                                >
                                    {isPlaying ? (
                                        <Pause className="h-4 w-4" />
                                    ) : (
                                        <Play className="h-4 w-4" />
                                    )}
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleNext}
                                    disabled={timelineData.length <= 1}
                                >
                                    <SkipForward className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Timeline Slider */}
                        <div className="space-y-2">
                            <Slider
                                value={[currentIndex]}
                                onValueChange={handleSliderChange}
                                max={timelineData.length - 1}
                                min={0}
                                step={1}
                                className="w-full"
                            />

                            {/* Timeline Markers */}
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>
                                    {format(
                                        parseISO(timelineData[0].date),
                                        "MMM dd"
                                    )}
                                </span>
                                <span>
                                    {format(
                                        parseISO(
                                            timelineData[
                                                timelineData.length - 1
                                            ].date
                                        ),
                                        "MMM dd"
                                    )}
                                </span>
                            </div>
                        </div>

                        {/* Current Data Display */}
                        {currentData && (
                            <motion.div
                                key={currentIndex}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.2 }}
                                className="mt-3 grid grid-cols-2 gap-4 text-xs"
                            >
                                <div>
                                    <span className="text-muted-foreground">
                                        NDVI:
                                    </span>
                                    <span className="ml-1 font-mono">
                                        {currentData.ndvi.toFixed(3)}
                                    </span>
                                </div>

                                {currentData.temperature !== undefined && (
                                    <div>
                                        <span className="text-muted-foreground">
                                            Temp:
                                        </span>
                                        <span className="ml-1 font-mono">
                                            {currentData.temperature.toFixed(1)}
                                            °C
                                        </span>
                                    </div>
                                )}

                                {currentData.precipitation !== undefined && (
                                    <div className="col-span-2">
                                        <span className="text-muted-foreground">
                                            Precipitation:
                                        </span>
                                        <span className="ml-1 font-mono">
                                            {currentData.precipitation.toFixed(
                                                1
                                            )}
                                            mm
                                        </span>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>
                </Card>
            </motion.div>
        </AnimatePresence>
    );
}
