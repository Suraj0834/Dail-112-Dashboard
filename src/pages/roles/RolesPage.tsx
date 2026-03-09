// =============================================================================
// pages/roles/RolesPage.tsx - Role & Permission Management
// =============================================================================

import React, { useState } from 'react';
import {
    Box, Typography, Card, CardContent, Grid, Button, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    Checkbox, FormControlLabel, FormGroup, IconButton, Tooltip,
    LinearProgress, Alert, Paper,
} from '@mui/material';
import {
    Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
    AdminPanelSettings as RolesIcon, Lock as LockIcon,
    Security as SecurityIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesService } from '../../services/api.service';
import toast from 'react-hot-toast';

interface Role {
    _id: string;
    name: string;
    displayName: string;
    description: string;
    permissions: string[];
    isSystem: boolean;
    isActive: boolean;
    createdAt: string;
}

// All available permissions
const ALL_PERMISSIONS = [
    { group: 'Dashboard', perms: ['dashboard.view'] },
    { group: 'Cases', perms: ['cases.view', 'cases.create', 'cases.update', 'cases.delete', 'cases.assign'] },
    { group: 'SOS', perms: ['sos.view', 'sos.dispatch', 'sos.resolve'] },
    { group: 'Police', perms: ['police.view', 'police.create', 'police.update', 'police.deactivate'] },
    { group: 'Criminals', perms: ['criminals.view', 'criminals.create', 'criminals.update'] },
    { group: 'Vehicles', perms: ['vehicles.view', 'vehicles.create', 'vehicles.update', 'vehicles.flag'] },
    { group: 'Analytics', perms: ['analytics.view'] },
    { group: 'PCR Tracking', perms: ['pcr.view', 'pcr.manage'] },
    { group: 'Roles', perms: ['roles.view', 'roles.manage'] },
    { group: 'Settings', perms: ['settings.view', 'settings.manage'] },
];

const emptyForm = { name: '', displayName: '', description: '', permissions: [] as string[] };

export const RolesPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [deleteConfirm, setDeleteConfirm] = useState<Role | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ['roles'],
        queryFn: () => rolesService.getAll(),
    });

    const roles: Role[] = data?.data?.roles || [];

    const createMutation = useMutation({
        mutationFn: (d: typeof emptyForm) => rolesService.create(d),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            toast.success('Role created');
            closeDialog();
        },
        onError: () => toast.error('Failed to create role'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, ...d }: typeof emptyForm & { id: string }) => rolesService.update(id, d),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            toast.success('Role updated');
            closeDialog();
        },
        onError: () => toast.error('Failed to update role'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => rolesService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            toast.success('Role deleted');
            setDeleteConfirm(null);
        },
        onError: () => toast.error('Failed to delete role'),
    });

    const openCreate = () => {
        setEditingRole(null);
        setForm(emptyForm);
        setDialogOpen(true);
    };

    const openEdit = (role: Role) => {
        setEditingRole(role);
        setForm({
            name: role.name,
            displayName: role.displayName,
            description: role.description,
            permissions: [...role.permissions],
        });
        setDialogOpen(true);
    };

    const closeDialog = () => {
        setDialogOpen(false);
        setEditingRole(null);
        setForm(emptyForm);
    };

    const togglePermission = (perm: string) => {
        setForm((prev) => ({
            ...prev,
            permissions: prev.permissions.includes(perm)
                ? prev.permissions.filter((p) => p !== perm)
                : [...prev.permissions, perm],
        }));
    };

    const handleSave = () => {
        if (!form.name || !form.displayName) {
            toast.error('Name and Display Name are required');
            return;
        }
        if (editingRole) {
            updateMutation.mutate({ id: editingRole._id, ...form });
        } else {
            createMutation.mutate(form);
        }
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>
                        <RolesIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                        Roles & Permissions
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Manage user roles and their access permissions
                    </Typography>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                    Create Role
                </Button>
            </Box>

            {isLoading && <LinearProgress sx={{ mb: 2 }} />}

            {/* Roles Table */}
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell><strong>Role Name</strong></TableCell>
                            <TableCell><strong>Description</strong></TableCell>
                            <TableCell align="center"><strong>Permissions</strong></TableCell>
                            <TableCell align="center"><strong>Type</strong></TableCell>
                            <TableCell align="center"><strong>Status</strong></TableCell>
                            <TableCell align="right"><strong>Actions</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {roles.length === 0 && !isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                    <Typography color="text.secondary">
                                        No roles defined yet. Click "Create Role" to get started.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            roles.map((role) => (
                                <TableRow key={role._id} hover>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <SecurityIcon color="primary" fontSize="small" />
                                            <Box>
                                                <Typography fontWeight={600}>{role.displayName}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {role.name}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary">
                                            {role.description || '—'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={`${role.permissions.length} permissions`}
                                            size="small"
                                            color="primary"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        {role.isSystem ? (
                                            <Chip icon={<LockIcon />} label="System" size="small" color="default" />
                                        ) : (
                                            <Chip label="Custom" size="small" color="info" variant="outlined" />
                                        )}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            label={role.isActive ? 'Active' : 'Inactive'}
                                            size="small"
                                            color={role.isActive ? 'success' : 'default'}
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Edit">
                                            <IconButton
                                                size="small"
                                                onClick={() => openEdit(role)}
                                                disabled={role.isSystem}
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => setDeleteConfirm(role)}
                                                disabled={role.isSystem}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Create / Edit Dialog */}
            <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="md" fullWidth>
                <DialogTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                label="Role Name (slug)"
                                fullWidth
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                disabled={!!editingRole}
                                placeholder="e.g. control_room"
                            />
                        </Grid>
                        <Grid size={{ xs: 12, sm: 6 }}>
                            <TextField
                                label="Display Name"
                                fullWidth
                                value={form.displayName}
                                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                                placeholder="e.g. Control Room Operator"
                            />
                        </Grid>
                        <Grid size={12}>
                            <TextField
                                label="Description"
                                fullWidth
                                multiline
                                rows={2}
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                            />
                        </Grid>
                        <Grid size={12}>
                            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                                Permissions
                            </Typography>
                            {ALL_PERMISSIONS.map((group) => (
                                <Box key={group.group} sx={{ mb: 2 }}>
                                    <Typography variant="body2" fontWeight={600} color="primary" gutterBottom>
                                        {group.group}
                                    </Typography>
                                    <FormGroup row>
                                        {group.perms.map((perm) => (
                                            <FormControlLabel
                                                key={perm}
                                                control={
                                                    <Checkbox
                                                        checked={form.permissions.includes(perm)}
                                                        onChange={() => togglePermission(perm)}
                                                        size="small"
                                                    />
                                                }
                                                label={
                                                    <Typography variant="body2">
                                                        {perm.split('.')[1]}
                                                    </Typography>
                                                }
                                            />
                                        ))}
                                    </FormGroup>
                                </Box>
                            ))}
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeDialog}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleSave}
                        disabled={createMutation.isPending || updateMutation.isPending}
                    >
                        {editingRole ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirm Dialog */}
            <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
                <DialogTitle>Delete Role</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mt: 1 }}>
                        Are you sure you want to delete the role <strong>{deleteConfirm?.displayName}</strong>?
                        This action cannot be undone.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm._id)}
                        disabled={deleteMutation.isPending}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
