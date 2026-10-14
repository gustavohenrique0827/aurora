# JARVIS — Interface Oficial do G-TECH AI OS

Aplicação web que serve como interface do JARVIS: esfera holográfica central, voz (STT/TTS +
wake-word "Jarvis" experimental), chat completo, e um dashboard operacional com dados **reais**
(nunca inventados) vindos do n8n, do Axis (Supabase) e do WAHA.

**Toda a inteligência continua no n8n.** Esta aplicação é só relay + interface — o backend fala
com o webhook do `[G-TECH AI OS] JARVIS CORE`, nunca executa lógica de IA por conta própria.

## Arquitetura

```
Navegador (React/Vite/R3F) ⇄ REST ⇄ Funções serverless da Vercel (Express em api/) ⇄ n8n / SPY / WAHA
```

- **src/** (+ `index.html`) — React + TypeScript + Vite + TailwindCSS + Framer Motion + React Three Fiber.
- **server/** — Express (TypeScript), empacotado como função da Vercel (`api/index.js`). Único lugar com segredos.
- **shared/** — tipos TypeScript compartilhados.

## Regra estrutural: nunca dado fabricado

Todo painel do dashboard usa o tipo `DataState<T>` (`live | stale | error | unavailable`).
Não existe caminho de código que permita um número inventado aparecer como se fosse real —
o que não está conectado aparece como "não conectado", nunca como zero ou placeholder.

## Rodando localmente

Pré-requisitos: Node 20+, 

```bash
cp .env.example .env
# preencha .env com os valores reais (ver seção "Variáveis de ambiente")

npm install

npm run dev:server     # terminal 1 — http://localhost:3001
npm run dev:web      # terminal 2 — http://localhost:5173 (proxy pro backend já configurado)
```

## Variáveis de ambiente

Ver `.env.example` na raiz — é a lista definitiva. Resumo do que cada uma faz:

| Variável | Para quê |
|---|---|
| `JARVIS_AUTH_TOKEN` | Token de login (usuário único — você) |
| `JARVIS_SESSION_SECRET` | Assina o cookie de sessão |
| `N8N_CHAT_WEBHOOK_URL` | Webhook de chat do JARVIS CORE (workflow precisa estar **ativo**) |
| `N8N_API_URL` / `N8N_API_KEY` | Painel de workflows do dashboard (API REST do n8n) |
| `AXIS_SUPABASE_URL` / `AXIS_SUPABASE_ANON_KEY` / `AXIS_TENANT_ID` | Painel de KPIs do Axis |
| `WAHA_URL` / `WAHA_API_KEY` / `WAHA_SESSION` | Painel de status do WhatsApp |

Nenhuma dessas chaves chega ao navegador — o frontend só fala com o próprio backend (mesma
origem: a Vercel serve a interface e `/api/*`).

## Limitações conhecidas (documentadas, não escondidas)

- **Voz (STT)**: funciona bem em Chrome/Edge. Firefox não suporta; Safari é inconsistente. O chat
  por texto funciona em qualquer navegador.
- **Wake-word ("Jarvis")**: melhor esforço — pode parar sozinho após silêncio, precisa da aba
  aberta, consome rede (o reconhecimento do Chrome é via nuvem, não on-device). Desligado por
  padrão; sempre dá pra usar o botão de microfone manualmente.
- **Sem tempo real por socket**: na Vercel o dashboard é atualizado por polling (30s) e o chat é uma chamada HTTP única (`POST /api/chat`, até 300s).
- **Anexos de arquivo**: só preview local nesta v1 — o webhook do JARVIS CORE ainda não aceita
  binário, então o anexo aparece marcado como "ainda não enviado ao JARVIS", nunca fingindo que
  foi processado.

## Fases seguintes (fora do escopo desta v1)

Streaming real validado, WhatsApp bidirecional no dashboard, painel de memória/RAG (depende de
uma conta Supabase separada ainda não provisionada), visualizações mais profundas por diretor
(grafo de workflows, rede de agentes), monitoramento real de infraestrutura.

## Deploy

Tudo roda na Vercel: importe o repositório (Root Directory vazio), cadastre as variáveis de
`.env.example` em Settings → Environment Variables (inclusive `SPY_SUPABASE_SERVICE_ROLE_KEY`) e faça o deploy.
`vercel.json` define o build (`npm run build`), a função `api/index.js` (maxDuration 300s) e o fallback da SPA.
O limite de 300s e a duração das chamadas dependem do plano da Vercel.
