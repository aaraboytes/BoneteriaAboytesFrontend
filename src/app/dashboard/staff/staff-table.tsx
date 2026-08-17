'use client';

import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import { DotsThreeVertical as DotsThreeVerticalIcon } from '@phosphor-icons/react/dist/ssr/DotsThreeVertical';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import type { StaffRecord } from './staff-client';
import { Chip } from '@mui/material';

interface StaffTableProps {
  count?: number;
  page?: number;
  rows?: StaffRecord[];
  rowsPerPage?: number;
  onPageChange?: (page: number) => void;
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  onEdit?: (staffMember: StaffRecord) => void;
}

const getRoleColor = (roleStr?: string): 'error' | 'warning' | 'secondary' | 'info' | 'success' | 'primary' => {
  const r = (roleStr || '').toLowerCase();
  if (r === 'administrador' || r === 'admin') return 'error';
  if (r === 'desarrollador' || r === 'developer') return 'warning';
  if (r === 'jefe') return 'secondary';
  if (r === 'gerente') return 'info';
  if (r === 'bodega') return 'success';
  return 'primary';
};

export function StaffTable({
  count = 0,
  rows = [],
  page = 0,
  rowsPerPage = 10,
  onPageChange,
  onRowsPerPageChange,
  onEdit,
}: StaffTableProps): React.JSX.Element {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Card>
      <Box sx={{ overflowX: 'auto' }}>
        {isMobile ? (
          <Box sx={{ p: 2 }}>
            <Stack spacing={2} divider={<Divider />}>
              {rows.map((row) => (
                <Box
                  key={row.id}
                  onClick={() => onEdit?.(row)}
                  sx={{
                    p: 1,
                    cursor: 'pointer',
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                    <Stack spacing={1} sx={{ flexGrow: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          label={row.role}
                          size="small"
                          color={getRoleColor(row.role)}
                          sx={{ fontWeight: 600 }}
                        />
                        <Typography variant="subtitle2" fontWeight={700}>
                          #{row.id} {row.fullName}
                        </Typography>
                      </Stack>

                      <Typography variant="body2" color="primary" fontWeight={600}>
                        {row.specialty || 'No Specialty'}
                      </Typography>

                      <Stack spacing={0.25}>
                        <Typography variant="caption" color="text.secondary">
                          Email: {row.email}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Tel: {row.telephone}
                        </Typography>
                      </Stack>
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Stack>
            {rows.length === 0 && (
              <Typography align="center" sx={{ py: 3, color: 'text.secondary' }}>
                No staff members found
              </Typography>
            )}
          </Box>
        ) : (
          <Table sx={{ minWidth: rows.length > 0 ? '800px' : 'auto' }}>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Full Name</TableCell>
                <TableCell>Username</TableCell>
                <TableCell>Specialty</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Telephone</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  hover
                  key={row.id}
                  onClick={() => onEdit?.(row)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{row.id}</TableCell>
                  <TableCell>
                    <Chip
                      label={row.role}
                      size="small"
                      color={getRoleColor(row.role)}
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>{row.fullName}</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>
                    @{row.username || row.fullName.toLowerCase().replace(/\s+/g, '')}
                  </TableCell>
                  <TableCell>{row.specialty || 'N/A'}</TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>{row.telephone}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Box>
      <Divider />
      <TablePagination
        component="div"
        count={count}
        onPageChange={(e, newPage) => onPageChange?.(newPage)}
        onRowsPerPageChange={(e) => onRowsPerPageChange?.(parseInt(e.target.value, 10))}
        page={page}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[5, 10, 25]}
      />
    </Card>
  );
}
