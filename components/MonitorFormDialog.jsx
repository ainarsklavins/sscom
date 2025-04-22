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

// Simple form component for adding/editing monitors
export function MonitorFormDialog({ isOpen, onOpenChange, monitor, onSave }) {
    const [formData, setFormData] = useState({});
    const isEditing = !!monitor?.id;

    // Helpers for parsing form values
    const parseFloatOrNull = (value) => {
        if (value === null || value === undefined || value === '') return null;
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
    }
    const parseIntOrNull = (value) => {
        if (value === null || value === undefined || value === '') return null;
        const num = parseInt(value, 10);
        return isNaN(num) ? null : num;
    }

    // Populate form when dialog opens or monitor changes
    useEffect(() => {
        if (isOpen) {
            const initialData = isEditing ? {
                ...monitor,
                recipients: monitor.recipients?.join(', ') || '',
                minRooms: monitor.filters?.minRooms ?? '',
                maxRooms: monitor.filters?.maxRooms ?? '',
                minSqMeters: monitor.filters?.minSqMeters ?? '',
                maxSqMeters: monitor.filters?.maxSqMeters ?? '',
                minFloor: monitor.filters?.minFloor ?? '', // Added MinFloor
                maxFloor: monitor.filters?.maxFloor ?? '',
                minM2Price: monitor.filters?.minM2Price ?? '', // Added MinM2Price
                maxM2Price: monitor.filters?.maxM2Price ?? '',
                minTotalPrice: monitor.filters?.minTotalPrice ?? '', // Added MinTotalPrice
                maxTotalPrice: monitor.filters?.maxTotalPrice ?? '',
                allowedDistricts: monitor.filters?.allowedDistricts?.join(', ') || '',
            } : {
                // Defaults for new monitor
                name: '',
                type: 'flat',
                url: '',
                maxPages: 10,
                recipients: '',
                minRooms: '', maxRooms: '',
                minSqMeters: '', maxSqMeters: '',
                minFloor: '', maxFloor: '',
                minM2Price: '', maxM2Price: '',
                minTotalPrice: '', maxTotalPrice: '',
                allowedDistricts: '',
            };
            setFormData(initialData);
        }
    }, [monitor, isEditing, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (value) => {
        setFormData(prev => ({ ...prev, type: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        // Construct the filters object from form fields
        const filters = {
            minRooms: parseIntOrNull(formData.minRooms),
            maxRooms: parseIntOrNull(formData.maxRooms),
            minSqMeters: parseFloatOrNull(formData.minSqMeters),
            maxSqMeters: parseFloatOrNull(formData.maxSqMeters),
            minFloor: parseIntOrNull(formData.minFloor),
            maxFloor: parseIntOrNull(formData.maxFloor),
            minM2Price: parseFloatOrNull(formData.minM2Price),
            maxM2Price: parseFloatOrNull(formData.maxM2Price),
            minTotalPrice: parseFloatOrNull(formData.minTotalPrice),
            maxTotalPrice: parseFloatOrNull(formData.maxTotalPrice),
            allowedDistricts: formData.allowedDistricts.split(',').map(d => d.trim()).filter(Boolean),
        };
        // Remove null/empty filter values
        Object.keys(filters).forEach(key => {
            if (filters[key] === null || (Array.isArray(filters[key]) && filters[key].length === 0)) {
                delete filters[key];
            }
        });

        const monitorToSave = {
            name: formData.name,
            type: formData.type,
            url: formData.url,
            id: isEditing ? monitor.id : undefined,
            maxPages: parseInt(formData.maxPages, 10) || 10,
            recipients: formData.recipients.split(',').map(email => email.trim()).filter(Boolean),
            filters: filters,
        };

        onSave(monitorToSave);
        onOpenChange(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Edit Monitor' : 'Add New Monitor'}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? `Editing: ${monitor.name || monitor.id}` : 'Enter details for the new monitor.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 gap-y-4 gap-x-2 px-1 py-4 md:grid-cols-6 md:gap-x-4">

                        {/* Basic Info Fields spanning more columns on medium screens */}
                        <div className="md:col-span-3">
                            <Label htmlFor="name">Name*</Label>
                            <Input id="name" name="name" value={formData.name || ''} onChange={handleChange} required />
                        </div>
                        <div className="md:col-span-3">
                            <Label htmlFor="type">Type*</Label>
                            <Select name="type" required value={formData.type || 'flat'} onValueChange={handleSelectChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="flat">Flat</SelectItem>
                                    <SelectItem value="house">House</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="md:col-span-6">
                            <Label htmlFor="url">URL*</Label>
                            <Input id="url" name="url" type="url" value={formData.url || ''} onChange={handleChange} required />
                        </div>
                        <div className="md:col-span-3">
                            <Label htmlFor="maxPages">Max Pages</Label>
                            <Input id="maxPages" name="maxPages" type="number" min="1" value={formData.maxPages ?? ''} onChange={handleChange} />
                        </div>
                        <div className="md:col-span-3">
                            <Label htmlFor="recipients">Recipients (comma-sep)</Label>
                            <Input id="recipients" name="recipients" placeholder="email1@.., email2@.." value={formData.recipients || ''} onChange={handleChange} />
                        </div>

                        {/* Filters Section Title */}
                        <h4 className="md:col-span-6 font-semibold mt-4 border-t pt-4">Filters (Optional - Leave blank if unused)</h4>

                        {/* Min/Max Pairs spanning 3 columns each */}
                        <div className="md:col-span-3">
                            <Label htmlFor="minRooms">Min Rooms</Label>
                            <Input id="minRooms" name="minRooms" type="number" min="0" step="1" value={formData.minRooms ?? ''} onChange={handleChange} />
                        </div>
                        <div className="md:col-span-3">
                            <Label htmlFor="maxRooms">Max Rooms</Label>
                            <Input id="maxRooms" name="maxRooms" type="number" min="0" step="1" value={formData.maxRooms ?? ''} onChange={handleChange} />
                        </div>

                        <div className="md:col-span-3">
                            <Label htmlFor="minSqMeters">Min M²</Label>
                            <Input id="minSqMeters" name="minSqMeters" type="number" min="0" step="0.01" value={formData.minSqMeters ?? ''} onChange={handleChange} />
                        </div>
                        <div className="md:col-span-3">
                            <Label htmlFor="maxSqMeters">Max M²</Label>
                            <Input id="maxSqMeters" name="maxSqMeters" type="number" min="0" step="0.01" value={formData.maxSqMeters ?? ''} onChange={handleChange} />
                        </div>

                        <div className="md:col-span-3">
                            <Label htmlFor="minFloor">Min Floor</Label>
                            <Input id="minFloor" name="minFloor" type="number" min="0" step="1" value={formData.minFloor ?? ''} onChange={handleChange} />
                        </div>
                        <div className="md:col-span-3">
                            <Label htmlFor="maxFloor">Max Floor</Label>
                            <Input id="maxFloor" name="maxFloor" type="number" min="0" step="1" value={formData.maxFloor ?? ''} onChange={handleChange} />
                        </div>

                        <div className="md:col-span-3">
                            <Label htmlFor="minM2Price">Min Price/M²</Label>
                            <Input id="minM2Price" name="minM2Price" type="number" min="0" step="0.01" value={formData.minM2Price ?? ''} onChange={handleChange} />
                        </div>
                        <div className="md:col-span-3">
                            <Label htmlFor="maxM2Price">Max Price/M²</Label>
                            <Input id="maxM2Price" name="maxM2Price" type="number" min="0" step="0.01" value={formData.maxM2Price ?? ''} onChange={handleChange} />
                        </div>

                        <div className="md:col-span-3">
                            <Label htmlFor="minTotalPrice">Min Total Price</Label>
                            <Input id="minTotalPrice" name="minTotalPrice" type="number" min="0" step="0.01" value={formData.minTotalPrice ?? ''} onChange={handleChange} />
                        </div>
                        <div className="md:col-span-3">
                            <Label htmlFor="maxTotalPrice">Max Total Price</Label>
                            <Input id="maxTotalPrice" name="maxTotalPrice" type="number" min="0" step="0.01" value={formData.maxTotalPrice ?? ''} onChange={handleChange} />
                        </div>

                        <div className="md:col-span-6">
                            <Label htmlFor="allowedDistricts">Allowed Districts (comma-sep)</Label>
                            <Input id="allowedDistricts" name="allowedDistricts" placeholder="Centrs, Agenskalns" value={formData.allowedDistricts || ''} onChange={handleChange} />
                        </div>

                    </div>
                    <DialogFooter className="mt-4">
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancel</Button>
                        </DialogClose>
                        <Button type="submit">{isEditing ? 'Save Changes' : 'Add Monitor'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
} 