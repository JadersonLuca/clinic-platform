# Clinic Platform — Project Brain

> Este arquivo é a memória arquitetural e de produto do Clinic Platform.
>
> Antes de realizar alterações relevantes no projeto, leia este documento.
>
> Ele descreve **o que estamos construindo, por que estamos construindo dessa forma e quais princípios devem ser preservados**.
>
> Este documento não é imutável. Quando novas decisões forem tomadas pelo proprietário do projeto, ele poderá e deverá ser atualizado para refletir a arquitetura e a visão mais recentes.
>
> **Nunca altere decisões fundamentais deste BRAIN por preferência técnica própria.**
>
> Quando uma solicitação nova do usuário alterar explicitamente uma decisão documentada aqui, atualize este arquivo junto com a implementação, se isso for útil para manter o projeto coerente.

---

# 1. Visão do produto

O `Clinic Platform` será um SaaS profissional para clínicas, médicos e outros prestadores de serviços de saúde.

O objetivo central é:

> **automatizar o máximo possível da operação de atendimento de uma clínica, reduzindo a necessidade de intervenção humana sem retirar controle, segurança ou visibilidade da equipe.**

O produto começa fortemente focado em:

* atendimento pelo WhatsApp;
* inteligência artificial;
* agenda;
* pacientes;
* conversas;
* automações;
* pagamentos.

Mas deve evoluir para uma plataforma operacional completa da clínica.

A visão de longo prazo inclui:

* atendimento multicanal;
* CRM;
* agenda médica;
* pacientes;
* prontuário;
* documentos;
* OCR;
* pagamentos;
* financeiro;
* automações;
* IA;
* relatórios;
* integrações;
* gestão de equipe;
* permissões;
* auditoria;
* comunicação ativa;
* múltiplas unidades;
* múltiplos médicos;
* múltiplos canais.

O WhatsApp é o primeiro canal importante.

**O produto não deve ser arquitetado como apenas um sistema de WhatsApp.**

---

# 2. Princípio central

O sistema deve ser:

* simples de desenvolver hoje;
* organizado desde o início;
* modular;
* previsível;
* rápido;
* seguro;
* fácil de manter;
* fácil de testar;
* preparado para escala horizontal;
* preparado para separação futura em múltiplos containers e VPSs.

A regra arquitetural principal é:

> **Modular Monolith + Workers agora, serviços independentes somente quando houver necessidade real.**

Não criar microserviços prematuramente.

Ao mesmo tempo, evitar criar um monólito altamente acoplado.

Sempre pensar:

> Se este módulo precisar rodar em outro container ou outra VPS no futuro, será possível extraí-lo sem reconstruir o sistema inteiro?

---

# 3. Desenvolvimento incremental

Este projeto será construído **por etapas**.

Não tente implementar toda a visão descrita neste arquivo de uma vez.

Quando uma nova tarefa for solicitada:

1. leia este `BRAIN.md`;
2. leia a estrutura atual do projeto;
3. identifique o que já existe;
4. implemente somente o que foi solicitado;
5. preserve a arquitetura existente;
6. evite alterações desnecessárias;
7. execute build/testes relevantes;
8. corrija erros encontrados;
9. informe resumidamente o que foi alterado.

Nunca avance automaticamente para grandes módulos não solicitados.

Por exemplo:

Se a tarefa for:

> Criar módulo de pacientes.

Não implemente automaticamente:

* pagamentos;
* prontuário;
* IA;
* agenda completa;
* WhatsApp.

Implemente pacientes de forma correta e preparada para integração com esses módulos posteriormente.

---

# 4. Stack principal

A stack definida inicialmente é:

## Backend

* Node.js 24
* TypeScript
* NestJS
* Fastify

## Processamento assíncrono

* Node.js
* TypeScript
* NestJS
* Redis
* BullMQ

## Banco principal

* PostgreSQL

## Cache / filas / locks

* Redis

## Frontend

Será criado muito em breve em:

```text
apps/web
```

Utilizará:

* Next.js
* React
* TypeScript
* `.tsx`

O serviço correspondente será chamado:

```text
clinic_web
```

## Infraestrutura atual

* Docker
* EasyPanel
* VPS Hostinger

A infraestrutura deverá continuar portável.

Não criar dependências desnecessárias do EasyPanel dentro do código da aplicação.

---

# 5. Estrutura dos serviços

A infraestrutura inicial possui:

```text
clinic
clinic_worker
clinic_db
clinic_redis
```

Em breve:

```text
clinic_web
```

Responsabilidades:

```text
clinic
→ API principal

clinic_worker
→ processamento assíncrono

clinic_web
→ interface web

clinic_db
→ PostgreSQL

clinic_redis
→ Redis / BullMQ / cache / locks
```

---

# 6. Monorepo

Utilizamos um único repositório:

```text
clinic-platform
```

Estrutura geral pretendida:

```text
clinic-platform/
│
├── BRAIN.md
│
├── apps/
│   ├── api/
│   ├── worker/
│   └── web/
│
├── packages/
│   ├── database/
│   ├── contracts/
│   ├── shared/
│   ├── config/
│   └── observability/
│
├── Dockerfile.api
├── Dockerfile.worker
├── Dockerfile.web
│
├── package.json
├── pnpm-workspace.yaml
└── .env.example
```

Nem todos os diretórios precisam existir imediatamente.

Crie-os quando fizer sentido.

---

# 7. `clinic` — API principal

O `clinic` é a API principal.

Responsabilidades típicas:

* autenticação;
* autorização;
* CRUD;
* regras de negócio;
* pacientes;
* médicos;
* clínicas;
* agenda;
* conversas;
* APIs para o frontend;
* recebimento de webhooks;
* validação;
* consulta ao PostgreSQL;
* criação de jobs.

A API deve responder rapidamente.

Evitar processamento demorado dentro de uma requisição HTTP.

Exemplo correto:

```text
Webhook WhatsApp
↓
clinic
↓
validar
↓
persistir mensagem
↓
criar job
↓
HTTP 200
```

O restante pode continuar no worker.

---

# 8. `clinic_worker`

O worker executa trabalhos em segundo plano.

Exemplos:

* IA;
* envio de WhatsApp;
* automações;
* lembretes;
* notificações;
* retries;
* processamento de documentos;
* OCR;
* tarefas programadas;
* integrações externas lentas;
* geração de arquivos;
* processamento de webhooks;
* reconciliações.

Comunicação inicialmente:

```text
clinic
↓
Redis / BullMQ
↓
clinic_worker
```

Jobs importantes devem ser:

* idempotentes;
* rastreáveis;
* reexecutáveis;
* seguros para retry.

---

# 9. `clinic_web`

O `clinic_web` será a interface visual utilizada pelos colaboradores da clínica.

Será criado em:

```text
apps/web
```

Tecnologias:

```text
Next.js
React
TypeScript
TSX
```

O frontend não deve conter regras críticas de negócio.

O frontend:

* apresenta informações;
* captura ações do usuário;
* chama a API;
* mantém estado visual;
* recebe atualizações em tempo real quando necessário.

A autoridade continua sendo o backend.

Telas esperadas futuramente:

```text
Login
Dashboard

Atendimentos
Conversas
WhatsApp

Pacientes

Agenda
Consultas

Médicos
Especialidades

Pagamentos

Documentos

Prontuário

Automações

Equipe
Permissões

Configurações

Relatórios
```

Uma das interfaces mais importantes será a tela de atendimento.

Ela deverá permitir algo semelhante a:

```text
Lista de conversas
        │
        ▼
Conversa selecionada
        │
        ├── mensagens
        ├── dados do paciente
        ├── agendamentos
        ├── informações relevantes
        └── ações rápidas
```

O colaborador deverá conseguir assumir ou devolver uma conversa para a IA.

---

# 10. Atendimento

Atendimento é um dos principais domínios do sistema.

Conceitos principais:

```text
Conversation
Message
Contact
Patient
Channel
Assignment
ConversationStatus
```

Não confundir:

```text
Conversation
```

com:

```text
WhatsAppConversation
```

Uma conversa pertence ao domínio de atendimento.

WhatsApp é apenas um canal.

---

# 11. Atendimento humano + IA

A IA poderá responder automaticamente.

O colaborador também poderá assumir a conversa.

Estados conceituais podem incluir:

```text
AI
HUMAN
PAUSED
CLOSED
```

Ou outra modelagem equivalente.

A lógica deve impedir conflitos.

Nunca permitir por acidente:

```text
IA responde
+
humano responde
```

simultaneamente.

Deve existir autoridade clara sobre quem controla a conversa naquele momento.

Exemplo:

```text
Paciente
↓
IA
↓
situação específica
↓
Handoff
↓
Humano assume
↓
IA para de responder
```

Posteriormente:

```text
Humano
↓
devolve para IA
↓
automação continua
```

---

# 12. Canais de atendimento

A arquitetura deve ser multicanal desde a modelagem, ainda que inicialmente exista somente WhatsApp.

Canais futuros podem incluir:

```text
WhatsApp
Instagram Direct
Web Chat
E-mail
Aplicativo
Voice AI
Facebook Messenger
outros
```

Não espalhar regras específicas de WhatsApp pelo domínio de conversas.

Utilizar abstrações.

Exemplo conceitual:

```typescript
interface MessagingProvider {
  sendText(...)
  sendImage(...)
  sendDocument(...)
  sendAudio(...)
  markAsRead(...)
}
```

---

# 13. WhatsApp — estratégia de providers

Inicialmente poderemos trabalhar com provedores não oficiais ou intermediários.

Um dos provedores previstos é:

```text
Z-API
```

Também poderá existir integração com:

```text
Evolution API
```

Entretanto, o sistema **não pode depender estruturalmente de Z-API ou Evolution API**.

Devemos utilizar adapters/providers.

Exemplo:

```text
MessagingProvider
│
├── ZApiProvider
├── EvolutionProvider
├── MetaWhatsAppProvider
└── futuros providers
```

A regra de negócio utiliza:

```text
MessagingService
```

e não:

```text
ZApiClient
```

diretamente.

---

# 14. WhatsApp API Oficial

No futuro, queremos permitir conexão direta com a API oficial da Meta:

```text
WhatsApp Cloud API
```

Portanto, desde o início:

* normalizar mensagens recebidas;
* normalizar status;
* normalizar IDs externos;
* não armazenar exclusivamente estruturas específicas da Z-API;
* manter `external_payload` apenas quando necessário para debugging/auditoria;
* criar DTOs internos independentes do provider.

Exemplo:

```text
Z-API payload
      ↓
adapter
      ↓
IncomingMessage normalizado
      ↓
ConversationService
```

E futuramente:

```text
Meta Cloud API payload
      ↓
adapter
      ↓
IncomingMessage normalizado
      ↓
ConversationService
```

O restante do sistema não deve perceber a troca.

---

# 15. Instagram Direct

O sistema deverá futuramente poder atender também mensagens recebidas pelo:

```text
Instagram Direct
```

Isso reforça a necessidade de separar:

```text
conversation
```

de:

```text
whatsapp
```

Um paciente/contato poderá futuramente conversar com a clínica por:

```text
WhatsApp
Instagram
Web Chat
```

e o sistema poderá eventualmente unificar esse relacionamento.

O módulo de Instagram deverá ser uma integração/canal, não um novo sistema de conversas independente.

Exemplo:

```text
InstagramProvider
      ↓
normalização
      ↓
Messaging / Conversations
```

---

# 16. Normalização de mensagens

Criar uma representação interna de mensagens.

Exemplo conceitual:

```typescript
type Channel =
  | 'whatsapp'
  | 'instagram'
  | 'webchat'
  | 'email';
```

Uma mensagem interna poderá ter:

```text
id
tenant_id
conversation_id

channel

direction
incoming/outgoing

sender
recipient

type
text/image/audio/video/document/etc

content

external_message_id

provider
provider_instance_id

status

created_at
```

A modelagem final deverá ser feita quando o módulo for implementado.

Não copie este exemplo cegamente se houver alternativa melhor.

---

# 17. Instâncias / números de WhatsApp

Uma clínica poderá futuramente possuir:

* um número;
* vários números;
* números para unidades diferentes;
* números para departamentos diferentes.

Portanto, não assumir:

```text
tenant = um único WhatsApp
```

Criar futuramente entidade equivalente a:

```text
MessagingConnection
```

ou:

```text
ChannelConnection
```

que possa representar:

```text
Z-API instance
Meta WhatsApp number
Instagram account
etc.
```

---

# 18. Multi-tenant

Clinic Platform é SaaS.

Cada organização/clínica deve ser isolada.

Conceito principal:

```text
tenant_id
```

Entidades como:

```text
Patient
Doctor
Conversation
Message
Appointment
Document
Payment
User
```

devem possuir relacionamento claro com tenant quando aplicável.

Nunca confiar simplesmente em:

```text
tenant_id
```

enviado pelo frontend.

O tenant deverá ser derivado do contexto autenticado.

A aplicação nunca pode misturar dados entre clínicas.

---

# 19. Clínicas e unidades

No futuro pode existir:

```text
Tenant
└── Clinic / Organization
    ├── Unit A
    ├── Unit B
    └── Unit C
```

Não precisamos implementar toda essa hierarquia imediatamente.

Porém evitar modelagem que impossibilite múltiplas unidades.

---

# 20. Usuários, funções e permissões

Teremos usuários como:

```text
Owner
Administrador
Médico
Recepcionista
Financeiro
Atendente
outros
```

Não basear todo o sistema apenas em:

```text
is_admin
```

A arquitetura deverá evoluir para:

```text
RBAC
roles
permissions
```

Exemplos:

```text
patients.read
patients.update

appointments.read
appointments.create
appointments.cancel

medical_records.read
medical_records.write

payments.read

conversations.assign
```

---

# 21. Pacientes

Paciente será uma entidade central.

Relacionamentos futuros:

```text
Patient
├── conversations
├── appointments
├── documents
├── payments
├── medical records
├── contacts
├── tags
└── events/history
```

Não duplicar paciente apenas porque falou por canais diferentes.

Precisaremos futuramente de mecanismos seguros de identificação/unificação.

---

# 22. Agenda e consultas

Agenda será outro domínio central.

Não criar um sistema baseado apenas em:

```text
date + time
```

Teremos necessidade de:

```text
Doctor
Availability
ScheduleRule
ScheduleBlock
Appointment
AppointmentStatus

WorkingHours
Breaks
Holidays
BlockedPeriods
Duration
Locations
Procedures
```

Deve existir proteção contra conflito de agenda.

Não confiar apenas em validação no frontend.

Concorrência deve ser tratada no backend e, quando necessário, através de constraints/transações/locks.

---

# 23. IA aplicada ao atendimento

IA será parte central, mas não será autoridade sobre dados críticos.

A IA pode:

* interpretar intenção;
* entender linguagem natural;
* resumir conversas;
* buscar informações;
* sugerir respostas;
* identificar dados;
* selecionar ferramentas.

A IA não deve:

* alterar banco diretamente;
* ignorar permissões;
* inventar disponibilidade;
* confirmar pagamento inexistente;
* criar consulta sem validação;
* tomar decisões médicas críticas sem controle apropriado.

Modelo:

```text
Paciente
↓
Mensagem
↓
IA interpreta
↓
Tool
↓
Service
↓
regras de negócio
↓
Banco
```

---

# 24. AI Tools

Ferramentas futuras podem incluir:

```text
getPatient
findPatient

getDoctors
getSpecialties

getAvailableSlots

createAppointment
rescheduleAppointment
cancelAppointment

createPaymentLink

getClinicInformation

transferToHuman
```

A ferramenta deve chamar um domínio/service.

Nunca:

```text
AI Tool
↓
SQL direto
```

Preferir:

```text
AI Tool
↓
AppointmentService
↓
Repository
```

---

# 25. AI Providers

Não espalhar chamadas diretas da OpenAI.

Criar futuramente camada como:

```text
AIProvider
AIService
AIToolRegistry
AIConversationOrchestrator
```

Providers possíveis:

```text
OpenAI
Anthropic
Gemini
modelos locais
outros
```

Trocar provider não deve exigir reescrever regras de negócio.

---

# 26. Contexto da IA

Nunca enviar indiscriminadamente todo o banco ou histórico completo para o modelo.

Construir contexto mínimo necessário.

Considerar:

* privacidade;
* custo;
* desempenho;
* segurança;
* precisão;
* tamanho do contexto.

Dados médicos devem receber cuidado especialmente rigoroso.

---

# 27. Pagamentos

Futuramente:

```text
PaymentService
```

com providers:

```text
Asaas
Mercado Pago
Stripe
outros
```

Funções:

```text
criar cobrança
gerar link
consultar cobrança
receber webhook
confirmar pagamento
cancelar
reembolsar
```

Nunca acoplar `AppointmentService` diretamente a uma API específica de pagamento.

---

# 28. Documentos

Documentos futuros:

```text
PDF
imagem
exame
laudo
receita
atestado
documentos pessoais
```

Arquivos não devem depender do filesystem local dos containers.

Utilizar futuramente object storage compatível com S3.

Banco mantém:

```text
metadata
ownership
storage key
hash
mime type
status
```

---

# 29. OCR / Document AI

OCR e processamento pesado devem ser assíncronos.

Fluxo futuro:

```text
upload
↓
API
↓
object storage
↓
job
↓
worker
↓
OCR
↓
extração
↓
resultado
```

Esse processamento deve ser arquitetado para poder futuramente rodar em:

```text
outro container
outra VPS
Python Worker
GPU Worker
serviço externo
```

---

# 30. Prontuário

Prontuário será implementado posteriormente.

É um domínio sensível.

Exigirá:

* autenticação;
* autorização;
* auditoria;
* rastreabilidade;
* histórico;
* controle de acesso;
* integridade;
* segurança.

Não implementar atalhos nesse domínio.

---

# 31. Eventos internos

Quando uma ação principal gerar ações secundárias, preferir eventos.

Exemplo:

```text
AppointmentCreated
      │
      ├── schedule reminder
      ├── send WhatsApp
      ├── generate payment
      └── analytics
```

Evitar:

```text
AppointmentService
↓
WhatsApp API
↓
Payment API
↓
Email API
↓
...
```

tudo diretamente acoplado.

Inicialmente BullMQ pode cumprir grande parte dessa função.

Não precisamos Kafka agora.

---

# 32. Banco de dados

Banco principal:

```text
PostgreSQL
```

Não adicionar novos bancos sem necessidade concreta.

Utilizar corretamente:

* foreign keys;
* indexes;
* unique constraints;
* transactions;
* timestamps;
* tenant isolation;
* migrations.

Evitar N+1 queries.

Evitar consultas sem índices em caminhos críticos.

---

# 33. Redis

Redis poderá ser utilizado para:

* BullMQ;
* cache;
* locks;
* rate limiting;
* estado efêmero;
* deduplicação;
* throttling.

Redis não deve ser a fonte permanente dos principais dados de negócio.

PostgreSQL continua sendo a fonte principal.

---

# 34. Escala horizontal

Não manter estado importante exclusivamente em memória do processo.

O sistema deve poder evoluir de:

```text
clinic x1
worker x1
```

para:

```text
clinic x5
worker x20
```

sem reescrever regras de negócio.

Estado importante:

```text
PostgreSQL
Redis
Object Storage
```

não:

```typescript
const globalState = {};
```

---

# 35. Futuras VPSs e containers

Hoje:

```text
VPS
├── clinic
├── clinic_worker
├── clinic_db
├── clinic_redis
└── clinic_web
```

Futuramente pode existir:

```text
VPS API
├── clinic x3

VPS WORKERS
├── worker-ai x5
├── worker-messaging x10

VPS DOCUMENTS
├── document-worker

Managed PostgreSQL

Managed Redis

Object Storage
```

Não precisamos montar isso agora.

A arquitetura apenas deve permitir essa evolução.

---

# 36. Integrações

Todas as integrações externas devem preferencialmente viver atrás de interfaces/providers.

Exemplos:

```text
MessagingProvider
PaymentProvider
AIProvider
StorageProvider
EmailProvider
CalendarProvider
```

Não criar abstração apenas por abstração.

Criar quando houver domínio externo que provavelmente poderá mudar ou possuir múltiplos providers.

---

# 37. Webhooks

Webhooks devem:

1. autenticar/validar quando possível;
2. responder rapidamente;
3. registrar evento;
4. evitar processamento pesado síncrono;
5. possuir deduplicação;
6. suportar retries do provider.

Nunca assumir que um provider enviará um webhook apenas uma vez.

---

# 38. Idempotência

Operações importantes devem considerar repetição.

Exemplo:

```text
WhatsApp envia webhook
↓
API recebe
↓
provider repete webhook
```

O sistema não deve criar duas mensagens indevidamente.

O mesmo para:

```text
pagamentos
agendamentos
notificações
jobs
```

---

# 39. Observabilidade

Queremos futuramente:

```text
logs
metrics
traces
error monitoring
```

Desde o começo, utilizar logs claros e estruturados.

Evitar usar apenas:

```typescript
console.log("teste");
```

em código permanente.

Incluir quando apropriado:

```text
request_id
tenant_id
conversation_id
patient_id
job_id
provider
event
```

Nunca logar segredos.

Ter cuidado especial ao logar dados médicos.

---

# 40. Auditoria

Futuramente haverá:

```text
audit_logs
```

Ações relevantes:

```text
patient.created
patient.updated

appointment.created
appointment.cancelled

conversation.assigned

medical_record.viewed
medical_record.updated

document.accessed

permission.changed
```

Auditoria não é igual a log técnico.

São conceitos separados.

---

# 41. Segurança

Princípios obrigatórios:

* nenhum segredo no Git;
* `.env` não deve ser commitado;
* senhas sempre com hashing apropriado;
* validação de entrada;
* autenticação;
* autorização;
* isolamento de tenant;
* rate limiting;
* proteção de endpoints;
* princípio do menor privilégio;
* logs sem secrets;
* evitar exposição de stack traces.

Nunca confiar no frontend como camada de segurança.

---

# 42. LGPD e saúde

Este sistema trabalhará futuramente com dados pessoais e potencialmente dados de saúde.

Portanto, tratar privacidade e segurança como requisitos de arquitetura.

Quando chegarmos aos módulos sensíveis, considerar especificamente:

* minimização de dados;
* controle de acesso;
* auditoria;
* retenção;
* exclusão;
* consentimento quando aplicável;
* criptografia quando apropriado;
* rastreabilidade.

Questões legais específicas devem ser validadas quando o módulo correspondente for desenvolvido.

---

# 43. Código

Preferir:

* TypeScript estrito;
* nomes claros;
* funções pequenas;
* módulos coesos;
* dependências explícitas;
* DTOs;
* validação;
* interfaces quando realmente úteis;
* dependency injection;
* testes em regras críticas.

Evitar:

* `any` sem necessidade;
* arquivos gigantes;
* funções gigantes;
* dependências circulares;
* SQL espalhado pela aplicação;
* acesso direto indiscriminado ao ORM;
* código duplicado.

---

# 44. Separação por domínio

A estrutura deve refletir os domínios do negócio.

Exemplo:

```text
patients/
appointments/
conversations/
messaging/
users/
auth/
payments/
documents/
ai/
```

Evitar uma estrutura baseada apenas em tecnologia:

```text
controllers/
services/
repositories/
```

contendo centenas de arquivos misturados.

Pode haver controllers/services internamente em cada domínio.

Exemplo:

```text
patients/
├── application/
├── domain/
├── infrastructure/
└── presentation/
```

Não é obrigatório aplicar DDD completo.

Utilize somente a complexidade que agregar valor.

---

# 45. Contracts compartilhados

Quando API, worker e web precisarem compartilhar tipos/contratos, utilizar `packages`.

Por exemplo:

```text
packages/contracts
```

Mas evitar compartilhar entidades internas inteiras desnecessariamente.

Compartilhar contratos intencionais.

---

# 46. `clinic_web` e backend

O frontend deve consumir APIs bem definidas.

Não criar dependência de estrutura interna do backend.

Exemplo:

```text
clinic_web
↓ HTTP / WebSocket
clinic
```

Nunca:

```text
clinic_web
↓
acesso direto PostgreSQL
```

---

# 47. Tempo real

Atendimento futuramente precisará de atualização em tempo real.

Por exemplo:

```text
nova mensagem
status alterado
conversa atribuída
IA respondendo
atendente assumiu
```

Podemos utilizar futuramente:

```text
WebSocket
```

A escolha será feita quando implementarmos atendimento.

Não implementar prematuramente se não for necessário ainda.

---

# 48. Ordem aproximada de implementação

Não é rígida, mas nossa direção inicial é:

```text
1. Fundação técnica

2. PostgreSQL

3. Redis + BullMQ

4. Estrutura multi-tenant

5. Auth

6. Users / Roles / Permissions

7. Patients

8. Messaging foundations

9. Conversations

10. Messages

11. WhatsApp Provider
    inicialmente Z-API e/ou Evolution

12. Atendimento humano

13. IA

14. clinic_web / painel de atendimento

15. Doctors / specialties

16. Agenda

17. Automações

18. Pagamentos

19. Instagram Direct

20. Documentos

21. OCR

22. Prontuário

23. Relatórios / analytics
```

Essa ordem poderá mudar por decisão do usuário.

---

# 49. Atualização deste BRAIN

Este arquivo deve evoluir junto com o produto.

Quando uma solicitação resultar em uma decisão arquitetural importante, considere atualizar o `BRAIN.md`.

Exemplos:

```text
troca de ORM
novo provider padrão
nova regra de tenant
decisão sobre autenticação
mudança da arquitetura de mensagens
definição de frontend
mudança de infraestrutura
```

Entretanto:

**não altere este documento silenciosamente para justificar decisões tomadas pela IA.**

A fonte principal das decisões é o usuário.

Se o usuário disser:

> Vamos usar Z-API como provider inicial.

Este arquivo poderá ser atualizado.

Se a IA simplesmente preferir outro provider, não deve alterar a decisão.

---

# 50. Regra para decisões não definidas

Quando houver uma escolha ainda não definida:

1. não invente requisitos;
2. analise o projeto;
3. escolha a solução mais simples e profissional quando a decisão for facilmente reversível;
4. se a decisão tiver impacto arquitetural significativo ou difícil reversão, sinalize antes.

Exemplos de decisões que merecem maior cuidado:

```text
ORM
autenticação
storage
estrutura multi-tenant
modelo de agenda
modelo de prontuário
estratégia de criptografia
infraestrutura de produção
```

---

# 51. Não fazer overengineering

Este projeto precisa suportar crescimento.

Isso não significa adicionar hoje:

```text
Kubernetes
Kafka
RabbitMQ
Elasticsearch
MongoDB
Service Mesh
Event Sourcing completo
CQRS completo
20 microserviços
```

sem necessidade.

Preferimos:

```text
Node
NestJS
Fastify
PostgreSQL
Redis
BullMQ
Docker
```

bem implementados.

Complexidade deve ser introduzida quando resolver um problema real.

---

# 52. Filosofia final

Ao trabalhar neste projeto, mantenha sempre estas três ideias:

### 1. O produto vem antes da tecnologia

A arquitetura existe para permitir que clínicas atendam melhor, automatizem processos e reduzam trabalho operacional.

### 2. Simples agora, escalável depois

Não construir infraestrutura de uma empresa de bilhões de usuários antes de existirem usuários.

Mas também não criar atalhos que obriguem reconstruir tudo quando o produto crescer.

### 3. Separação de responsabilidades

```text
UI
≠
API
≠
domínio
≠
provider
≠
worker
≠
banco
```

Essas fronteiras devem permanecer claras.

---

# 53. Objetivo

O Clinic Platform deve evoluir para algo semelhante a:

```text
                     PACIENTE
                        │
          ┌─────────────┼─────────────┐
          │             │             │
       WhatsApp     Instagram      Web Chat
          │             │             │
          └─────────────┼─────────────┘
                        │
                  MESSAGING
                        │
                  CONVERSATIONS
                        │
              ┌─────────┴─────────┐
              │                   │
             IA                HUMANO
              │                   │
              └─────────┬─────────┘
                        │
               REGRAS DE NEGÓCIO
                        │
       ┌────────────────┼────────────────┐
       │                │                │
    PACIENTES         AGENDA         PAGAMENTOS
       │                │                │
       └────────────────┼────────────────┘
                        │
                   DOCUMENTOS
                        │
                       OCR
                        │
                   PRONTUÁRIO
```

Tudo isso sem transformar o projeto em um conjunto impossível de manter.

---

# 54. Instrução final para agentes de código

Antes de implementar qualquer solicitação:

> Leia este arquivo como contexto do projeto, mas trate a solicitação atual do usuário como a autoridade mais recente.

Implemente incrementalmente.

Preserve compatibilidade quando possível.

Não construa módulos futuros sem necessidade.

Não faça grandes refatorações não solicitadas.

Mantenha componentes desacoplados.

Priorize legibilidade e manutenção.

Teste o que alterar.

Quando uma decisão nova mudar materialmente a direção do projeto, atualize este `BRAIN.md` para que futuros agentes compreendam a nova realidade.

Nosso objetivo não é apenas produzir código.

Nosso objetivo é construir **uma plataforma médica confiável, rápida, segura, modular e capaz de crescer por muitos anos**.
