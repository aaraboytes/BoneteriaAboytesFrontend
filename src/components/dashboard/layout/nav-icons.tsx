import type { Icon } from '@phosphor-icons/react/dist/lib/types';
import { ChartPieIcon } from '@phosphor-icons/react/dist/ssr/ChartPie';
import { GearSixIcon } from '@phosphor-icons/react/dist/ssr/GearSix';
import { PlugsConnectedIcon } from '@phosphor-icons/react/dist/ssr/PlugsConnected';
import { UserIcon } from '@phosphor-icons/react/dist/ssr/User';
import { UsersIcon } from '@phosphor-icons/react/dist/ssr/Users';
import { XSquare } from '@phosphor-icons/react/dist/ssr/XSquare';
import { CalendarIcon } from '@phosphor-icons/react/dist/ssr/Calendar';
import { FileText as FileTextIcon } from '@phosphor-icons/react/dist/ssr/FileText';
import { CurrencyDollar as CurrencyDollarIcon } from '@phosphor-icons/react/dist/ssr/CurrencyDollar';
import { MicroscopeIcon as Microscope } from '@phosphor-icons/react/dist/ssr/Microscope';
import { HeadsetIcon as Headset } from '@phosphor-icons/react/dist/ssr/Headset';
import { Package as PackageIcon } from '@phosphor-icons/react/dist/ssr/Package';
import { ClipboardText as ClipboardTextIcon } from '@phosphor-icons/react/dist/ssr/ClipboardText';
import { Wrench as WrenchIcon } from '@phosphor-icons/react/dist/ssr/Wrench';
import { Buildings as BuildingsIcon } from '@phosphor-icons/react/dist/ssr/Buildings';
import { Stack as StackIcon } from '@phosphor-icons/react/dist/ssr/Stack';
import { Receipt as ReceiptIcon } from '@phosphor-icons/react/dist/ssr/Receipt';

export const navIcons = {
  'chart-pie': ChartPieIcon,
  'gear-six': GearSixIcon,
  'plugs-connected': PlugsConnectedIcon,
  'x-square': XSquare,
  'user': UserIcon,
  'users': UsersIcon,
  'calendar': CalendarIcon,
  'file-text': FileTextIcon,
  'currency-dollar': CurrencyDollarIcon,
  'microscope': Microscope,
  'headset': Headset,
  'package': PackageIcon,
  'clipboard-text': ClipboardTextIcon,
  'wrench': WrenchIcon,
  'buildings': BuildingsIcon,
  'stack': StackIcon,
  'receipt': ReceiptIcon,
} as Record<string, Icon>;
