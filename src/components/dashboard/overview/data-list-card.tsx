'use client';

import * as React from 'react';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { Divider } from '@mui/material';

export interface DataListItem {
  id: string;
  label: string;
  value: number | string;
}

export interface DataListProps {
  title: string;
  items: DataListItem[];
  valueSuffix?: string;
}

export function DataListCard({ title, items, valueSuffix = '' }: DataListProps): React.JSX.Element {
  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader title={title} />
      <Divider />
      {items.length === 0 ? (
        <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
          No data available
        </Typography>
      ) : (
        <List disablePadding>
          {items.map((item, index) => (
            <React.Fragment key={item.id}>
              <ListItem>
                <ListItemText
                  primary={<Typography variant="subtitle2">{item.label}</Typography>}
                />
                <Typography variant="body2" color="text.secondary">
                  {item.value} {valueSuffix}
                </Typography>
              </ListItem>
              {index < items.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      )}
    </Card>
  );
}
