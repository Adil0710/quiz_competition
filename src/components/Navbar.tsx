"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Separator } from "./ui/separator";
import { ModeToggle } from "./theme-toggle";
import Image from "next/image";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Settings, Type } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const [selectedFont, setSelectedFont] = useState("default");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [globalSettings, setGlobalSettings] = useState({
    mcqPoints: 10,
    mediaPoints: 10,
    buzzerPoints: 10,
    rapidFirePoints: 10,
    sequencePoints: 10,
    visualRapidFirePoints: 10,
    mcqNegativeMarking: false,
    mediaNegativeMarking: false,
    rapidFireNegativeMarking: false,
    sequenceNegativeMarking: false,
    visualRapidFireNegativeMarking: false
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const nav = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/competitions", label: "Competitions" },
    { href: "/teams", label: "Teams" },
    { href: "/schools", label: "Schools" },
     { href: "/questions", label: "Questions" },
  ];

  const fonts = [
    { value: "default", label: "Default", family: "inherit" },
    { value: "noto-nastaliq", label: "Noto Nastaliq Urdu", family: "'Noto Nastaliq Urdu', serif" },
    { value: "gulzar", label: "Gulzar", family: "'Gulzar', serif" },
    { value: "jameel-noori", label: "Jameel Noori Nastaleeq", family: "'Jameel Noori Nastaleeq', serif" },
  ];

  // Load font preference from localStorage on mount
  useEffect(() => {
    const savedFont = localStorage.getItem("quiz-font-preference");
    if (savedFont) {
      setSelectedFont(savedFont);
      applyFontToDocument(savedFont);
    }
    // Load global settings
    loadGlobalSettings();
  }, []);

  const loadGlobalSettings = async () => {
    try {
      const response = await fetch('/api/global-settings');
      const data = await response.json();
      if (data.success) {
        setGlobalSettings(data.data);
      }
    } catch (error) {
      console.error('Error loading global settings:', error);
    }
  };

  const saveGlobalSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/global-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(globalSettings),
      });
      const data = await response.json();
      if (data.success) {
        toast({
          title: "Settings Saved",
          description: "Global points settings updated successfully",
        });
        setSettingsOpen(false);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsChange = (field: string, value: number | boolean) => {
    setGlobalSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const applyFontToDocument = (fontValue: string) => {
    const font = fonts.find(f => f.value === fontValue);
    if (font) {
      document.documentElement.style.setProperty('--quiz-font-family', font.family);
      console.log('Font applied:', font.family); // Debug log
    }
  };

  const handleFontChange = (value: string) => {
    setSelectedFont(value);
    localStorage.setItem("quiz-font-preference", value);
    applyFontToDocument(value);
  };
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-auto items-center justify-between px-4">
        <Link href="/" className="font-semibold"><Image src="/logo.png" alt="quiz competition" width={1000} height={1000} className="w-40"/></Link>
        <nav className="flex items-center gap-5 text-sm">
          {nav.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className={cn(
                "transition-colors hover:text-foreground/80 font-medium ",
                pathname === i.href ? "text-foreground font-bold" : "text-foreground/60"
              )}
            >
              {i.label}
            </Link>
          ))}
          <div className="h-6 w-0.5 bg-border" />
          
          
          {/* Global Settings */}
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Settings className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Settings</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="questions" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="questions">Question Settings</TabsTrigger>
                  <TabsTrigger value="fonts">Font Settings</TabsTrigger>
                </TabsList>
                
                <TabsContent value="questions" className="space-y-6 mt-6">
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold">Points & Negative Marking Configuration</h4>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="mcqPoints" className="text-sm font-medium">MCQ Points</Label>
                        <Input
                          id="mcqPoints"
                          type="number"
                          value={globalSettings.mcqPoints}
                          onChange={(e) => handleSettingsChange('mcqPoints', parseInt(e.target.value) || 0)}
                          className="col-span-1"
                        />
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="mcqNegativeMarking"
                            checked={globalSettings.mcqNegativeMarking}
                            onCheckedChange={(checked) => handleSettingsChange('mcqNegativeMarking', checked)}
                          />
                          <Label htmlFor="mcqNegativeMarking" className="text-sm">Negative Marking</Label>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="mediaPoints" className="text-sm font-medium">Media Points</Label>
                        <Input
                          id="mediaPoints"
                          type="number"
                          value={globalSettings.mediaPoints}
                          onChange={(e) => handleSettingsChange('mediaPoints', parseInt(e.target.value) || 0)}
                          className="col-span-1"
                        />
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="mediaNegativeMarking"
                            checked={globalSettings.mediaNegativeMarking}
                            onCheckedChange={(checked) => handleSettingsChange('mediaNegativeMarking', checked)}
                          />
                          <Label htmlFor="mediaNegativeMarking" className="text-sm">Negative Marking</Label>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="buzzerPoints" className="text-sm font-medium">Buzzer Points</Label>
                        <Input
                          id="buzzerPoints"
                          type="number"
                          value={globalSettings.buzzerPoints}
                          onChange={(e) => handleSettingsChange('buzzerPoints', parseInt(e.target.value) || 0)}
                          className="col-span-1"
                        />
                        <div className="text-sm text-gray-500 italic">Manual Control</div>
                      </div>
                      
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="rapidFirePoints" className="text-sm font-medium">Rapid Fire Points</Label>
                        <Input
                          id="rapidFirePoints"
                          type="number"
                          value={globalSettings.rapidFirePoints}
                          onChange={(e) => handleSettingsChange('rapidFirePoints', parseInt(e.target.value) || 0)}
                          className="col-span-1"
                        />
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="rapidFireNegativeMarking"
                            checked={globalSettings.rapidFireNegativeMarking}
                            onCheckedChange={(checked) => handleSettingsChange('rapidFireNegativeMarking', checked)}
                          />
                          <Label htmlFor="rapidFireNegativeMarking" className="text-sm">Negative Marking</Label>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="sequencePoints" className="text-sm font-medium">Sequence Points</Label>
                        <Input
                          id="sequencePoints"
                          type="number"
                          value={globalSettings.sequencePoints}
                          onChange={(e) => handleSettingsChange('sequencePoints', parseInt(e.target.value) || 0)}
                          className="col-span-1"
                        />
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="sequenceNegativeMarking"
                            checked={globalSettings.sequenceNegativeMarking}
                            onCheckedChange={(checked) => handleSettingsChange('sequenceNegativeMarking', checked)}
                          />
                          <Label htmlFor="sequenceNegativeMarking" className="text-sm">Negative Marking</Label>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 items-center gap-4">
                        <Label htmlFor="visualRapidFirePoints" className="text-sm font-medium">Visual Rapid Fire Points</Label>
                        <Input
                          id="visualRapidFirePoints"
                          type="number"
                          value={globalSettings.visualRapidFirePoints}
                          onChange={(e) => handleSettingsChange('visualRapidFirePoints', parseInt(e.target.value) || 0)}
                          className="col-span-1"
                        />
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="visualRapidFireNegativeMarking"
                            checked={globalSettings.visualRapidFireNegativeMarking}
                            onCheckedChange={(checked) => handleSettingsChange('visualRapidFireNegativeMarking', checked)}
                          />
                          <Label htmlFor="visualRapidFireNegativeMarking" className="text-sm">Negative Marking</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="fonts" className="space-y-6 mt-6">
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold">Font Configuration</h4>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <Type className="w-5 h-5" />
                        <Label htmlFor="fontSelect" className="text-sm font-medium">Select Font:</Label>
                        <Select value={selectedFont} onValueChange={handleFontChange}>
                          <SelectTrigger className="w-[250px]">
                            <SelectValue placeholder="Select font" />
                          </SelectTrigger>
                          <SelectContent>
                            {fonts.map((font) => (
                              <SelectItem key={font.value} value={font.value}>
                                <span style={{ fontFamily: font.family }}>
                                  {font.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Font Preview:</Label>
                        <div className="p-4 border rounded-lg bg-muted/50">
                          <p className="quiz-font text-lg">
                            یہ ایک نمونہ متن ہے - This is a sample text
                          </p>
                          <p className="quiz-font text-sm text-muted-foreground mt-2">
                            Current font: {fonts.find(f => f.value === selectedFont)?.label}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setSettingsOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveGlobalSettings} disabled={loading}>
                    {loading ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </Tabs>
            </DialogContent>
          </Dialog>
          
          <div className="h-6 w-0.5 bg-border" />
          
          <ModeToggle/>
        </nav>
      </div>
    </header>
  );
}
