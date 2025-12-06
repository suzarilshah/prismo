"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import {
  Loader2,
  Plus,
  Search,
  Star,
  StarOff,
  Pencil,
  Trash2,
  Store,
  Globe,
  Phone,
  Mail,
  MapPin,
  MoreVertical,
  ChevronDown,
  ChevronRight,
  Grid3X3,
  List,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Utensils,
  Car,
  Home,
  Zap,
  Heart,
  Folder,
  Tag,
} from "lucide-react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface Vendor {
  id: string;
  name: string;
  categoryId: string | null;
  description: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  logo: string | null;
  defaultPaymentMethod: string | null;
  isFavorite: boolean;
  notes: string | null;
  category?: { id: string; name: string; color: string } | null;
}

interface Category {
  id: string;
  name: string;
  type: string;
  color: string;
}

async function fetchVendors(search?: string, favorites?: boolean) {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  if (favorites) params.append("favorites", "true");
  const res = await fetch(`/api/vendors?${params}`);
  if (!res.ok) throw new Error("Failed to fetch vendors");
  const data = await res.json();
  return data.data as Vendor[];
}

async function fetchCategories() {
  const res = await fetch("/api/categories");
  if (!res.ok) throw new Error("Failed to fetch categories");
  const data = await res.json();
  return data.data as Category[];
}

async function createVendor(vendor: Partial<Vendor>) {
  const res = await fetch("/api/vendors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(vendor),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create vendor");
  }
  return res.json();
}

async function updateVendor(id: string, vendor: Partial<Vendor>) {
  const res = await fetch(`/api/vendors/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(vendor),
  });
  if (!res.ok) throw new Error("Failed to update vendor");
  return res.json();
}

async function deleteVendor(id: string) {
  const res = await fetch(`/api/vendors/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete vendor");
  return res.json();
}

// VendorCard component
function VendorCard({ 
  vendor, 
  onEdit, 
  onDelete, 
  onToggleFavorite 
}: { 
  vendor: Vendor; 
  onEdit: (v: Vendor) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
}) {
  return (
    <Card className="data-card hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Store className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{vendor.name}</h3>
              {vendor.category && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${vendor.category.color}20`,
                    color: vendor.category.color,
                  }}
                >
                  {vendor.category.name}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onToggleFavorite(vendor.id, !vendor.isFavorite)}
            >
              {vendor.isFavorite ? (
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              ) : (
                <StarOff className="w-4 h-4 text-muted-foreground" />
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(vendor)}>
                  <Pencil className="w-4 h-4 mr-2" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete(vendor.id)}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {vendor.description && (
          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
            {vendor.description}
          </p>
        )}

        <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
          {vendor.website && (
            <div className="flex items-center gap-2">
              <Globe className="w-3 h-3" />
              <a
                href={vendor.website}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary truncate"
              >
                {vendor.website.replace(/^https?:\/\//, "")}
              </a>
            </div>
          )}
          {vendor.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3 h-3" />
              <span>{vendor.phone}</span>
            </div>
          )}
          {vendor.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-3 h-3" />
              <span className="truncate">{vendor.email}</span>
            </div>
          )}
          {vendor.address && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{vendor.address}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Category icon mapping
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  "food": Utensils,
  "dining": Utensils,
  "transportation": Car,
  "transport": Car,
  "shopping": ShoppingBag,
  "utilities": Zap,
  "healthcare": Heart,
  "health": Heart,
  "housing": Home,
  "home": Home,
  "default": Store,
};

const getCategoryIcon = (categoryName: string) => {
  const lowerName = categoryName.toLowerCase();
  for (const [key, Icon] of Object.entries(CATEGORY_ICONS)) {
    if (lowerName.includes(key)) return Icon;
  }
  return CATEGORY_ICONS.default;
};

export default function VendorsPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [deleteVendorId, setDeleteVendorId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"category" | "grid" | "list">("category");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["all"]));
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    description: "",
    website: "",
    phone: "",
    email: "",
    address: "",
    defaultPaymentMethod: "",
    isFavorite: false,
    notes: "",
  });

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["vendors", searchQuery, showFavoritesOnly],
    queryFn: () => fetchVendors(searchQuery, showFavoritesOnly),
    enabled: isAuthenticated,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    enabled: isAuthenticated,
  });

  // Group vendors by category
  const vendorsByCategory = useMemo(() => {
    const grouped: Record<string, { category: Category | null; vendors: Vendor[] }> = {};
    
    // Initialize with "Uncategorized" group
    grouped["uncategorized"] = { category: null, vendors: [] };
    
    // Initialize groups for each expense category
    categories.filter(c => c.type === "expense").forEach(cat => {
      grouped[cat.id] = { category: cat, vendors: [] };
    });
    
    // Group vendors
    vendors.forEach((vendor: Vendor) => {
      if (vendor.categoryId && grouped[vendor.categoryId]) {
        grouped[vendor.categoryId].vendors.push(vendor);
      } else {
        grouped["uncategorized"].vendors.push(vendor);
      }
    });
    
    // Sort by vendor count (descending) and remove empty groups
    return Object.entries(grouped)
      .filter(([_, group]) => group.vendors.length > 0)
      .sort((a, b) => b[1].vendors.length - a[1].vendors.length);
  }, [vendors, categories]);

  // Stats
  const stats = useMemo(() => ({
    total: vendors.length,
    favorites: vendors.filter((v: Vendor) => v.isFavorite).length,
    categories: vendorsByCategory.length,
    uncategorized: vendors.filter((v: Vendor) => !v.categoryId).length,
  }), [vendors, vendorsByCategory]);

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const createMutation = useMutation({
    mutationFn: createVendor,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      resetForm();
      setIsDialogOpen(false);
      toast.success("Vendor Added", {
        description: `"${variables.name}" has been added to your vendor list.`,
      });
    },
    onError: (error) => {
      toast.error("Failed to add vendor", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Vendor> }) =>
      updateVendor(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      resetForm();
      setIsDialogOpen(false);
      setEditingVendor(null);
      toast.success("Vendor Updated", {
        description: `"${variables.data.name}" has been updated.`,
      });
    },
    onError: (error) => {
      toast.error("Failed to update vendor", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setDeleteVendorId(null);
      toast.success("Vendor Deleted", {
        description: "The vendor has been removed from your list.",
      });
    },
    onError: (error) => {
      toast.error("Failed to delete vendor", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const toggleFavorite = useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      updateVendor(id, { isFavorite }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success(variables.isFavorite ? "Added to Favorites" : "Removed from Favorites");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      categoryId: "",
      description: "",
      website: "",
      phone: "",
      email: "",
      address: "",
      defaultPaymentMethod: "",
      isFavorite: false,
      notes: "",
    });
  };

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name,
      categoryId: vendor.categoryId || "",
      description: vendor.description || "",
      website: vendor.website || "",
      phone: vendor.phone || "",
      email: vendor.email || "",
      address: vendor.address || "",
      defaultPaymentMethod: vendor.defaultPaymentMethod || "",
      isFavorite: vendor.isFavorite,
      notes: vendor.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingVendor) {
      updateMutation.mutate({ id: editingVendor.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setEditingVendor(null);
      resetForm();
    }
    setIsDialogOpen(open);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" text="Loading vendors..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-semibold text-3xl tracking-tight">
            Vendors
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your merchants, stores, and service providers
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">
                {editingVendor ? "Edit Vendor" : "Add New Vendor"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Vendor Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Tesco, Shell, Celcom"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Default Category</Label>
                <Select
                  value={formData.categoryId || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, categoryId: value === "none" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories
                      .filter((c) => c.type === "expense")
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the vendor"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    placeholder="https://example.com"
                    value={formData.website}
                    onChange={(e) =>
                      setFormData({ ...formData, website: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="+60123456789"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  placeholder="Full address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Default Payment Method</Label>
                <Select
                  value={formData.defaultPaymentMethod || "none"}
                  onValueChange={(value) =>
                    setFormData({ ...formData, defaultPaymentMethod: value === "none" ? "" : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="debit">Debit Card</SelectItem>
                    <SelectItem value="credit">Credit Card</SelectItem>
                    <SelectItem value="tng">Touch n Go</SelectItem>
                    <SelectItem value="grabpay">GrabPay</SelectItem>
                    <SelectItem value="boost">Boost</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="fpx">FPX</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={2}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  !formData.name
                }
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editingVendor ? "Updating..." : "Creating..."}
                  </>
                ) : editingVendor ? (
                  "Update Vendor"
                ) : (
                  "Add Vendor"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="data-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Store className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Vendors</p>
            </div>
          </div>
        </Card>
        <Card className="data-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <Star className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.favorites}</p>
              <p className="text-xs text-muted-foreground">Favorites</p>
            </div>
          </div>
        </Card>
        <Card className="data-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Folder className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.categories}</p>
              <p className="text-xs text-muted-foreground">Categories</p>
            </div>
          </div>
        </Card>
        <Card className="data-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <Tag className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.uncategorized}</p>
              <p className="text-xs text-muted-foreground">Uncategorized</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and View Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={showFavoritesOnly ? "default" : "outline"}
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className="gap-2"
          >
            <Star className="w-4 h-4" />
            Favorites
          </Button>
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === "category" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("category")}
              className="rounded-none"
            >
              <Folder className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-none"
            >
              <Grid3X3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="rounded-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Category-Grouped View */}
      {vendors.length > 0 ? (
        <>
          {viewMode === "category" && (
            <div className="space-y-4">
              {vendorsByCategory.map(([categoryId, { category, vendors: categoryVendors }]) => {
                const CategoryIcon = category ? getCategoryIcon(category.name) : Tag;
                const isExpanded = expandedCategories.has(categoryId) || expandedCategories.has("all");
                
                return (
                  <Card key={categoryId} className="data-card overflow-hidden">
                    <Collapsible open={isExpanded} onOpenChange={() => toggleCategory(categoryId)}>
                      <CollapsibleTrigger asChild>
                        <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-10 h-10 rounded-xl flex items-center justify-center"
                              style={{ 
                                backgroundColor: category?.color ? `${category.color}20` : 'var(--muted)',
                              }}
                            >
                              <CategoryIcon 
                                className="w-5 h-5" 
                                style={{ color: category?.color || 'var(--muted-foreground)' }}
                              />
                            </div>
                            <div className="text-left">
                              <h3 className="font-semibold">
                                {category?.name || "Uncategorized"}
                              </h3>
                              <p className="text-xs text-muted-foreground">
                                {categoryVendors.length} vendor{categoryVendors.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {categoryVendors.length}
                            </Badge>
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="border-t">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                            {categoryVendors.map((vendor) => (
                              <VendorCard
                                key={vendor.id}
                                vendor={vendor}
                                onEdit={handleEdit}
                                onDelete={setDeleteVendorId}
                                onToggleFavorite={(id, isFavorite) => toggleFavorite.mutate({ id, isFavorite })}
                              />
                            ))}
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );
              })}
            </div>
          )}

          {viewMode === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vendors.map((vendor) => (
                <VendorCard
                  key={vendor.id}
                  vendor={vendor}
                  onEdit={handleEdit}
                  onDelete={setDeleteVendorId}
                  onToggleFavorite={(id, isFavorite) => toggleFavorite.mutate({ id, isFavorite })}
                />
              ))}
            </div>
          )}

          {viewMode === "list" && (
            <Card className="data-card overflow-hidden">
              <div className="divide-y divide-border">
                {vendors.map((vendor) => (
                  <div key={vendor.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Store className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{vendor.name}</h3>
                          {vendor.isFavorite && (
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {vendor.category && (
                            <Badge 
                              variant="outline" 
                              className="text-xs"
                              style={{ 
                                borderColor: vendor.category.color,
                                color: vendor.category.color
                              }}
                            >
                              {vendor.category.name}
                            </Badge>
                          )}
                          {vendor.phone && <span>{vendor.phone}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(vendor)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => toggleFavorite.mutate({ id: vendor.id, isFavorite: !vendor.isFavorite })}
                      >
                        {vendor.isFavorite ? (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        ) : (
                          <StarOff className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setDeleteVendorId(vendor.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      ) : (
        <Card className="data-card p-12 text-center">
          <Store className="w-16 h-16 mx-auto mb-4 text-muted-foreground/20" />
          <h3 className="text-lg font-semibold mb-2">No Vendors Yet</h3>
          <p className="text-muted-foreground mb-4">
            Add your frequently used merchants, stores, and service providers
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Vendor
          </Button>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteVendorId}
        onOpenChange={() => setDeleteVendorId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vendor?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              vendor from your records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteVendorId && deleteMutation.mutate(deleteVendorId)}
            >
              {deleteMutation.isPending ? (
                <LoadingSpinner size="xs" variant="minimal" className="mr-2" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
