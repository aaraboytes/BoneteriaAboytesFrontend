'use client';

import * as React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import apiClient from '@/lib/api-client';

export interface RoleItem {
  id: number;
  name: string;
  description?: string | null;
  permissions: string[];
  employeeIds: number[];
}

interface PermissionOption {
  id: number;
  code: string;
}

interface EmployeeOption {
  id: number;
  fullName: string;
}

export interface RoleDialogProps {
  open: boolean;
  initialData: RoleItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export function RoleDialog({ open, initialData, onClose, onSaved }: RoleDialogProps): React.JSX.Element {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [permissionOptions, setPermissionOptions] = React.useState<PermissionOption[]>([]);
  const [employeeOptions, setEmployeeOptions] = React.useState<EmployeeOption[]>([]);
  const [selectedPermissions, setSelectedPermissions] = React.useState<string[]>([]);
  const [selectedEmployees, setSelectedEmployees] = React.useState<EmployeeOption[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [permsRes, usersRes] = await Promise.all([apiClient.get('/Permissions'), apiClient.get('/Users')]);
        setPermissionOptions(Array.isArray(permsRes.data) ? permsRes.data : []);
        const users = Array.isArray(usersRes.data) ? usersRes.data : [];
        setEmployeeOptions(users.map((u: any) => ({ id: Number(u.id), fullName: u.fullName || u.name })));
      } catch (err) {
        console.error('Failed to load permissions/employees', err);
      }
    })();
  }, [open]);

  React.useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setDescription(initialData.description || '');
      setSelectedPermissions(initialData.permissions || []);
    } else {
      setName('');
      setDescription('');
      setSelectedPermissions([]);
    }
    setError(null);
  }, [initialData, open]);

  React.useEffect(() => {
    if (initialData && employeeOptions.length > 0) {
      setSelectedEmployees(employeeOptions.filter((e) => initialData.employeeIds?.includes(e.id)));
    } else if (!initialData) {
      setSelectedEmployees([]);
    }
  }, [initialData, employeeOptions]);

  const handleSubmit = async (): Promise<void> => {
    if (!name.trim()) {
      setError('El nombre del rol es obligatorio.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      let roleId: number;
      if (initialData) {
        roleId = initialData.id;
        await apiClient.put(`/StaffGroups/${roleId}`, { name: name.trim(), description: description.trim() || undefined });
      } else {
        const res = await apiClient.post('/StaffGroups', { name: name.trim(), description: description.trim() || undefined });
        roleId = res.data.id;
      }

      // Resolve permission codes to ids, creating any new (freeSolo) codes first.
      const permissionIds: number[] = [];
      for (const code of selectedPermissions) {
        const existing = permissionOptions.find((p) => p.code === code);
        if (existing) {
          permissionIds.push(existing.id);
        } else {
          const created = await apiClient.post('/Permissions', { code });
          permissionIds.push(created.data.id);
        }
      }

      const previousPermissionIds = initialData
        ? initialData.permissions
            .map((code) => permissionOptions.find((p) => p.code === code)?.id)
            .filter((id): id is number => id !== undefined)
        : [];

      const permissionsToAdd = permissionIds.filter((id) => !previousPermissionIds.includes(id));
      const permissionsToRemove = previousPermissionIds.filter((id) => !permissionIds.includes(id));
      await Promise.all([
        ...permissionsToAdd.map((id) => apiClient.post(`/StaffGroups/${roleId}/permissions/${id}`)),
        ...permissionsToRemove.map((id) => apiClient.delete(`/StaffGroups/${roleId}/permissions/${id}`)),
      ]);

      // Diff employee assignment.
      const newEmployeeIds = selectedEmployees.map((e) => e.id);
      const previousEmployeeIds = initialData?.employeeIds || [];
      const employeesToAdd = newEmployeeIds.filter((id) => !previousEmployeeIds.includes(id));
      const employeesToRemove = previousEmployeeIds.filter((id) => !newEmployeeIds.includes(id));
      await Promise.all([
        ...employeesToAdd.map((id) => apiClient.post(`/StaffGroups/${roleId}/employees/${id}`)),
        ...employeesToRemove.map((id) => apiClient.delete(`/StaffGroups/${roleId}/employees/${id}`)),
      ]);

      onSaved();
      onClose();
    } catch (err: any) {
      console.error('Failed to save role', err);
      setError(err?.response?.data?.message || 'Error al guardar el rol.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initialData ? 'Editar Rol' : 'Nuevo Rol'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Esto administra los datos de roles y permisos. El backend aún no aplica estos permisos automáticamente
            en cada solicitud (requiere un sistema de autenticación real primero) - por ahora es una herramienta de
            gestión de datos.
          </Typography>

          {error ? <Alert severity="error">{error}</Alert> : null}

          <TextField label="Nombre del rol" value={name} onChange={(e) => setName(e.target.value)} fullWidth required />
          <TextField
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />

          <Autocomplete
            multiple
            freeSolo
            options={permissionOptions.map((p) => p.code)}
            value={selectedPermissions}
            onChange={(_, value) => setSelectedPermissions(value)}
            renderInput={(params) => (
              <TextField {...params} label="Permisos" placeholder="Escriba para agregar un permiso nuevo" />
            )}
          />

          <Autocomplete
            multiple
            options={employeeOptions}
            getOptionLabel={(option) => option.fullName}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            value={selectedEmployees}
            onChange={(_, value) => setSelectedEmployees(value)}
            renderInput={(params) => <TextField {...params} label="Empleados asignados" />}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Guardando...' : 'Guardar Rol'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
