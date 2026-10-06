'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Eye as EyeIcon } from '@phosphor-icons/react/dist/ssr/Eye';
import { EyeSlash as EyeSlashIcon } from '@phosphor-icons/react/dist/ssr/EyeSlash';
import { Controller, useForm } from 'react-hook-form';
import { z as zod } from 'zod';

import { authClient } from '@/lib/auth/client';
import { useUser } from '@/hooks/use-user';

const schema = zod.object({
  email: zod.string().min(1, { message: 'Nombre de usuario o correo es requerido' }),
  password: zod.string().min(1, { message: 'Contraseña requerida' }),
});

type Values = zod.infer<typeof schema>;

const defaultValues = { email: '', password: '' } satisfies Values;

export function SignInForm(): React.JSX.Element {
  const router = useRouter();
  const { checkSession } = useUser();
  const [showPassword, setShowPassword] = React.useState<boolean>(false);
  const [isPending, setIsPending] = React.useState<boolean>(false);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({ defaultValues, resolver: zodResolver(schema) });

  const onSubmit = React.useCallback(
    async (values: Values): Promise<void> => {
      setIsPending(true);

      const { error } = await authClient.signInWithPassword(values);

      if (error) {
        setError('root', {
          type: 'server',
          message: error === 'Invalid credentials' ? 'Usuario o contraseña incorrectos' : error,
        });
        setIsPending(false);
        return;
      }

      await checkSession?.();
      router.refresh();
    },
    [checkSession, router, setError]
  );

  return (
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>
          Iniciar Sesión
        </Typography>
        <Typography color="text.secondary" variant="body2">
          Ingresa tus credenciales para acceder al sistema POS.
        </Typography>
      </Stack>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing={3}>
          <Controller
            control={control}
            name="email"
            render={({ field }) => (
              <TextField
                {...field}
                label="Usuario o correo electrónico"
                type="text"
                autoComplete="username"
                autoFocus
                fullWidth
                error={Boolean(errors.email)}
                helperText={errors.email?.message}
                slotProps={{ input: { sx: { borderRadius: 2 } } }}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field }) => (
              <TextField
                {...field}
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                fullWidth
                error={Boolean(errors.password)}
                helperText={errors.password?.message}
                slotProps={{
                  input: {
                    sx: { borderRadius: 2 },
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          edge="end"
                          aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                          onClick={(): void => {
                            setShowPassword((prev) => !prev);
                          }}
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          {showPassword ? <EyeIcon size={20} /> : <EyeSlashIcon size={20} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            )}
          />

          {errors.root ? (
            <Alert severity="error" role="alert" sx={{ borderRadius: 2 }}>
              {errors.root.message}
            </Alert>
          ) : null}

          <Button
            disabled={isPending}
            type="submit"
            variant="contained"
            size="large"
            sx={{
              py: 1.5,
              borderRadius: 2,
              fontWeight: 700,
              fontSize: '1rem',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': { bgcolor: 'primary.light' },
            }}
          >
            {isPending ? 'Iniciando sesión…' : 'Ingresar'}
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
