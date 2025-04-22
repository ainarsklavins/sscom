'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// Form component for editing global settings
export function GlobalsFormDialog({ isOpen, onOpenChange, globals, onSave }) {
    const [formData, setFormData] = useState({});

    // Populate form when globals prop changes
    useEffect(() => {
        if (globals) {
            setFormData({
                emailSender: globals.emailSender || '',
                sendEmailMode: globals.sendEmailMode || 'preview',
                scrapeDelayMs: globals.scrapeDelayMs || 1500,
                ssBaseUrl: globals.ssBaseUrl || 'https://www.ss.com',
                maxSeenListings: globals.maxSeenListings || 100,
            });
        }
    }, [globals, isOpen]); // Re-run if the dialog opens or globals change

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (value) => {
        setFormData(prev => ({ ...prev, sendEmailMode: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const globalsToSave = {
            ...formData,
            scrapeDelayMs: parseInt(formData.scrapeDelayMs, 10) || 1500, // Ensure number
            maxSeenListings: parseInt(formData.maxSeenListings, 10) || 100, // Ensure number
        };
        onSave(globalsToSave);
        onOpenChange(false); // Close dialog after save
    };

    // Filter out non-editable keys (like API keys loaded from env)
    const editableKeys = [
        'emailSender',
        'sendEmailMode',
        'scrapeDelayMs',
        'ssBaseUrl',
        'maxSeenListings'
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Global Settings</DialogTitle>
                    <DialogDescription>
                        Modify the global configuration. Settings like API keys must be changed via environment variables.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        {/* Email Sender */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="emailSender" className="text-right">Email Sender</Label>
                            <Input id="emailSender" name="emailSender" type="email" value={formData.emailSender || ''} onChange={handleChange} className="col-span-3" placeholder="e.g., noreply@example.com" />
                        </div>
                        {/* Send Email Mode */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="sendEmailMode" className="text-right">Email Mode</Label>
                            <Select name="sendEmailMode" value={formData.sendEmailMode || 'preview'} onValueChange={handleSelectChange}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select mode" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="preview">Preview Only</SelectItem>
                                    <SelectItem value="send">Send Emails</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {/* Scrape Delay */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="scrapeDelayMs" className="text-right">Scrape Delay (ms)</Label>
                            <Input id="scrapeDelayMs" name="scrapeDelayMs" type="number" min="0" value={formData.scrapeDelayMs || ''} onChange={handleChange} className="col-span-3" />
                        </div>
                        {/* SS Base URL */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="ssBaseUrl" className="text-right">SS.COM Base URL</Label>
                            <Input id="ssBaseUrl" name="ssBaseUrl" type="url" value={formData.ssBaseUrl || ''} onChange={handleChange} className="col-span-3" />
                        </div>
                        {/* Max Seen Listings */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="maxSeenListings" className="text-right">Max Seen Listings</Label>
                            <Input id="maxSeenListings" name="maxSeenListings" type="number" min="10" value={formData.maxSeenListings || ''} onChange={handleChange} className="col-span-3" />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancel</Button>
                        </DialogClose>
                        <Button type="submit">Save Global Settings</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
} 