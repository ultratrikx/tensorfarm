import { create } from "zustand";

export interface TimelineData {
    date: string;
    ndvi: number;
    url: string;
    temperature?: number;
    precipitation?: number;
}

interface TimelineStore {
    timelineData: TimelineData[];
    currentIndex: number;
    isPlaying: boolean;
    playbackSpeed: number;

    // Actions
    setTimelineData: (data: TimelineData[]) => void;
    setCurrentIndex: (index: number) => void;
    setIsPlaying: (playing: boolean) => void;
    setPlaybackSpeed: (speed: number) => void;
    nextFrame: () => void;
    previousFrame: () => void;
}

export const useTimelineStore = create<TimelineStore>((set, get) => ({
    timelineData: [],
    currentIndex: 0,
    isPlaying: false,
    playbackSpeed: 1000, // milliseconds between frames

    setTimelineData: (data) =>
        set({
            timelineData: data,
            currentIndex: 0,
            isPlaying: false,
        }),

    setCurrentIndex: (index) => set({ currentIndex: index }),

    setIsPlaying: (playing) => set({ isPlaying: playing }),

    setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

    nextFrame: () => {
        const { timelineData, currentIndex } = get();
        if (currentIndex < timelineData.length - 1) {
            set({ currentIndex: currentIndex + 1 });
        } else {
            set({ currentIndex: 0, isPlaying: false }); // Loop back to start
        }
    },

    previousFrame: () => {
        const { timelineData, currentIndex } = get();
        if (currentIndex > 0) {
            set({ currentIndex: currentIndex - 1 });
        } else {
            set({ currentIndex: timelineData.length - 1 }); // Loop to end
        }
    },
}));
