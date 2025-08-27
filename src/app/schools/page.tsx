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
import { useSchoolStore } from '@/stores/useSchoolStore';

interface School {
  _id: string;
  name: string;
  code: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  createdAt: string;
}

export default function SchoolsPage() {
  const { 
    filteredSchools, 
    loading, 
    searchTerm, 
    setSearchTerm, 
    fetchSchools,
    addSchool,
    updateSchool,
    removeSchool
  } = useSchoolStore();
  
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    contactEmail: '',
    contactPhone: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchSchools();
  }, [fetchSchools]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingSchool ? `/api/schools/${editingSchool._id}` : '/api/schools';
      const method = editingSchool ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: `School ${editingSchool ? 'updated' : 'created'} successfully`
        });
        
        if (editingSchool) {
          updateSchool(editingSchool._id, data.data);
        } else {
          addSchool(data.data);
        }
        
        setIsDialogOpen(false);
        resetForm();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to save school",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save school",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (school: School) => {
    setEditingSchool(school);
    setFormData({
      name: school.name,
      code: school.code,
      address: school.address,
      contactEmail: school.contactEmail,
      contactPhone: school.contactPhone
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this school?')) return;

    try {
      setDeletingId(id);
      const response = await fetch(`/api/schools/${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: "School deleted successfully"
        });
        removeSchool(id);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete school",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete school",
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
    setEditingSchool(null);
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
          <h1 className="text-3xl font-bold">School Management</h1>
          <p className="text-muted-foreground">Add and manage participating schools</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add School
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingSchool ? 'Edit School' : 'Add New School'}</DialogTitle>
              <DialogDescription>
                {editingSchool ? 'Update school information' : 'Add a new school to the system'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">School Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter school name"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="code">School Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="Enter school code (e.g., MIT)"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter school address"
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
                    editingSchool ? 'Update' : 'Create'
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
          <CardTitle>Search Schools</CardTitle>
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

      {/* Schools Table */}
      <Card>
        <CardHeader>
          <CardTitle>Schools ({filteredSchools.length})</CardTitle>
          <CardDescription>List of all registered schools</CardDescription>
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
          ) : filteredSchools.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No schools found</p>
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
                {filteredSchools.map((school) => (
                  <TableRow key={school._id}>
                    <TableCell className="font-medium">{school.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{school.code}</Badge>
                    </TableCell>
                    <TableCell>{school.contactEmail}</TableCell>
                    <TableCell>{school.contactPhone}</TableCell>
                    <TableCell>{new Date(school.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(school)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(school._id)}
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
