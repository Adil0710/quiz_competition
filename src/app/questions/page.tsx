'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Search, Upload, Play, Volume2, Image } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Question {
  _id: string;
  question: string;
  type: 'mcq' | 'media' | 'rapid_fire';
  options?: string[];
  correctAnswer?: string | number;
  mediaUrl?: string;
  mediaType?: 'image' | 'audio' | 'video';
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
  points: number;
  isUsed: boolean;
  createdAt: string;
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    question: '',
    type: 'mcq' as 'mcq' | 'media' | 'rapid_fire',
    options: ['', '', '', ''],
    correctAnswer: '',
    mediaType: 'image' as 'image' | 'audio' | 'video',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    category: '',
    points: 1
  });
  const { toast } = useToast();

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
    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('question', formData.question);
      formDataToSend.append('type', formData.type);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('difficulty', formData.difficulty);
      formDataToSend.append('points', formData.points.toString());

      if (formData.type === 'mcq' || formData.type === 'media') {
        formDataToSend.append('options', JSON.stringify(formData.options.filter(opt => opt.trim())));
        formDataToSend.append('correctAnswer', formData.correctAnswer);
      }

      if (formData.type === 'media') {
        formDataToSend.append('mediaType', formData.mediaType);
        if (mediaFile) {
          formDataToSend.append('mediaFile', mediaFile);
        }
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
      points: question.points
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
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
      points: 1
    });
    setEditingQuestion(null);
    setMediaFile(null);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'mcq': return '📝';
      case 'media': return '🎬';
      case 'rapid_fire': return '⚡';
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
                      required
                    />
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
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : (editingQuestion ? 'Update' : 'Create')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
              </SelectContent>
            </Select>
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
                      <div className="truncate" title={question.question}>
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
                    <TableCell>{question.category}</TableCell>
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
                        >
                          <Trash2 className="h-4 w-4" />
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
    </div>
  );
}
