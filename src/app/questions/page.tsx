'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Search, Upload, Play, Volume2, Image, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Question {
  _id: string;
  question: string;
  type: 'mcq' | 'media' | 'rapid_fire' | 'buzzer' | 'sequence' | 'visual_rapid_fire';
  options?: string[];
  correctAnswer?: string | number;
  mediaUrl?: string;
  mediaType?: 'image' | 'audio' | 'video';
  imageUrls?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  points: number;
  isUsed: boolean;
  createdAt: string;
  phase: 'league' | 'semi_final' | 'final';
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [importTab, setImportTab] = useState<'mcq'|'buzzer'|'sequence'>('mcq');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{created:number;errors:{row:number;message:string}[]}|null>(null);
  const [formData, setFormData] = useState({
    question: '',
    type: 'mcq' as 'mcq' | 'media' | 'rapid_fire' | 'buzzer' | 'sequence' | 'visual_rapid_fire',
    options: ['', '', '', ''],
    correctAnswer: '',
    mediaType: 'image' as 'image' | 'audio' | 'video',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    category: '',
    points: 1,
    phase: 'league' as 'league'|'semi_final'|'final'
  });
  const [vrfFiles, setVrfFiles] = useState<FileList | null>(null);
  const [vrfUploading, setVrfUploading] = useState(false);
  const [vrfImageUrls, setVrfImageUrls] = useState<string[]>([]);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const { toast } = useToast();

  // Detect if text contains RTL scripts (Arabic, Urdu, Hebrew, etc.)
  const isRTL = (s?: string) => {
    if (!s) return false;
    return /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/.test(s);
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    let filtered = questions.filter(question =>
      question.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filterType !== 'all') {
      filtered = filtered.filter(question => question.type === filterType);
    }

    setFilteredQuestions(filtered);
  }, [questions, searchTerm, filterType]);

  const fetchQuestions = async () => {
    try {
      const response = await fetch('/api/questions');
      const data = await response.json();
      if (data.success) {
        setQuestions(data.data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch questions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('question', formData.question);
      formDataToSend.append('type', formData.type);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('difficulty', formData.difficulty);
      formDataToSend.append('points', formData.points.toString());
      formDataToSend.append('phase', formData.phase);

      if (formData.type === 'mcq' || formData.type === 'media') {
        formDataToSend.append('options', JSON.stringify(formData.options.filter(opt => opt.trim())));
        formDataToSend.append('correctAnswer', formData.correctAnswer);
      } else if (formData.type === 'buzzer') {
        formDataToSend.append('correctAnswer', formData.correctAnswer);
      } else if (formData.type === 'sequence') {
        formDataToSend.append('options', JSON.stringify(formData.options.filter(opt => opt.trim())));
        // Accept comma string like 1,2,3,4
        formDataToSend.append('correctAnswer', formData.correctAnswer);
      }

      if (formData.type === 'media') {
        formDataToSend.append('mediaType', formData.mediaType);
        if (mediaFile) {
          formDataToSend.append('mediaFile', mediaFile);
        }
      } else if (formData.type === 'visual_rapid_fire') {
        // Attach uploaded image URLs for visual rapid fire
        if (vrfImageUrls.length === 0) {
          throw new Error('Please upload at least one image for Visual Rapid Fire');
        }
        formDataToSend.append('imageUrls', JSON.stringify(vrfImageUrls));
      }

      const url = editingQuestion ? `/api/questions/${editingQuestion._id}` : '/api/questions';
      const method = editingQuestion ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        body: formDataToSend
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: `Question ${editingQuestion ? 'updated' : 'created'} successfully`
        });
        setIsDialogOpen(false);
        resetForm();
        fetchQuestions();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to save question",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save question",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setFormData({
      question: question.question,
      type: question.type,
      options: question.options || ['', '', '', ''],
      correctAnswer: question.correctAnswer?.toString() || '',
      mediaType: question.mediaType || 'image',
      difficulty: question.difficulty,
      category: question.category,
      points: question.points,
      phase: question.phase || 'league'
    });
    setVrfImageUrls(question.imageUrls || []);
    setVrfFiles(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      setDeletingId(id);
      const response = await fetch(`/api/questions/${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: "Question deleted successfully"
        });
        fetchQuestions();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete question",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete question",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      question: '',
      type: 'mcq',
      options: ['', '', '', ''],
      correctAnswer: '',
      mediaType: 'image',
      difficulty: 'medium',
      category: '',
      points: 1,
      phase: 'league'
    });
    setEditingQuestion(null);
    setMediaFile(null);
    setVrfFiles(null);
    setVrfImageUrls([]);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleBulkDelete = async () => {
    if (filterType === 'all') return;
    
    setBulkDeleting(true);
    try {
      const response = await fetch(`/api/questions/bulk-delete?type=${filterType}`, {
        method: 'DELETE'
      });
      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: `Deleted ${data.deletedCount} ${filterType.replace('_', ' ')} question(s)`
        });
        setIsBulkDeleteDialogOpen(false);
        setFilterType('all');
        fetchQuestions();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete questions",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete questions",
        variant: "destructive"
      });
    } finally {
      setBulkDeleting(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'mcq': return '📝';
      case 'media': return '🎬';
      case 'rapid_fire': return '⚡';
      case 'buzzer': return '🔔';
      case 'sequence': return '🔢';
      case 'visual_rapid_fire': return '🖼️';
      default: return '❓';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hard': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Question Management</h1>
          <p className="text-muted-foreground">Add and manage quiz questions with media support</p>
        </div>
        <div className="flex gap-2">
          {/* Single Add */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Question
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingQuestion ? 'Edit Question' : 'Add New Question'}</DialogTitle>
                <DialogDescription>
                  {editingQuestion ? 'Update question information' : 'Add a new question to the question bank'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="question">Question</Label>
                  <Textarea
                    id="question"
                    value={formData.question}
                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                    placeholder="Enter your question"
                    className={`quiz-font ${isRTL(formData.question) ? 'text-right' : ''}`}
                    dir={isRTL(formData.question) ? 'rtl' : 'ltr'}
                    style={{ unicodeBidi: 'isolate' }}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="type">Question Type</Label>
                    <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mcq">Multiple Choice (MCQ)</SelectItem>
                        <SelectItem value="media">Media Question</SelectItem>
                        <SelectItem value="rapid_fire">Rapid Fire</SelectItem>
                        <SelectItem value="buzzer">Buzzer</SelectItem>
                        <SelectItem value="sequence">Sequence</SelectItem>
                        <SelectItem value="visual_rapid_fire">Visual Rapid Fire</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g., Science, History"
                      className={`quiz-font ${isRTL(formData.category) ? 'text-right' : ''}`}
                      dir={isRTL(formData.category) ? 'rtl' : 'ltr'}
                      style={{ unicodeBidi: 'isolate' }}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="phase">Phase</Label>
                    <Select value={formData.phase} onValueChange={(value: any) => setFormData({ ...formData, phase: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="league">League</SelectItem>
                        <SelectItem value="semi_final">Semi-Final</SelectItem>
                        <SelectItem value="final">Final</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select value={formData.difficulty} onValueChange={(value: any) => setFormData({ ...formData, difficulty: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="points">Points</Label>
                    <Input
                      id="points"
                      type="number"
                      min="1"
                      value={formData.points}
                      onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 1 })}
                      required
                    />
                  </div>
                </div>

                {/* Options for MCQ and Media questions */}
                {(formData.type === 'mcq' || formData.type === 'media') && (
                  <>
                    <div className="grid gap-2">
                      <Label>Options</Label>
                      {formData.options.map((option, index) => (
                        <Input
                          key={index}
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...formData.options];
                            newOptions[index] = e.target.value;
                            setFormData({ ...formData, options: newOptions });
                          }}
                          placeholder={`Option ${index + 1}`}
                          className={`quiz-font ${isRTL(option) ? 'text-right' : ''}`}
                          dir={isRTL(option) ? 'rtl' : 'ltr'}
                          style={{ unicodeBidi: 'isolate' }}
                        />
                      ))}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="correctAnswer">Correct Answer</Label>
                      <Select value={formData.correctAnswer} onValueChange={(value) => setFormData({ ...formData, correctAnswer: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select correct answer" />
                        </SelectTrigger>
                        <SelectContent>
                          {formData.options.map((option, index) => (
                            option.trim() && (
                              <SelectItem key={index} value={option}>
                                {option}
                              </SelectItem>
                            )
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* Visual Rapid Fire - multiple images */}
                {formData.type === 'visual_rapid_fire' && (
                  <>
                    <div className="grid gap-2">
                      <Label>Upload Images (multiple)</Label>
                      <Input type="file" accept="image/*" multiple onChange={(e)=>setVrfFiles(e.target.files)} />
                      <div>
                        <Button type="button" disabled={!vrfFiles || vrfUploading} onClick={async()=>{
                          if (!vrfFiles || vrfFiles.length === 0) return;
                          setVrfUploading(true);
                          try {
                            const fd = new FormData();
                            fd.append('folder', 'visual-rapid-fire');
                            Array.from(vrfFiles).forEach((file, idx)=> fd.append(`file${idx}`, file));
                            const res = await fetch('/api/uploads', { method: 'POST', body: fd });
                            const data = await res.json();
                            if (data.success) {
                              const urls: string[] = (data.files || []).map((f:any)=>f.url).filter(Boolean);
                              setVrfImageUrls(urls);
                            }
                          } finally {
                            setVrfUploading(false);
                          }
                        }}>{vrfUploading ? 'Uploading...' : 'Upload Images'}</Button>
                      </div>
                    </div>
                    {vrfImageUrls.length > 0 && (
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                        {vrfImageUrls.map((u, i)=> (
                          <div key={i} className="relative border rounded overflow-hidden">
                            <img src={u} alt={`img-${i}`} className="w-full h-24 object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Buzzer - free text answer */}
                {formData.type === 'buzzer' && (
                  <div className="grid gap-2">
                    <Label htmlFor="answer">Answer</Label>
                    <Input 
                      id="answer" 
                      value={formData.correctAnswer} 
                      onChange={(e)=>setFormData({...formData, correctAnswer: e.target.value})} 
                      placeholder="Type the correct answer" 
                      className={`quiz-font ${isRTL(formData.correctAnswer) ? 'text-right' : ''}`}
                      dir={isRTL(formData.correctAnswer) ? 'rtl' : 'ltr'}
                      style={{ unicodeBidi: 'isolate' }}
                    />
                  </div>
                )}

                {/* Sequence - options and order */}
                {formData.type === 'sequence' && (
                  <>
                    <div className="grid gap-2">
                      <Label>Options</Label>
                      {formData.options.map((option, index) => (
                        <Input
                          key={index}
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...formData.options];
                            newOptions[index] = e.target.value;
                            setFormData({ ...formData, options: newOptions });
                          }}
                          placeholder={`Option ${index + 1}`}
                          className={`quiz-font ${isRTL(option) ? 'text-right' : ''}`}
                          dir={isRTL(option) ? 'rtl' : 'ltr'}
                          style={{ unicodeBidi: 'isolate' }}
                        />
                      ))}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="sequence">Correct Sequence (comma separated, e.g., 2,1,3,4)</Label>
                      <Input id="sequence" value={formData.correctAnswer} onChange={(e)=>setFormData({...formData, correctAnswer: e.target.value})} />
                    </div>
                  </>
                )}

                {/* Media upload for media questions */}
                {formData.type === 'media' && (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="mediaType">Media Type</Label>
                      <Select value={formData.mediaType} onValueChange={(value: any) => setFormData({ ...formData, mediaType: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="image">Image</SelectItem>
                          <SelectItem value="audio">Audio</SelectItem>
                          <SelectItem value="video">Video</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="mediaFile">Upload Media File</Label>
                      <Input
                        id="mediaFile"
                        type="file"
                        accept={
                          formData.mediaType === 'image' ? 'image/*' :
                          formData.mediaType === 'audio' ? 'audio/*' : 'video/*'
                        }
                        onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                      />
                    </div>
                  </>
                )}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      editingQuestion ? 'Update' : 'Create'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Bulk Import */}
          <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={()=>setIsImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" /> Bulk Import
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Bulk Import Questions</DialogTitle>
                <DialogDescription>Upload Excel (.xlsx) files per round type.</DialogDescription>
              </DialogHeader>
              <Tabs value={importTab} onValueChange={(v)=>setImportTab(v as any)}>
                <TabsList>
                  <TabsTrigger value="mcq">MCQ</TabsTrigger>
                  <TabsTrigger value="buzzer">Buzzer</TabsTrigger>
                  <TabsTrigger value="sequence">Sequence</TabsTrigger>
                </TabsList>
                {(['mcq','buzzer','sequence'] as const).map(t => (
                  <TabsContent key={t} value={t} className="space-y-4 pt-4">
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" onClick={async()=>{
                        const res = await fetch(`/api/questions/templates?type=${t}`);
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${t}_template.xlsx`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                      }}>Download {t.toUpperCase()} Template</Button>
                    </div>
                    <div className="grid gap-2">
                      <Label>Upload {t.toUpperCase()} Excel</Label>
                      <Input type="file" accept=".xlsx,.xls" onChange={(e)=>setImportFile(e.target.files?.[0]||null)} />
                    </div>
                    <div>
                      <Button disabled={!importFile || importing} onClick={async()=>{
                        if (!importFile) return;
                        setImporting(true);
                        setImportResult(null);
                        try {
                          const fd = new FormData();
                          fd.append('file', importFile);
                          fd.append('type', t);
                          const res = await fetch('/api/questions/import', { method: 'POST', body: fd });
                          const data = await res.json();
                          if (data.success) {
                            setImportResult({ created: data.created, errors: data.errors || [] });
                            if (data.created > 0) fetchQuestions();
                          } else {
                            setImportResult({ created: 0, errors: [{ row: 0, message: data.error || 'Import failed' }] });
                          }
                        } catch (e:any) {
                          setImportResult({ created: 0, errors: [{ row: 0, message: e?.message || 'Import failed' }] });
                        } finally {
                          setImporting(false);
                        }
                      }}>{importing ? 'Importing...' : 'Import'}</Button>
                    </div>
                    {importResult && (
                      <div className="space-y-2">
                        <p className="text-sm">Created: <strong>{importResult.created}</strong></p>
                        {importResult.errors.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold mb-2">Errors</p>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Row</TableHead>
                                  <TableHead>Message</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {importResult.errors.map((er,i)=>(
                                  <TableRow key={i}>
                                    <TableCell>{er.row}</TableCell>
                                    <TableCell className="text-red-600">{er.message}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={()=>{ setIsImportOpen(false); setImportFile(null); setImportResult(null); }}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search questions or categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="mcq">MCQ Only</SelectItem>
                <SelectItem value="media">Media Only</SelectItem>
                <SelectItem value="rapid_fire">Rapid Fire Only</SelectItem>
                <SelectItem value="buzzer">Buzzer Only</SelectItem>
                <SelectItem value="sequence">Sequence Only</SelectItem>
                <SelectItem value="visual_rapid_fire">Visual Rapid Fire Only</SelectItem>
              </SelectContent>
            </Select>
            {filterType !== 'all' && (
              <Button 
                variant="destructive" 
                onClick={() => setIsBulkDeleteDialogOpen(true)}
                disabled={filteredQuestions.length === 0}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete All {filterType.replace('_', ' ').toUpperCase()}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Questions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Questions ({filteredQuestions.length})</CardTitle>
          <CardDescription>Manage your question bank</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading questions...</div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No questions found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuestions.map((question) => (
                  <TableRow key={question._id}>
                    <TableCell className="max-w-xs">
                      <div 
                        className={`truncate quiz-font ${isRTL(question.question) ? 'text-right' : ''}`}
                        title={question.question}
                        dir={isRTL(question.question) ? 'rtl' : 'ltr'}
                        style={{ unicodeBidi: 'isolate' }}
                      >
                        {question.question}
                      </div>
                      {question.mediaUrl && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          {question.mediaType === 'image' && <Image className="h-3 w-3" />}
                          {question.mediaType === 'audio' && <Volume2 className="h-3 w-3" />}
                          {question.mediaType === 'video' && <Play className="h-3 w-3" />}
                          {question.mediaType}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getTypeIcon(question.type)} {question.type.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span 
                        className={`quiz-font ${isRTL(question.category) ? 'text-right' : ''}`}
                        dir={isRTL(question.category) ? 'rtl' : 'ltr'}
                        style={{ unicodeBidi: 'isolate' }}
                      >
                        {question.category}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getDifficultyColor(question.difficulty)}>
                        {question.difficulty}
                      </Badge>
                    </TableCell>
                    <TableCell>{question.points}</TableCell>
                    <TableCell>
                      <Badge variant={question.isUsed ? "destructive" : "default"}>
                        {question.isUsed ? 'Used' : 'Available'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(question)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(question._id)}
                          disabled={deletingId === question._id}
                        >
                          {deletingId === question._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all <strong>{filteredQuestions.length}</strong> questions of type <strong>{filterType.replace('_', ' ').toUpperCase()}</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleBulkDelete();
              }}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete All'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
