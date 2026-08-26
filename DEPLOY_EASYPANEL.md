# Deploy no EasyPanel

Passo a passo para publicar o JARVIS Web OS no mesmo EasyPanel que já hospeda o n8n e o WAHA.

## 0. Pré-requisitos

- Este diretório (`jarvis-os/`) publicado em um repositório Git (GitHub/GitLab) que o EasyPanel
  consiga acessar — **ou** você faz upload manual do build, se preferir. O caminho por Git é o
  mais simples de manter.
- Os valores reais das variáveis de `.env.example` em mãos (n8n API key, chave anon do Axis,
  API key do WAHA).

## 1. Gerar os segredos

```bash
# Token de login (escolha algo forte, ou gere um):
openssl rand -hex 24

# Segredo de sessão:
openssl rand -hex 32
```

## 2. Ativar o workflow JARVIS CORE no n8n

O webhook de chat só responde com o workflow **ativo**. No editor do n8n, abra
`[G-TECH AI OS] JARVIS CORE` e ative-o (o app não funciona com ele inativo).

## 3. Criar a API Key do n8n

n8n → Settings → API → Create API Key. Essa chave alimenta só o painel de workflows do
dashboard (leitura).

## 4. Criar o app no EasyPanel

1. **New App** → **From Git Repository** (ou **From Docker Compose**, se preferir apontar
   direto pro `docker-compose.yml` deste diretório).
2. Se for por Git: aponte pro repositório, branch, e diretório raiz `jarvis-os/`.
3. EasyPanel deve detectar o `docker-compose.yml` (dois serviços: `backend` e `frontend`).

## 5. Configurar as variáveis de ambiente

No serviço **backend**, cole todas as variáveis de `backend/.env` (mesma lista de
`.env.example`) na aba de environment variables do EasyPanel — não como arquivo, como
variáveis mesmo, é o padrão do EasyPanel.

O serviço **frontend** não precisa de nenhuma variável — ele só serve arquivos estáticos e
faz proxy pro backend via nginx.

## 6. Configurar o domínio

Siga o mesmo padrão já usado para n8n/WAHA (`<nome>.vr4mar.easypanel.host`) — sugestão:
`jarvis.vr4mar.easypanel.host`. Aponte o domínio pro serviço **frontend** (porta 80/8080
conforme o `docker-compose.yml`). HTTPS deve ser provisionado automaticamente, igual aos
outros apps.

## 7. Deploy e checklist pós-deploy

Depois que os dois serviços subirem:

- [ ] `https://<seu-dominio>/api/health` retorna `{"ok":true,...}` (chame direto se o backend
      estiver exposto, ou confirme pelos logs do EasyPanel que "JARVIS backend listening"
      apareceu)
- [ ] Abrir `https://<seu-dominio>` mostra a tela de login
- [ ] Login com o `JARVIS_AUTH_TOKEN` funciona
- [ ] Perguntar algo no chat retorna uma resposta real do JARVIS CORE (não erro)
- [ ] Dashboard mostra contagens reais de workflows do n8n e KPIs do Axis (compare com uma
      consulta manual se quiser confirmar)
- [ ] Painel do WAHA mostra o status real da sessão "Jarvis"
- [ ] Testar voz no Chrome/Edge: microfone pede permissão, transcrição aparece, resposta é
      falada
- [ ] Confirmar que nenhuma chave aparece no bundle do frontend: abra o DevTools → Network →
      carregue os arquivos `.js` e procure por `N8N_API_KEY`/`SUPABASE`/`WAHA_API_KEY` — não
      deve aparecer nada

## 8. Se algo não funcionar

- **Chat não responde / erro 502**: confirme que o workflow JARVIS CORE está ativo no n8n e que
  `N8N_CHAT_WEBHOOK_URL` bate exatamente com a URL do webhook (produção, não teste).
- **Dashboard mostra "não conectado" em tudo**: confira as 3 credenciais (n8n API key, Axis
  anon key, WAHA API key) uma por uma — os logs do backend (`docker logs jarvis-backend` ou o
  painel de logs do EasyPanel) mostram qual delas está falhando.
- **Voz não funciona**: confirme que está usando Chrome ou Edge, e que o site está em HTTPS
  (Web Speech API exige contexto seguro).
