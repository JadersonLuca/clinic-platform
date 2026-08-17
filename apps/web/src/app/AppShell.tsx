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
  PanelLeftClose,
  PanelLeftOpen,
  PlugZap,
  RefreshCw,
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
import { ConfirmationModal } from './ConfirmationModal';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [whatsappConnection, setWhatsappConnection] = useState<MessagingConnection | null>(null);
  const isLoginPage = pathname === '/login';
  const isConversationsPage = pathname.startsWith('/conversations');

  useEffect(() => {
    if (isMobileViewport()) {
      setIsSidebarOpen(false);
      return;
    }

    setIsSidebarOpen(localStorage.getItem('clinic-sidebar-open') !== 'false');
  }, []);

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

  function toggleSidebar() {
    setIsSidebarOpen((current) => {
      const nextValue = !current;
      localStorage.setItem('clinic-sidebar-open', String(nextValue));
      return nextValue;
    });
  }

  function closeSidebarOnMobile() {
    if (isMobileViewport()) {
      setIsSidebarOpen(false);
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logout().catch(() => undefined);
      router.replace('/login');
    } finally {
      setIsLoggingOut(false);
      setIsLogoutModalOpen(false);
    }
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className={`shell${isSidebarOpen ? '' : ' sidebarCollapsed'}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">
            <HeartPulse size={22} />
          </div>
          <button
            aria-label={isSidebarOpen ? 'Fechar sidebar' : 'Abrir sidebar'}
            className="sidebarToggle"
            onClick={toggleSidebar}
            title={isSidebarOpen ? 'Fechar sidebar' : 'Abrir sidebar'}
            type="button"
          >
            {isSidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
        </div>

        <nav className="nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

            return (
              <Link
                className={`navItem${isActive ? ' active' : ''}`}
                href={item.href}
                key={item.href}
                onClick={closeSidebarOnMobile}
                title={item.label}
              >
                <Icon size={18} />
                <span>{item.label}</span>
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

        <button
          className="sidebarLogout"
          onClick={() => setIsLogoutModalOpen(true)}
          title="Sair"
          type="button"
        >
          <LogOut size={18} />
          <span>Sair</span>
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          {isConversationsPage ? (
            <div className="topbarPageTitle">
              <span>Atendimento</span>
              <strong>{user?.organizationName ?? user?.tenantName ?? 'Conversas'}</strong>
            </div>
          ) : null}
          <div className="topbarActions">
            {isConversationsPage ? (
              <button
                className="textButton compactButton"
                onClick={() => window.dispatchEvent(new CustomEvent('clinic:refresh-conversations'))}
                type="button"
              >
                <RefreshCw size={15} />
                Atualizar
              </button>
            ) : null}
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
          </div>
        </header>

        {children}
      </section>

      <ConfirmationModal
        confirmLabel="Sair"
        description="Você será desconectado desta sessão e voltará para a tela de login."
        isConfirming={isLoggingOut}
        isOpen={isLogoutModalOpen}
        onCancel={() => setIsLogoutModalOpen(false)}
        onConfirm={handleLogout}
        title="Sair do sistema?"
      />
    </div>
  );
}

function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches;
}
