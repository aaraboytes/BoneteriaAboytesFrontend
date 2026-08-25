'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { PencilSimple as PencilIcon } from '@phosphor-icons/react/dist/ssr/PencilSimple';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import apiClient from '@/lib/api-client';

import { RoleDialog, type RoleItem } from './role-dialog';

export function RolesTable(): React.JSX.Element {
  const [roles, setRoles] = React.useState<RoleItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<RoleItem | null>(null);

  const fetchRoles = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get('/StaffGroups');
      if (Array.isArray(res.data)) setRoles(res.data);
    } catch (err) {
      console.error('Failed to fetch roles', err);
      setError('Error al cargar los roles.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const handleDelete = async (role: RoleItem): Promise<void> => {
    if (!window.confirm(`¿Eliminar el rol "${role.name}"?`)) return;
    try {
      await apiClient.delete(`/StaffGroups/${role.id}`);
      fetchRoles();
    } catch (err) {
      console.error('Failed to delete role', err);
    }
  };

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h4">Roles y Permisos</Typography>
        <Button
          variant="contained"
          startIcon={<PlusIcon />}
          onClick={() => {
            setSelectedRole(null);
            setDialogOpen(true);
          }}
        >
          Nuevo Rol
        </Button>
      </Stack>

      {error ? (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Nombre</TableCell>
            <TableCell>Descripción</TableCell>
            <TableCell>Permisos</TableCell>
            <TableCell align="right">Empleados</TableCell>
            <TableCell align="right">Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} align="center">
                Cargando...
              </TableCell>
            </TableRow>
          ) : roles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center">
                No hay roles creados.
              </TableCell>
            </TableRow>
          ) : (
            roles.map((role) => (
              <TableRow key={role.id} hover>
                <TableCell>{role.name}</TableCell>
                <TableCell>{role.description || '-'}</TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {(role.permissions || []).map((code) => (
                      <Chip key={code} label={code} size="small" />
                    ))}
                  </Stack>
                </TableCell>
                <TableCell align="right">{role.employeeIds?.length || 0}</TableCell>
                <TableCell align="right">
                  <Tooltip title="Editar">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setSelectedRole(role);
                        setDialogOpen(true);
                      }}
                    >
                      <PencilIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton size="small" onClick={() => handleDelete(role)}>
                      <TrashIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <RoleDialog
        open={dialogOpen}
        initialData={selectedRole}
        onClose={() => setDialogOpen(false)}
        onSaved={fetchRoles}
      />
    </Stack>
  );
}
