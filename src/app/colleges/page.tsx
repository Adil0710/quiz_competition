'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Search, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';

interface College {
  _id: string;
  name: string;
  code: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  createdAt: string;
}

export default function CollegesPage() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [filteredColleges, setFilteredColleges] = useState<College[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCollege, setEditingCollege] = useState<College | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    contactEmail: '',
    contactPhone: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchColleges();
  }, []);

  useEffect(() => {
    const filtered = colleges.filter(college =>
      college.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      college.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      college.contactEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredColleges(filtered);
  }, [colleges, searchTerm]);

  const fetchColleges = async () => {
    try {
      const response = await fetch('/api/colleges');
      const data = await response.json();
      if (data.success) {
        setColleges(data.data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch colleges",
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
      const url = editingCollege ? `/api/colleges/${editingCollege._id}` : '/api/colleges';
      const method = editingCollege ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: `College ${editingCollege ? 'updated' : 'created'} successfully`
        });
        setIsDialogOpen(false);
        resetForm();
        fetchColleges();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to save college",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save college",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (college: College) => {
    setEditingCollege(college);
    setFormData({
      name: college.name,
      code: college.code,
      address: college.address,
      contactEmail: college.contactEmail,
      contactPhone: college.contactPhone
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this college?')) return;

    try {
      setDeletingId(id);
      const response = await fetch(`/api/colleges/${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: "College deleted successfully"
        });
        fetchColleges();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete college",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete college",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      address: '',
      contactEmail: '',
      contactPhone: ''
    });
    setEditingCollege(null);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">College Management</h1>
          <p className="text-muted-foreground">Add and manage participating colleges</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add College
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingCollege ? 'Edit College' : 'Add New College'}</DialogTitle>
              <DialogDescription>
                {editingCollege ? 'Update college information' : 'Add a new college to the system'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">College Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter college name"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="code">College Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="Enter college code (e.g., MIT)"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter college address"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="Enter contact email"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="Enter contact phone"
                    required
                  />
                </div>
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
                    editingCollege ? 'Update' : 'Create'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Colleges</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, code, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Colleges Table */}
      <Card>
        <CardHeader>
          <CardTitle>Colleges ({filteredColleges.length})</CardTitle>
          <CardDescription>List of all registered colleges</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="grid grid-cols-12 gap-4 items-center">
                  <Skeleton className="col-span-3 h-6" />
                  <Skeleton className="col-span-2 h-6" />
                  <Skeleton className="col-span-3 h-6" />
                  <Skeleton className="col-span-2 h-6" />
                  <Skeleton className="col-span-2 h-10" />
                </div>
              ))}
            </div>
          ) : filteredColleges.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No colleges found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Contact Email</TableHead>
                  <TableHead>Contact Phone</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredColleges.map((college) => (
                  <TableRow key={college._id}>
                    <TableCell className="font-medium">{college.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{college.code}</Badge>
                    </TableCell>
                    <TableCell>{college.contactEmail}</TableCell>
                    <TableCell>{college.contactPhone}</TableCell>
                    <TableCell>{new Date(college.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(college)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(college._id)}
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
