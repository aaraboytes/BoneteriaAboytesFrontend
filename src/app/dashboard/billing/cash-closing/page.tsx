import { redirect } from 'next/navigation';

import { paths } from '@/paths';

// The old clinic cash-closing report was replaced by the drawer closings history.
export default function Page(): never {
  redirect(paths.dashboard.cashSessions);
}
