# JARVIS — Interface Oficial do G-TECH AI OS

Aplicação web que serve como interface do JARVIS: esfera holográfica central, voz (STT/TTS +
wake-word "Jarvis" experimental), chat completo, e um dashboard operacional com dados **reais**
(nunca inventados) vindos do n8n, do Axis (Supabase) e do WAHA.

**Toda a inteligência continua no n8n.** Esta aplicação é só relay + interface — o backend fala
com o webhook do `[G-TECH AI OS] JARVIS CORE`, nunca executa lógica de IA por conta própria.

## Arquitetura

```
Navegador (React/Vite/R3F) ⇄ WebSocket/REST ⇄ Backend (Node/Express/Socket.io) ⇄ n8n / Axis / WAHA
```

- **frontend/** — React + TypeScript + Vite + TailwindCSS + Framer Motion + React Three Fiber.
- **backend/** — Node.js + Express + Socket.io (TypeScript). Único lugar com segredos.
- **packages/shared/** — tipos TypeScript e contrato de eventos Socket.io compartilhados.

## Regra estrutural: nunca dado fabricado

Todo painel do dashboard usa o tipo `DataState<T>` (`live | stale | error | unavailable`).
Não existe caminho de código que permita um número inventado aparecer como se fosse real —
o que não está conectado aparece como "não conectado", nunca como zero ou placeholder.

## Rodando localmente

Pré-requisitos: Node 20+, Docker (opcional para testar o build de produção).

```bash
cp .env.example backend/.env
# preencha backend/.env com os valores reais (ver seção "Variáveis de ambiente")

npm install
npm run build --workspace=packages/shared   # necessário 1x antes do dev do backend/frontend

npm run dev:backend    # terminal 1 — http://localhost:3001
npm run dev:frontend   # terminal 2 — http://localhost:5173 (proxy pro backend já configurado)
```

## Variáveis de ambiente

Ver `.env.example` na raiz — é a lista definitiva. Resumo do que cada uma faz:

| Variável | Para quê |
|---|---|
| `JARVIS_AUTH_TOKEN` | Token de login (usuário único — você) |
| `JARVIS_SESSION_SECRET` | Assina o cookie de sessão |
| `N8N_CHAT_WEBHOOK_URL` | Webhook de chat do JARVIS CORE (workflow precisa estar **ativo**) |
| `JARVIS_STREAMING_ENABLED` | Liga o modo streaming experimental (deixe `false` até validar) |
| `N8N_API_URL` / `N8N_API_KEY` | Painel de workflows do dashboard (API REST do n8n) |
| `AXIS_SUPABASE_URL` / `AXIS_SUPABASE_ANON_KEY` / `AXIS_TENANT_ID` | Painel de KPIs do Axis |
| `WAHA_URL` / `WAHA_API_KEY` / `WAHA_SESSION` | Painel de status do WhatsApp |

Nenhuma dessas chaves chega ao navegador — o frontend só fala com o próprio backend (mesma
origem, via proxy do nginx em produção).

## Limitações conhecidas (documentadas, não escondidas)

- **Voz (STT)**: funciona bem em Chrome/Edge. Firefox não suporta; Safari é inconsistente. O chat
  por texto funciona em qualquer navegador.
- **Wake-word ("Jarvis")**: melhor esforço — pode parar sozinho após silêncio, precisa da aba
  aberta, consome rede (o reconhecimento do Chrome é via nuvem, não on-device). Desligado por
  padrão; sempre dá pra usar o botão de microfone manualmente.
- **Streaming**: o modo `responseMode: streaming` do n8n é historicamente inconsistente em nós
  LangChain community. O caminho padrão (não-streaming) é o confiável; streaming é opt-in via
  `JARVIS_STREAMING_ENABLED=true` com fallback automático se falhar.
- **Anexos de arquivo**: só preview local nesta v1 — o webhook do JARVIS CORE ainda não aceita
  binário, então o anexo aparece marcado como "ainda não enviado ao JARVIS", nunca fingindo que
  foi processado.

## Fases seguintes (fora do escopo desta v1)

Streaming real validado, WhatsApp bidirecional no dashboard, painel de memória/RAG (depende de
uma conta Supabase separada ainda não provisionada), visualizações mais profundas por diretor
(grafo de workflows, rede de agentes), monitoramento real de infraestrutura.

## Deploy

Ver `DEPLOY_EASYPANEL.md` para o passo a passo completo no EasyPanel.
