# 🚀 AutoATAS - Deploy VPS

## Instalação Rápida (One-Liner)

Execute no seu servidor Ubuntu 22.04:

```bash
curl -fsSL https://raw.githubusercontent.com/Zekabr2023/autoatas/main/deploy/install.sh | sudo bash
```

## Requisitos

- VPS com Ubuntu 22.04 LTS
- Mínimo 2GB RAM, 20GB disco
- Domínio apontando para o IP do servidor
- Conta no [Supabase](https://supabase.com) com projeto criado

## O que será instalado

| Serviço | Descrição |
|---------|-----------|
| **Traefik** | Reverse proxy com SSL automático |
| **Portainer** | Interface gráfica para Docker |
| **AutoATAS Frontend** | Aplicação React (Nginx) |
| **AutoATAS Backend** | API Node.js com FFmpeg |

## Subdomínios Utilizados

- `autoatas.seudominio.com` - Frontend
- `api.seudominio.com` - Backend API
- `portainer.seudominio.com` - Gerenciador Docker

## Informações Necessárias

O script irá solicitar:

1. **Domínio base** (ex: `seudominio.com`)
2. **Email para SSL** (notificações Let's Encrypt)
3. **Senha do Portainer** (mín. 12 caracteres)
4. **URL do Supabase** (ex: `https://xxx.supabase.co`)
5. **Anon Key do Supabase**

## Comandos Úteis

```bash
# Ver logs
cd /opt/autoatas/app/deploy && docker-compose logs -f

# Reiniciar
cd /opt/autoatas/app/deploy && docker-compose restart

# Parar
cd /opt/autoatas/app/deploy && docker-compose down

# Atualizar
cd /opt/autoatas/app && git pull && cd deploy && docker-compose up -d --build
```

## Credenciais

Após instalação, suas credenciais estarão salvas em:
```
/opt/autoatas/credentials.txt
```

## Suporte

Em caso de problemas, verifique os logs:
```bash
docker-compose logs traefik
docker-compose logs autoatas-backend
```
