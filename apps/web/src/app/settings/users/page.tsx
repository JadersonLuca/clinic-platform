'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, RotateCcw, Save, ShieldCheck, UserPlus, Users } from 'lucide-react';
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
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível criar o usuário.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdate(membershipId: string, input: Parameters<typeof updateTeamMember>[1]) {
    setError(null);
    setBusyMembershipId(membershipId);

    try {
      const result = await updateTeamMember(membershipId, input);
      setMembers((current) =>
        current.map((member) => (member.membershipId === membershipId ? result.member : member)).sort(sortMembers),
      );
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Não foi possível atualizar o usuário.');
    } finally {
      setBusyMembershipId(null);
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
        <a className="textButton" href="/">
          Voltar
        </a>
      </header>

      <section className="teamLayout">
        <form className="panel teamForm" onSubmit={handleCreate}>
          <div className="panelHeader">
            <div>
              <span className="eyebrow">Novo acesso</span>
              <h2>Adicionar usuário</h2>
            </div>
            <UserPlus size={20} />
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

          <button className="primaryButton" disabled={isSaving || !name || !email} type="submit">
            {isSaving ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
            Criar usuário
          </button>
        </form>

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

              return (
                <article className="teamRow" key={member.membershipId}>
                  <div className="teamIdentity">
                    <div className="avatar">{member.name.charAt(0)}</div>
                    <div>
                      <strong>{member.name}</strong>
                      <span>{member.email}</span>
                    </div>
                  </div>

                  <label className="compactField">
                    <span>Nível</span>
                    <select
                      disabled={!canEditRole || isBusy}
                      value={member.role}
                      onChange={(event) =>
                        void handleUpdate(member.membershipId, { role: event.target.value as ManageableRole })
                      }
                    >
                      {member.role === 'owner' ? <option value="owner">{roleLabel.owner}</option> : null}
                      {roleOptions.map((option) => (
                        <option key={option} value={option}>
                          {roleLabel[option]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="compactField">
                    <span>Status</span>
                    <select
                      disabled={isSelf || !canEditRole || isBusy}
                      value={member.status}
                      onChange={(event) =>
                        void handleUpdate(member.membershipId, {
                          status: event.target.value as 'active' | 'inactive',
                        })
                      }
                    >
                      <option value="active">{statusLabel.active}</option>
                      <option value="inactive">{statusLabel.inactive}</option>
                    </select>
                  </label>

                  <button
                    className="iconButton"
                    disabled={!canEditRole || isBusy}
                    onClick={() => void handleUpdate(member.membershipId, { password: '123456' })}
                    title="Resetar senha para 123456"
                    type="button"
                  >
                    {isBusy ? <Loader2 className="spin" size={17} /> : <RotateCcw size={17} />}
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
