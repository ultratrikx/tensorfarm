"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "../ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Loader2, Send } from "lucide-react";
import { TimelineData } from "../../lib/timeline-store";

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

interface ChatWindowProps {
    isOpen: boolean;
    onClose: () => void;
    selectedRegion: { name: string } | null;
    timelineData: TimelineData[];
    currentTimelineIndex: number;
}

export default function ChatWindow({
    isOpen,
    onClose,
    selectedRegion,
    timelineData,
    currentTimelineIndex,
}: ChatWindowProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    useEffect(() => {
        if (isOpen) {
            setMessages([
                {
                    role: "assistant",
                    content: "Hello! How can I help you analyze this region?",
                },
            ]);
        }
    }, [isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: ChatMessage = { role: "user", content: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setLoading(true);

        try {
            const currentData = timelineData[currentTimelineIndex];
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: input,
                    context: {
                        selectedRegion,
                        currentNdvi: currentData?.ndvi,
                        temperature: currentData?.temperature,
                        precipitation: currentData?.precipitation,
                        date: currentData?.date,
                    },
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to get response from AI assistant.");
            }

            const data = await response.json();
            const assistantMessage: ChatMessage = {
                role: "assistant",
                content: data.message,
            };
            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error: unknown) {
            console.error("Chat error:", error);
            const errorMessage: ChatMessage = {
                role: "assistant",
                content:
                    "Sorry, I'm having trouble connecting. Please try again later.",
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="fixed bottom-4 right-4 !transform-none sm:max-w-[425px]">
                <div className="cursor-move">
                    <DialogHeader>
                        <DialogTitle>AI Assistant</DialogTitle>
                        <DialogDescription>
                            Ask questions about the selected region and data.
                        </DialogDescription>
                    </DialogHeader>
                </div>
                <div className="h-80 overflow-y-auto p-4 space-y-4 border-t border-b">
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex ${
                                msg.role === "user" ? "justify-end" : "justify-start"
                            }`}
                        >
                            <div
                                className={`p-2 rounded-lg max-w-xs ${
                                    msg.role === "user"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-muted"
                                }`}
                            >
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="p-2 rounded-lg bg-muted">
                                <Loader2 className="h-5 w-5 animate-spin" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <DialogFooter>
                    <div className="flex w-full space-x-2">
                        <Input
                            value={input}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                            onKeyPress={(e: React.KeyboardEvent) => e.key === "Enter" && handleSend()}
                            placeholder="Type a message..."
                        />
                        <Button onClick={handleSend} disabled={loading}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
