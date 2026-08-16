'use client';

import {
  Activity,
  Bell,
  CalendarDays,
  HeartPulse,
  LayoutDashboard,
  Loader2,
  LogOut,
  MessageCircle,
  PlugZap,
  Search,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  getCurrentUser,
  getPrimaryWhatsappConnection,
  logout,
  type AuthenticatedUser,
  type MessagingConnection,
} from '../lib/api';

const navItems = [
  { href: '/', label: 'Visão geral', icon: LayoutDashboard },
  { href: '/conversations', label: 'Atendimento', icon: MessageCircle },
  { href: '/appointments', label: 'Agenda', icon: CalendarDays },
  { href: '/patients', label: 'Pacientes', icon: Users },
  { href: '/settings/users', label: 'Permissões', icon: ShieldCheck },
  { href: '/settings/channels', label: 'Configurações', icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [whatsappConnection, setWhatsappConnection] = useState<MessagingConnection | null>(null);
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (isLoginPage) {
      return;
    }

    getCurrentUser()
      .then((result) => {
        setUser(result.user);
        return getPrimaryWhatsappConnection();
      })
      .then((connectionResult) => {
        setWhatsappConnection(connectionResult.connection);
      })
      .catch(() => {
        router.replace('/login');
      });
  }, [isLoginPage, router]);

  async function handleLogout() {
    await logout().catch(() => undefined);
    router.replace('/login');
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">
            <HeartPulse size={22} />
          </div>
          <div>
            <strong>Clinic Platform</strong>
            <span>Administração</span>
          </div>
        </div>

        <nav className="nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

            return (
              <Link className={`navItem${isActive ? ' active' : ''}`} href={item.href} key={item.href}>
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebarStatus">
          {user ? <Activity size={18} /> : <Loader2 className="spin" size={18} />}
          <div>
            <strong>{user?.name ?? 'Carregando'}</strong>
            <span>{user?.role ?? 'sessão'}</span>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">Painel da clínica</span>
            <h1>{user?.organizationName ?? user?.tenantName ?? 'Configuração operacional'}</h1>
          </div>
          <div className="topbarActions">
            <Link
              className={`headerConnection status${whatsappConnection?.status ?? 'not_configured'}`}
              href="/settings/channels"
            >
              <PlugZap size={15} />
              <span>{whatsappConnection?.status === 'connected' ? 'WhatsApp conectado' : 'WhatsApp offline'}</span>
            </Link>
            <label className="search">
              <Search size={17} />
              <input aria-label="Buscar" placeholder="Buscar" />
            </label>
            <button className="iconButton" aria-label="Notificações" type="button">
              <Bell size={18} />
            </button>
            <button className="iconButton" aria-label="Sair" onClick={handleLogout} type="button">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {children}
      </section>
    </div>
  );
}
