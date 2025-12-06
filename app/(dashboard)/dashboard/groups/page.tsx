"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  Users,
  Crown,
  Building2,
  Briefcase,
  Wallet,
  TrendingUp,
  MoreVertical,
  Settings,
  UserPlus,
  Mail,
  Check,
  X,
  Clock,
  Copy,
  ExternalLink,
  Shield,
  Eye,
  Edit,
  Trash2,
  ChevronRight,
  Home,
  Heart,
  Loader2,
} from "lucide-react";
import { LoadingSpinner } from "@/components/loading-spinner";
import { toast } from "sonner";

const GROUP_TYPES = [
  { value: "personal", label: "Personal", icon: Wallet, color: "bg-blue-500" },
  { value: "family", label: "Family", icon: Heart, color: "bg-pink-500" },
  { value: "business", label: "Business", icon: Building2, color: "bg-emerald-500" },
  { value: "investment", label: "Investment", icon: TrendingUp, color: "bg-amber-500" },
  { value: "side_hustle", label: "Side Hustle", icon: Briefcase, color: "bg-purple-500" },
];

const ROLE_BADGES = {
  owner: { label: "Owner", variant: "default" as const, icon: Crown },
  admin: { label: "Admin", variant: "secondary" as const, icon: Shield },
  editor: { label: "Editor", variant: "outline" as const, icon: Edit },
  viewer: { label: "Viewer", variant: "outline" as const, icon: Eye },
};

const INVITE_STATUS_BADGES = {
  pending: { label: "Pending", variant: "secondary" as const, color: "text-amber-500" },
  accepted: { label: "Accepted", variant: "default" as const, color: "text-emerald-500" },
  declined: { label: "Declined", variant: "destructive" as const, color: "text-red-500" },
  expired: { label: "Expired", variant: "outline" as const, color: "text-muted-foreground" },
};

export default function FinanceGroupsPage() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("groups");

  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    type: "personal",
    currency: "MYR",
    isDefault: false,
  });

  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    type: "personal",
    currency: "MYR",
    isDefault: false,
  });

  const [inviteForm, setInviteForm] = useState({
    inviteeEmail: "",
    inviteeName: "",
    proposedRole: "viewer",
    message: "",
  });

  // Fetch finance groups
  const { data: groupsData, isLoading: isLoadingGroups } = useQuery({
    queryKey: ["finance-groups"],
    queryFn: async () => {
      const res = await fetch("/api/finance-groups");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: isAuthenticated,
  });

  // Fetch invites for selected group
  const { data: invitesData, isLoading: isLoadingInvites } = useQuery({
    queryKey: ["finance-group-invites", selectedGroupId],
    queryFn: async () => {
      const res = await fetch(`/api/finance-groups/${selectedGroupId}/invites`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedGroupId && isAuthenticated,
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (data: typeof createForm) => {
      const res = await fetch("/api/finance-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["finance-groups"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setIsCreateDialogOpen(false);
      setCreateForm({
        name: "",
        description: "",
        type: "personal",
        currency: "MYR",
        isDefault: false,
      });
      toast.success("Finance Group Created", {
        description: `"${variables.name}" workspace has been created.`,
      });
    },
    onError: (error) => {
      toast.error("Failed to create group", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  // Send invite mutation
  const sendInviteMutation = useMutation({
    mutationFn: async (data: typeof inviteForm & { groupId: string }) => {
      const res = await fetch(`/api/finance-groups/${data.groupId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to send invite");
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["finance-group-invites"] });
      setIsInviteDialogOpen(false);
      setInviteForm({
        inviteeEmail: "",
        inviteeName: "",
        proposedRole: "viewer",
        message: "",
      });
      toast.success("Invite Sent", {
        description: `Invitation sent to ${variables.inviteeEmail}.`,
      });
    },
    onError: (error) => {
      toast.error("Failed to send invite", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  // Update group mutation
  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof editForm }) => {
      const res = await fetch(`/api/finance-groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update group");
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["finance-groups"] });
      setIsEditDialogOpen(false);
      setEditingGroup(null);
      toast.success("Group Updated", {
        description: `"${variables.data.name}" has been updated.`,
      });
    },
    onError: (error) => {
      toast.error("Failed to update group", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  // Handle opening edit dialog
  const handleEditGroup = (group: any) => {
    setEditingGroup(group);
    setEditForm({
      name: group.name,
      description: group.description || "",
      type: group.type || "personal",
      currency: group.currency || "MYR",
      isDefault: group.isDefault || false,
    });
    setIsEditDialogOpen(true);
  };

  const groups = groupsData?.data || [];

  const getGroupTypeInfo = (type: string) => {
    return GROUP_TYPES.find((t) => t.value === type) || GROUP_TYPES[0];
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-MY", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Finance Groups</h1>
          <p className="text-muted-foreground mt-1">
            Manage your financial workspaces and collaborate with others
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Group
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display">Create Finance Group</DialogTitle>
              <DialogDescription>
                Create a new workspace to organize your finances
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Group Name *</Label>
                <Input
                  placeholder="e.g., Family Budget, Business Expenses"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={createForm.type}
                  onValueChange={(value) => setCreateForm({ ...createForm, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GROUP_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="w-4 h-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Brief description of this group..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={createForm.currency}
                  onValueChange={(value) => setCreateForm({ ...createForm, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MYR">MYR - Malaysian Ringgit</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Set as Default</Label>
                  <p className="text-xs text-muted-foreground">
                    This group will be selected by default
                  </p>
                </div>
                <Switch
                  checked={createForm.isDefault}
                  onCheckedChange={(checked) => setCreateForm({ ...createForm, isDefault: checked })}
                />
              </div>

              <Button
                className="w-full"
                onClick={() => createGroupMutation.mutate(createForm)}
                disabled={createGroupMutation.isPending || !createForm.name}
              >
                {createGroupMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Create Group
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-card/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{groups.length}</p>
              <p className="text-xs text-muted-foreground">Total Groups</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-card/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Crown className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{groups.filter((g: any) => g.isOwner).length}</p>
              <p className="text-xs text-muted-foreground">Owned</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-card/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <UserPlus className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{groups.filter((g: any) => !g.isOwner).length}</p>
              <p className="text-xs text-muted-foreground">Shared</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-card/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{invitesData?.data?.filter((i: any) => i.status === "pending").length || 0}</p>
              <p className="text-xs text-muted-foreground">Pending Invites</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="groups">My Groups</TabsTrigger>
          <TabsTrigger value="invites">Pending Invites</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="mt-6">
          {isLoadingGroups ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : groups.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-2">No Finance Groups Yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Create your first finance group to start organizing your finances. 
                You can have separate groups for personal, family, or business expenses.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Group
              </Button>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group: any) => {
                const typeInfo = getGroupTypeInfo(group.type);
                const TypeIcon = typeInfo.icon;

                return (
                  <Card
                    key={group.id}
                    className="p-5 hover:border-primary/50 transition-all cursor-pointer group"
                    onClick={() => setSelectedGroupId(group.id)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${typeInfo.color}`}>
                          <TypeIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold flex items-center gap-2">
                            {group.name}
                            {group.isDefault && (
                              <Badge variant="secondary" className="text-xs">Default</Badge>
                            )}
                          </h3>
                          <p className="text-xs text-muted-foreground">{typeInfo.label}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleEditGroup(group);
                          }}>
                            <Settings className="w-4 h-4 mr-2" />
                            Settings
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            setSelectedGroupId(group.id);
                            setIsInviteDialogOpen(true);
                          }}>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Invite Member
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {group.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {group.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        {group.isOwner ? (
                          <>
                            <Crown className="w-3 h-3 text-amber-500" />
                            <span>Owner</span>
                          </>
                        ) : (
                          <>
                            <Users className="w-3 h-3" />
                            <span>{group.membership?.role || "Member"}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <span>{group.currency}</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invites" className="mt-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Pending Invitations</h3>
            <p className="text-sm text-muted-foreground">
              Invitations you&apos;ve received from other users will appear here.
            </p>
            {/* TODO: Implement received invites list */}
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Recent Activity</h3>
            <p className="text-sm text-muted-foreground">
              Activity across all your finance groups will appear here.
            </p>
            {/* TODO: Implement activity log */}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display">Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to collaborate on this finance group
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email Address *</Label>
              <Input
                type="email"
                placeholder="colleague@example.com"
                value={inviteForm.inviteeEmail}
                onChange={(e) => setInviteForm({ ...inviteForm, inviteeEmail: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Name (Optional)</Label>
              <Input
                placeholder="Their name"
                value={inviteForm.inviteeName}
                onChange={(e) => setInviteForm({ ...inviteForm, inviteeName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={inviteForm.proposedRole}
                onValueChange={(value) => setInviteForm({ ...inviteForm, proposedRole: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Admin - Full access
                    </div>
                  </SelectItem>
                  <SelectItem value="editor">
                    <div className="flex items-center gap-2">
                      <Edit className="w-4 h-4" />
                      Editor - Can edit data
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Viewer - Read-only access
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Personal Message (Optional)</Label>
              <Textarea
                placeholder="Add a personal message..."
                value={inviteForm.message}
                onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                rows={3}
              />
            </div>

            <Button
              className="w-full"
              onClick={() => selectedGroupId && sendInviteMutation.mutate({
                ...inviteForm,
                groupId: selectedGroupId,
              })}
              disabled={sendInviteMutation.isPending || !inviteForm.inviteeEmail}
            >
              {sendInviteMutation.isPending ? (
                <LoadingSpinner size="xs" variant="minimal" className="mr-2" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              Send Invitation
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display">Group Settings</DialogTitle>
            <DialogDescription>
              Update the settings for this finance group
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Group Name *</Label>
              <Input
                placeholder="e.g., Personal Budget"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="What is this group for?"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={editForm.type}
                  onValueChange={(value) => setEditForm({ ...editForm, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GROUP_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="w-4 h-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={editForm.currency}
                  onValueChange={(value) => setEditForm({ ...editForm, currency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MYR">MYR - Malaysian Ringgit</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
              <div>
                <Label className="text-sm font-medium">Set as Default</Label>
                <p className="text-xs text-muted-foreground">
                  Make this your default workspace
                </p>
              </div>
              <Switch
                checked={editForm.isDefault}
                onCheckedChange={(checked) => setEditForm({ ...editForm, isDefault: checked })}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingGroup(null);
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => editingGroup && updateGroupMutation.mutate({
                  id: editingGroup.id,
                  data: editForm,
                })}
                disabled={updateGroupMutation.isPending || !editForm.name}
              >
                {updateGroupMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
