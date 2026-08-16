'use client';

import {
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  Loader2,
  MessageCircle,
  Stethoscope,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getCurrentUser, type AuthenticatedUser } from '../lib/api';

const setupItems = [
  { label: 'Dados da clínica', status: 'Base', progress: 72 },
  { label: 'Equipe e permissões', status: 'Próximo', progress: 38 },
  { label: 'Horários de atendimento', status: 'Pendente', progress: 18 },
  { label: 'Canais de conversa', status: 'Pendente', progress: 24 },
];

const modules = [
  { icon: MessageCircle, label: 'Atendimento', value: 'WhatsApp', detail: 'Fila AI/Humano' },
  { icon: CalendarDays, label: 'Agenda', value: '0 consultas', detail: 'Disponibilidade' },
  { icon: Users, label: 'Pacientes', value: 'Cadastro', detail: 'Contatos e histórico' },
  { icon: CreditCard, label: 'Pagamentos', value: 'Links', detail: 'Cobranças futuras' },
  { icon: FileText, label: 'Documentos', value: 'Arquivos', detail: 'Metadados e OCR' },
  { icon: Bot, label: 'IA', value: 'Ferramentas', detail: 'Regras controladas' },
];

const conversations = [
  { name: 'Maria Oliveira', topic: 'Confirmação de consulta', mode: 'AI', time: '09:42' },
  { name: 'João Pereira', topic: 'Reagendamento', mode: 'HUMAN', time: '09:31' },
  { name: 'Ana Costa', topic: 'Envio de exame', mode: 'PAUSED', time: '08:58' },
];

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then((result) => {
        setUser(result.user);
      })
      .catch(() => {
        router.replace('/login');
      })
      .finally(() => {
        setIsCheckingSession(false);
      });
  }, [router]);

  if (isCheckingSession) {
    return (
      <main className="loadingShell">
        <Loader2 className="spin" size={24} />
      </main>
    );
  }

  return (
    <>
        <section className="summaryGrid" aria-label="Resumo">
          <div className="summaryPanel accent">
            <span>Atendimento</span>
            <strong>AI</strong>
            <p>Modo padrão para novas conversas.</p>
          </div>
          <div className="summaryPanel">
            <span>Agenda</span>
            <strong>Setup</strong>
            <p>Disponibilidade será o próximo bloco central.</p>
          </div>
          <div className="summaryPanel">
            <span>Segurança</span>
            <strong>RBAC</strong>
            <p>Permissões por função, sem atalhos globais.</p>
          </div>
        </section>

        <section className="contentGrid">
          <div className="panel setupPanel">
            <div className="panelHeader">
              <div>
                <span className="eyebrow">Implantação</span>
                <h2>Checklist da clínica</h2>
              </div>
              <button className="textButton">
                Ajustar
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="setupList">
              {setupItems.map((item) => (
                <div className="setupRow" key={item.label}>
                  <div className="setupText">
                    <CheckCircle2 size={18} />
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.status}</span>
                    </div>
                  </div>
                  <div className="progressTrack" aria-label={`${item.label}: ${item.progress}%`}>
                    <span style={{ width: `${item.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panelHeader">
              <div>
                <span className="eyebrow">Módulos</span>
                <h2>Base do sistema</h2>
              </div>
            </div>
            <div className="moduleGrid">
              {modules.map((module) => {
                const Icon = module.icon;

                return (
                  <article className="moduleCard" key={module.label}>
                    <Icon size={20} />
                    <strong>{module.label}</strong>
                    <span>{module.value}</span>
                    <p>{module.detail}</p>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="panel conversationsPanel">
            <div className="panelHeader">
              <div>
                <span className="eyebrow">Fila</span>
                <h2>Atendimentos recentes</h2>
              </div>
              <ClipboardList size={20} />
            </div>
            <div className="conversationList">
              {conversations.map((conversation) => (
                <div className="conversationRow" key={conversation.name}>
                  <div className="avatar">{conversation.name.charAt(0)}</div>
                  <div className="conversationText">
                    <strong>{conversation.name}</strong>
                    <span>{conversation.topic}</span>
                  </div>
                  <span className={`mode mode${conversation.mode}`}>{conversation.mode}</span>
                  <time>{conversation.time}</time>
                </div>
              ))}
            </div>
          </div>

          <div className="panel clinicPanel">
            <div className="clinicVisual">
              <Stethoscope size={36} />
            </div>
            <div>
              <span className="eyebrow">Perfil</span>
              <h2>{user?.tenantName ?? 'Clínica principal'}</h2>
              <p>Configurações de atendimento, canais, equipe, agenda e automações ficam isoladas por empresa.</p>
            </div>
          </div>
        </section>
    </>
  );
}
