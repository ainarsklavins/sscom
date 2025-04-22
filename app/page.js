'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button'; // Assuming Button component exists
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'; // Assuming Card components exist
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { MonitorFormDialog } from '@/components/MonitorFormDialog'; // Import the form dialog
import { GlobalsFormDialog } from '@/components/GlobalsFormDialog'; // Import the globals form
import React from 'react';

// --- Helper function for generating unique IDs (simple version) ---
// Note: saveConfig now handles ID generation if undefined
// const generateId = () => `monitor_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

export default function HomePage() {
  const [config, setConfig] = useState({ monitors: [], globals: {} });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  // State for Dialogs/Forms
  const [isMonitorFormOpen, setIsMonitorFormOpen] = useState(false);
  const [editingMonitor, setEditingMonitor] = useState(null); // null for Add, object for Edit
  const [isGlobalsFormOpen, setIsGlobalsFormOpen] = useState(false); // State for globals form
  // State for Delete confirmation
  const [monitorToDelete, setMonitorToDelete] = useState(null);

  const fetchConfig = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/config');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // Ensure monitors and globals exist, even if S3 returns empty object
      setConfig({ monitors: data.monitors || [], globals: data.globals || {} });
    } catch (e) {
      console.error("Failed to fetch config:", e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  // --- Placeholder Functions (to be implemented) ---
  const handleAddMonitor = () => {
    setEditingMonitor(null); // Clear any previous edit state
    setIsMonitorFormOpen(true);
  };
  const handleEditMonitor = (monitorId) => {
    const monitor = config.monitors.find(m => m.id === monitorId);
    if (monitor) {
      setEditingMonitor(monitor);
      setIsMonitorFormOpen(true);
    }
  };
  const handleDeleteMonitor = async (monitorId) => {
    console.log('TODO: Delete Monitor', monitorId);
    // // Example delete logic (needs refinement):
    // const updatedMonitors = config.monitors.filter(m => m.id !== monitorId);
    // await saveConfig({ ...config, monitors: updatedMonitors });
  };
  const handleTriggerMonitor = async (monitorId) => {
    const monitorName = config.monitors.find(m => m.id === monitorId)?.name || monitorId;
    toast.info(`🚀 Triggering monitor: ${monitorName}...`);
    try {
      const response = await fetch(`/api/trigger/${monitorId}`, { method: 'POST' });
      const result = await response.json();

      if (!response.ok || result.status === 'error') {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      toast.success(`✅ Monitor ${monitorName} triggered successfully!`, {
        description: `${result.newListingCount} new listings found. ${result.message}`,
      });

    } catch (error) {
      console.error(`Error triggering monitor ${monitorId}:`, error);
      toast.error(`❌ Error triggering ${monitorName}: ${error.message}`);
    }
  };
  const handleEditGlobals = () => {
    setIsGlobalsFormOpen(true);
  };
  const handleSaveGlobals = async (newGlobals) => {
    // Merge new globals with existing ones (including non-editable like API keys from env)
    const updatedGlobals = { ...config.globals, ...newGlobals };
    await saveConfig({ ...config, globals: updatedGlobals });
    // Dialog closes itself
  };

  const saveConfig = async (newConfig) => {
    // Ensure IDs exist for new monitors before saving
    const configToSave = {
      ...newConfig,
      // Assign ID only if it's missing (handles adding new items)
      monitors: newConfig.monitors.map(m => m.id ? m : { ...m, id: `monitor_${Date.now()}_${Math.random().toString(36).substring(2, 7)}` })
    };

    setIsLoading(true); // Indicate saving process
    setError(null);
    try {
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configToSave), // Save the config with generated IDs
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      await fetchConfig(); // Re-fetch to confirm changes
      toast.success("Configuration saved successfully!");
    } catch (e) {
      console.error("Failed to save config:", e);
      setError(e.message);
      toast.error(`Failed to save configuration: ${e.message}`);
    }
    // No finally setIsLoading(false) here, as fetchConfig does it.
  };

  // --- Action Handlers ---
  const handleDeleteMonitorConfirm = async () => {
    if (!monitorToDelete) return;
    console.log('🗑️ Deleting Monitor', monitorToDelete.id);
    const updatedMonitors = config.monitors.filter(m => m.id !== monitorToDelete.id);
    await saveConfig({ ...config, monitors: updatedMonitors });
    setMonitorToDelete(null); // Close the dialog
  };

  // Called by MonitorFormDialog when saving
  const handleSaveMonitor = async (monitorData) => {
    let updatedMonitors;
    if (monitorData.id) { // Existing monitor
      updatedMonitors = config.monitors.map(m =>
        m.id === monitorData.id ? { ...m, ...monitorData } : m
      );
    } else { // New monitor
      updatedMonitors = [...config.monitors, monitorData]; // ID will be added by saveConfig
    }
    await saveConfig({ ...config, monitors: updatedMonitors });
    // Dialog is closed by MonitorFormDialog itself
  };

  // --- Manual Save Handler --- 
  const handleForceSave = () => {
    console.log("💾 Manually saving current config to S3...");
    saveConfig(config);
  };

  // --- Render Logic ---
  if (isLoading && !config.monitors.length) { // Show loading only on initial load
    return <div className="p-6">Loading configuration...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">Error loading configuration: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Monitoring Configuration</h1>
        <Button onClick={handleForceSave} variant="outline">💾 Save Config to S3</Button>
      </div>

      {/* --- Monitors Section --- */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Monitors</h2>
          <Button onClick={handleAddMonitor}>➕ Add Monitor</Button>
        </div>
        {config.monitors.length === 0 ? (
          <p>No monitors configured yet.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {config.monitors.map((monitor) => (
              <Card key={monitor.id}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>{monitor.name || monitor.id}</span>
                    <span className="text-sm font-normal bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                      {monitor.type}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground break-all">
                  <p><span className="font-medium">URL:</span> {monitor.url}</p>
                  <p><span className="font-medium">Max Pages:</span> {monitor.maxPages}</p>
                  <p><span className="font-medium">Recipients:</span> {monitor.recipients?.join(', ') || 'None'}</p>
                  {/* Display Filters */}
                  {monitor.filters && Object.keys(monitor.filters).length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="font-medium mb-1">Filters:</p>
                      <ul className="list-disc list-inside pl-1 space-y-0.5">
                        {/* Explicitly list min/max pairs */}
                        {renderFilterPair(monitor.filters, 'Rooms', 'minRooms', 'maxRooms')}
                        {renderFilterPair(monitor.filters, 'M²', 'minSqMeters', 'maxSqMeters')}
                        {renderFilterPair(monitor.filters, 'Floor', 'minFloor', 'maxFloor')}
                        {renderFilterPair(monitor.filters, 'Price/M²', 'minM2Price', 'maxM2Price')}
                        {renderFilterPair(monitor.filters, 'Total Price', 'minTotalPrice', 'maxTotalPrice')}
                        {/* Handle allowedDistricts separately */}
                        {monitor.filters.allowedDistricts && monitor.filters.allowedDistricts.length > 0 && (
                          <li>Districts: {monitor.filters.allowedDistricts.join(', ')}</li>
                        )}
                      </ul>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEditMonitor(monitor.id)}>Edit</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleTriggerMonitor(monitor.id)}>🚀 Trigger</Button>
                  <AlertDialog onOpenChange={(open) => !open && setMonitorToDelete(null)}>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" onClick={() => setMonitorToDelete(monitor)}>Delete</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the
                          monitor "{monitorToDelete?.name || monitorToDelete?.id}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteMonitorConfirm}>Continue</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* --- Global Settings Section --- */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Global Settings</h2>
          <Button onClick={handleEditGlobals} variant="outline">Edit Globals</Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
              {Object.entries(config.globals || {}).map(([key, value]) => {
                // Avoid showing sensitive keys loaded from env vars
                if (['resendApiKey', 'cronSecret', 's3BucketName'].includes(key)) return null;
                // Prettify key names
                const prettyKey = key
                  .replace(/([A-Z])/g, ' $1') // Add space before capitals
                  .replace(/^./, str => str.toUpperCase()); // Capitalize first letter

                return (
                  <React.Fragment key={key}>
                    <dt className="font-medium text-muted-foreground">{prettyKey}</dt>
                    <dd>{String(value)}</dd>
                  </React.Fragment>
                );
              })}
            </dl>
          </CardContent>
        </Card>
      </section>

      {/* --- Render the Dialogs --- */}
      <MonitorFormDialog
        isOpen={isMonitorFormOpen}
        onOpenChange={setIsMonitorFormOpen}
        monitor={editingMonitor}
        onSave={handleSaveMonitor}
      />
      <GlobalsFormDialog
        isOpen={isGlobalsFormOpen}
        onOpenChange={setIsGlobalsFormOpen}
        globals={config.globals}
        onSave={handleSaveGlobals}
      />

    </div>
  );
}

// Helper function to render min/max filter pairs concisely
function renderFilterPair(filters, label, minKey, maxKey) {
  const minValue = filters[minKey];
  const maxValue = filters[maxKey];
  let text = '';

  if (minValue !== null && minValue !== undefined) {
    text += `Min ${label}: ${minValue}`;
  }
  if (maxValue !== null && maxValue !== undefined) {
    if (text) text += ' / '; // Add separator if min value exists
    text += `Max ${label}: ${maxValue}`;
  }

  return text ? <li key={minKey}>{text}</li> : null;
}
