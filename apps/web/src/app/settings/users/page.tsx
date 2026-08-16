'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Pencil, RotateCcw, Save, ShieldCheck, UserPlus, Users, X } from 'lucide-react';
import {
  ApiError,
  createTeamMember,
  getCurrentUser,
  listTeamMembers,
  updateTeamMember,
  type AuthenticatedUser,
  type MembershipRole,
  type TeamMember,
} from '../../../lib/api';

type ManageableRole = Exclude<MembershipRole, 'owner'>;

const roleLabel: Record<MembershipRole, string> = {
  owner: 'Owner',
  superadmin: 'Superadmin',
  admin: 'Admin',
  staff: 'Atendente',
};

const statusLabel: Record<TeamMember['status'], string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  invited: 'Convidado',
};

export default function UsersSettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ManageableRole>('staff');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editingName, setEditingName] = useState('');
  const [editingRole, setEditingRole] = useState<ManageableRole>('staff');
  const [editingStatus, setEditingStatus] = useState<'active' | 'inactive'>('active');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [busyMembershipId, setBusyMembershipId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getCurrentUser(), listTeamMembers()])
      .then(([session, team]) => {
        setCurrentUser(session.user);
        setMembers(team.members);
      })
      .catch(() => {
        router.replace('/login');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [router]);

  const roleOptions = useMemo<ManageableRole[]>(() => {
    if (currentUser?.role === 'admin') {
      return ['staff'];
    }

    return ['superadmin', 'admin', 'staff'];
  }, [currentUser?.role]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const result = await createTeamMember({
        name,
        email,
        role,
        password: '123456',
      });

      setMembers((current) => [...current, result.member].sort(sortMembers));
      setName('');
      setEmail('');
      setRole(roleOptions[roleOptions.length - 1] ?? 'staff');
      setIsCreateModalOpen(false);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível criar o usuário.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdate(membershipId: string, input: Parameters<typeof updateTeamMember>[1]): Promise<boolean> {
    setError(null);
    setBusyMembershipId(membershipId);

    try {
      const result = await updateTeamMember(membershipId, input);
      setMembers((current) =>
        current.map((member) => (member.membershipId === membershipId ? result.member : member)).sort(sortMembers),
      );
      return true;
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível atualizar o usuário.');
      return false;
    } finally {
      setBusyMembershipId(null);
    }
  }

  function openEditModal(member: TeamMember) {
    setError(null);
    setEditingMember(member);
    setEditingName(member.name);
    setEditingRole(member.role === 'owner' ? 'staff' : member.role);
    setEditingStatus(member.status === 'invited' ? 'active' : member.status);
  }

  function openCreateModal() {
    setError(null);
    setName('');
    setEmail('');
    setRole(roleOptions[roleOptions.length - 1] ?? 'staff');
    setIsCreateModalOpen(true);
  }

  function closeCreateModal() {
    if (isSaving) {
      return;
    }

    setError(null);
    setIsCreateModalOpen(false);
  }

  function closeEditModal() {
    if (busyMembershipId) {
      return;
    }

    setError(null);
    setEditingMember(null);
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingMember) {
      return;
    }

    const didUpdate = await handleUpdate(editingMember.membershipId, {
      name: editingName,
      role: editingRole,
      status: editingStatus,
    });

    if (didUpdate) {
      setEditingMember(null);
    }
  }

  if (isLoading) {
    return (
      <main className="loadingShell">
        <Loader2 className="spin" size={24} />
      </main>
    );
  }

  return (
    <main className="settingsShell">
      <header className="settingsHeader">
        <div>
          <span className="eyebrow">Permissões</span>
          <h1>Usuários da empresa</h1>
        </div>
        <div className="settingsActions">
          <button className="primaryButton compactButton" onClick={openCreateModal} type="button">
            <UserPlus size={18} />
            Novo usuário
          </button>
          <a className="textButton" href="/">
            Voltar
          </a>
        </div>
      </header>

      <section className="teamLayout singleColumn">
        <section className="panel teamPanel">
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Equipe</span>
              <h2>{currentUser?.organizationName ?? currentUser?.tenantName}</h2>
            </div>
            <Users size={20} />
          </div>

          <div className="teamList">
            {members.map((member) => {
              const isSelf = member.userId === currentUser?.userId;
              const isBusy = busyMembershipId === member.membershipId;
              const canEditRole = !isSelf && canEditMember(currentUser?.role, member.role);
              const canEdit = canEditRole;

              return (
                <article className="teamRow" key={member.membershipId}>
                  <div className="teamIdentity">
                    <div className="avatar">{member.name.charAt(0)}</div>
                    <div>
                      <strong>{member.name}</strong>
                      <span>{member.email}</span>
                    </div>
                  </div>

                  <span className={`statusBadge status${member.status}`}>{statusLabel[member.status]}</span>

                  <button
                    className="iconButton"
                    disabled={!canEdit || isBusy}
                    onClick={() => openEditModal(member)}
                    title="Editar usuário"
                    type="button"
                  >
                    {isBusy ? <Loader2 className="spin" size={17} /> : <Pencil size={17} />}
                  </button>

                  <span className={`roleBadge role${member.role}`}>
                    <ShieldCheck size={14} />
                    {roleLabel[member.role]}
                  </span>
                </article>
              );
            })}
          </div>
        </section>
      </section>

      {isCreateModalOpen ?
        <div className="modalOverlay" role="presentation">
          <form aria-modal="true" className="formModal" onSubmit={handleCreate} role="dialog">
            <div className="modalHeader">
              <div>
                <span className="eyebrow">Novo acesso</span>
                <h2>Adicionar usuário</h2>
              </div>
              <button aria-label="Fechar" className="iconButton" onClick={closeCreateModal} type="button">
                <X size={18} />
              </button>
            </div>

            <label className="field">
              <span>Nome</span>
              <input value={name} onChange={(event) => setName(event.target.value)} required />
            </label>

            <label className="field">
              <span>Email</span>
              <input
                autoComplete="email"
                inputMode="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="field">
              <span>Nível</span>
              <select value={role} onChange={(event) => setRole(event.target.value as ManageableRole)}>
                {roleOptions.map((option) => (
                  <option key={option} value={option}>
                    {roleLabel[option]}
                  </option>
                ))}
              </select>
            </label>

            <p className="fieldHint">Senha inicial: 123456</p>

            {error ? <div className="formError">{error}</div> : null}

            <div className="modalActions">
              <button className="textButton" onClick={closeCreateModal} type="button">
                Cancelar
              </button>
              <button className="primaryButton compactButton" disabled={isSaving || !name || !email} type="submit">
                {isSaving ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
                Criar usuário
              </button>
            </div>
          </form>
        </div>
      : null}

      {editingMember ?
        <div className="modalOverlay" role="presentation">
          <form aria-modal="true" className="formModal" onSubmit={handleEditSubmit} role="dialog">
            <div className="modalHeader">
              <div>
                <span className="eyebrow">Editar acesso</span>
                <h2>{editingMember.email}</h2>
              </div>
              <button aria-label="Fechar" className="iconButton" onClick={closeEditModal} type="button">
                <X size={18} />
              </button>
            </div>

            <label className="field">
              <span>Nome</span>
              <input value={editingName} onChange={(event) => setEditingName(event.target.value)} required />
            </label>

            <label className="field">
              <span>Nível</span>
              <select value={editingRole} onChange={(event) => setEditingRole(event.target.value as ManageableRole)}>
                {roleOptions.map((option) => (
                  <option key={option} value={option}>
                    {roleLabel[option]}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Status</span>
              <select
                value={editingStatus}
                onChange={(event) => setEditingStatus(event.target.value as 'active' | 'inactive')}
              >
                <option value="active">{statusLabel.active}</option>
                <option value="inactive">{statusLabel.inactive}</option>
              </select>
            </label>

            <button
              className="textButton resetButton"
              disabled={busyMembershipId === editingMember.membershipId}
              onClick={() => void handleUpdate(editingMember.membershipId, { password: '123456' })}
              type="button"
            >
              {busyMembershipId === editingMember.membershipId ?
                <Loader2 className="spin" size={17} />
              : <RotateCcw size={17} />}
              Resetar senha para 123456
            </button>

            {error ? <div className="formError">{error}</div> : null}

            <div className="modalActions">
              <button className="textButton" onClick={closeEditModal} type="button">
                Cancelar
              </button>
              <button
                className="primaryButton compactButton"
                disabled={busyMembershipId === editingMember.membershipId || !editingName}
                type="submit"
              >
                {busyMembershipId === editingMember.membershipId ?
                  <Loader2 className="spin" size={18} />
                : <Save size={18} />}
                Salvar
              </button>
            </div>
          </form>
        </div>
      : null}
    </main>
  );
}

function sortMembers(left: TeamMember, right: TeamMember): number {
  return left.name.localeCompare(right.name) || left.email.localeCompare(right.email);
}

function canEditMember(actorRole: MembershipRole | undefined, targetRole: MembershipRole): boolean {
  if (actorRole === 'owner' || actorRole === 'superadmin') {
    return targetRole !== 'owner';
  }

  if (actorRole === 'admin') {
    return targetRole === 'staff';
  }

  return false;
}
