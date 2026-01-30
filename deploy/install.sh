#!/bin/bash

# ╔══════════════════════════════════════════════════════════════════╗
# ║                     AUTOATAS INSTALLER                           ║
# ║              VPS Ubuntu 22.04 - One-Click Deploy                 ║
# ╚══════════════════════════════════════════════════════════════════╝

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
print_banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║                                                                  ║"
    echo "║     █████╗ ██╗   ██╗████████╗ ██████╗  █████╗ ████████╗ █████╗███████╗"
    echo "║    ██╔══██╗██║   ██║╚══██╔══╝██╔═══██╗██╔══██╗╚══██╔══╝██╔══██╗██╔════╝"
    echo "║    ███████║██║   ██║   ██║   ██║   ██║███████║   ██║   ███████║███████╗"
    echo "║    ██╔══██║██║   ██║   ██║   ██║   ██║██╔══██║   ██║   ██╔══██║╚════██║"
    echo "║    ██║  ██║╚██████╔╝   ██║   ╚██████╔╝██║  ██║   ██║   ██║  ██║███████║"
    echo "║    ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝"
    echo "║                                                                  ║"
    echo "║              Sistema de Geração de Atas de Condomínio            ║"
    echo "║                         v1.0 - Deploy VPS                        ║"
    echo "║                                                                  ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Utility functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Este script deve ser executado como root (sudo)"
        exit 1
    fi
}

# Check OS
check_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        if [ "$ID" != "ubuntu" ] || [[ "$VERSION_ID" != "22.04"* ]]; then
            log_warning "Este script foi testado no Ubuntu 22.04. Versão detectada: $ID $VERSION_ID"
            read -p "Deseja continuar mesmo assim? (s/N): " continue_install
            if [ "$continue_install" != "s" ] && [ "$continue_install" != "S" ]; then
                exit 1
            fi
        fi
    fi
}

# Generate random string
generate_random_string() {
    openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c "$1"
}

# Validate domain format
validate_domain() {
    local domain="$1"
    if [[ ! "$domain" =~ ^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$ ]]; then
        return 1
    fi
    return 0
}

# Validate email format
validate_email() {
    local email="$1"
    if [[ ! "$email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        return 1
    fi
    return 0
}

# Collect user input
collect_inputs() {
    echo ""
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE}                    CONFIGURAÇÃO DO SISTEMA                     ${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""

    # ===== DOMÍNIOS INDIVIDUAIS =====
    echo -e "${CYAN}📌 DOMÍNIOS${NC}"
    echo -e "${YELLOW}   Digite o domínio COMPLETO para cada serviço.${NC}"
    echo -e "${YELLOW}   Exemplo: autoatas.minhaempresa.com.br${NC}"
    echo ""

    # Frontend Domain
    while true; do
        read -p "🖥️  Domínio do FRONTEND (aplicação principal): " DOMAIN_APP
        if validate_domain "$DOMAIN_APP"; then
            break
        else
            log_error "Domínio inválido. Use o formato: autoatas.seudominio.com.br"
        fi
    done

    # API Domain
    while true; do
        read -p "🔌 Domínio da API (backend): " DOMAIN_API
        if validate_domain "$DOMAIN_API"; then
            break
        else
            log_error "Domínio inválido. Use o formato: api.seudominio.com.br"
        fi
    done

    # Portainer Domain
    while true; do
        read -p "🐳 Domínio do PORTAINER (gerenciador Docker): " DOMAIN_PORTAINER
        if validate_domain "$DOMAIN_PORTAINER"; then
            break
        else
            log_error "Domínio inválido. Use o formato: portainer.seudominio.com.br"
        fi
    done

    # Traefik Domain (optional)
    while true; do
        read -p "🔀 Domínio do TRAEFIK (dashboard - opcional, Enter para pular): " DOMAIN_TRAEFIK
        if [ -z "$DOMAIN_TRAEFIK" ]; then
            DOMAIN_TRAEFIK="traefik.localhost"
            log_info "Dashboard do Traefik não será exposto externamente."
            break
        elif validate_domain "$DOMAIN_TRAEFIK"; then
            break
        else
            log_error "Domínio inválido. Use o formato: traefik.seudominio.com.br"
        fi
    done
    echo ""

    # Email for SSL
    echo -e "${CYAN}📧 CERTIFICADO SSL (Let's Encrypt)${NC}"
    while true; do
        read -p "Email para notificações SSL: " LETSENCRYPT_EMAIL
        if validate_email "$LETSENCRYPT_EMAIL"; then
            break
        else
            log_error "Email inválido. Use o formato: email@dominio.com"
        fi
    done
    echo ""

    # Portainer password
    echo -e "${CYAN}🔐 PORTAINER (Gerenciador Docker)${NC}"
    while true; do
        read -s -p "Senha do admin Portainer (mín. 12 caracteres): " PORTAINER_PASSWORD
        echo ""
        if [ ${#PORTAINER_PASSWORD} -ge 12 ]; then
            read -s -p "Confirme a senha: " PORTAINER_PASSWORD_CONFIRM
            echo ""
            if [ "$PORTAINER_PASSWORD" == "$PORTAINER_PASSWORD_CONFIRM" ]; then
                break
            else
                log_error "As senhas não coincidem."
            fi
        else
            log_error "A senha deve ter no mínimo 12 caracteres."
        fi
    done
    echo ""

    # Supabase
    echo -e "${CYAN}🗄️ SUPABASE (Banco de Dados)${NC}"
    read -p "URL do projeto Supabase (ex: https://xxx.supabase.co): " SUPABASE_URL
    read -p "Anon Key do Supabase: " SUPABASE_ANON_KEY
    echo ""

    # Generate encryption key
    ENCRYPTION_KEY=$(generate_random_string 32)
    log_info "Chave de criptografia gerada automaticamente."
    echo ""

    # Traefik dashboard auth
    TRAEFIK_USER="admin"
    TRAEFIK_PASS=$(generate_random_string 16)
    TRAEFIK_AUTH=$(htpasswd -nb "$TRAEFIK_USER" "$TRAEFIK_PASS" 2>/dev/null || echo "admin:\$apr1\$xyz")

    # Confirm
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}                    CONFIRME AS CONFIGURAÇÕES                   ${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  🖥️  Frontend:    ${GREEN}https://${DOMAIN_APP}${NC}"
    echo -e "  🔌 API:         ${GREEN}https://${DOMAIN_API}${NC}"
    echo -e "  🐳 Portainer:   ${GREEN}https://${DOMAIN_PORTAINER}${NC}"
    if [ "$DOMAIN_TRAEFIK" != "traefik.localhost" ] && [ -n "$DOMAIN_TRAEFIK" ]; then
        echo -e "  🔀 Traefik:     ${GREEN}https://${DOMAIN_TRAEFIK}${NC}"
    fi
    echo -e "  📧 Email SSL:   ${GREEN}${LETSENCRYPT_EMAIL}${NC}"
    echo -e "  🗄️  Supabase:    ${GREEN}${SUPABASE_URL}${NC}"
    echo ""
    read -p "As informações estão corretas? (S/n): " confirm
    if [ "$confirm" == "n" ] || [ "$confirm" == "N" ]; then
        log_warning "Instalação cancelada pelo usuário."
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    log_info "Atualizando sistema..."
    apt update -qq
    apt upgrade -y -qq

    log_info "Instalando dependências..."
    apt install -y -qq \
        curl \
        git \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        apache2-utils

    # Install Docker
    if ! command -v docker &> /dev/null; then
        log_info "Instalando Docker..."
        curl -fsSL https://get.docker.com | sh
        systemctl enable docker
        systemctl start docker
    else
        log_info "Docker já instalado."
    fi

    # Install Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_info "Instalando Docker Compose..."
        apt install -y -qq docker-compose-plugin
        ln -sf /usr/libexec/docker/cli-plugins/docker-compose /usr/local/bin/docker-compose 2>/dev/null || true
    else
        log_info "Docker Compose já instalado."
    fi

    log_success "Dependências instaladas com sucesso!"
}

# Setup directories
setup_directories() {
    log_info "Criando diretórios..."
    
    INSTALL_DIR="/opt/autoatas"
    UPLOADS_DIR="/opt/autoatas/uploads"
    
    mkdir -p "$INSTALL_DIR"
    mkdir -p "$UPLOADS_DIR"
    
    cd "$INSTALL_DIR"
}

# Clone repository
clone_repository() {
    log_info "Baixando AutoATAS..."
    
    if [ -d "$INSTALL_DIR/app" ]; then
        rm -rf "$INSTALL_DIR/app"
    fi
    
    local REPO_URL="https://github.com/Zekabr2023/autoatas.git"
    
    if ! git clone --depth 1 "$REPO_URL" app 2>/dev/null; then
        log_error "Falha ao clonar repositório: $REPO_URL"
        log_error "Verifique se o repositório existe e é acessível."
        exit 1
    fi
    
    log_success "Código baixado com sucesso!"
}

# Create Docker network
create_network() {
    log_info "Criando rede Docker..."
    docker network create traefik-public 2>/dev/null || true
}

# Create environment file
create_env_file() {
    log_info "Criando arquivo de configuração..."
    
    cat > "$INSTALL_DIR/.env" << EOF
# AutoATAS Environment Configuration
# Generated on $(date)

# Domains
DOMAIN_APP=${DOMAIN_APP}
DOMAIN_API=${DOMAIN_API}
DOMAIN_PORTAINER=${DOMAIN_PORTAINER}
DOMAIN_TRAEFIK=${DOMAIN_TRAEFIK}

# SSL
LETSENCRYPT_EMAIL=${LETSENCRYPT_EMAIL}

# Supabase
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}

# Security
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# Paths
UPLOADS_PATH=${UPLOADS_DIR}

# Traefik Dashboard Auth
TRAEFIK_AUTH=${TRAEFIK_AUTH}
EOF

    chmod 600 "$INSTALL_DIR/.env"
}

# Create acme.json for certificates and generate traefik.yml with actual email
create_acme_file() {
    touch "$INSTALL_DIR/app/deploy/acme.json"
    chmod 600 "$INSTALL_DIR/app/deploy/acme.json"
    
    # Generate traefik.yml with actual email (Traefik doesn't expand env vars in static config)
    cat > "$INSTALL_DIR/app/deploy/traefik.yml" <<EOF
# Traefik Static Configuration - Generated by install.sh
api:
  dashboard: true
  insecure: false

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: traefik-public
    apiVersion: "1.44"

certificatesResolvers:
  letsencrypt:
    acme:
      email: "${LETSENCRYPT_EMAIL}"
      storage: /etc/traefik/acme.json
      httpChallenge:
        entryPoint: web

log:
  level: INFO

accessLog: {}
EOF
    log_success "Configuração do Traefik gerada com email SSL."
}

# Save credentials
save_credentials() {
    log_info "Salvando credenciais..."
    
    local traefik_section=""
    if [ "$DOMAIN_TRAEFIK" != "traefik.localhost" ] && [ -n "$DOMAIN_TRAEFIK" ]; then
        traefik_section="Traefik:      https://${DOMAIN_TRAEFIK}"
    fi
    
    cat > "$INSTALL_DIR/credentials.txt" << EOF
╔══════════════════════════════════════════════════════════════════╗
║                 AUTOATAS - CREDENCIAIS DE ACESSO                 ║
║                 Gerado em: $(date)
╚══════════════════════════════════════════════════════════════════╝

🌐 URLS DE ACESSO
═══════════════════════════════════════════════════════════════════
Frontend:     https://${DOMAIN_APP}
API:          https://${DOMAIN_API}
Portainer:    https://${DOMAIN_PORTAINER}
${traefik_section}

🔐 PORTAINER
═══════════════════════════════════════════════════════════════════
Usuário:      admin
Senha:        (definida durante instalação)

🔐 TRAEFIK DASHBOARD
═══════════════════════════════════════════════════════════════════
Usuário:      ${TRAEFIK_USER}
Senha:        ${TRAEFIK_PASS}

🗄️ SUPABASE
═══════════════════════════════════════════════════════════════════
URL:          ${SUPABASE_URL}
Anon Key:     ${SUPABASE_ANON_KEY:0:20}...

🔑 CHAVE DE CRIPTOGRAFIA
═══════════════════════════════════════════════════════════════════
${ENCRYPTION_KEY}

⚠️  IMPORTANTE: Mantenha este arquivo seguro!
    Localização: ${INSTALL_DIR}/credentials.txt
EOF

    chmod 600 "$INSTALL_DIR/credentials.txt"
}

# Deploy stack
deploy_stack() {
    log_info "Iniciando deploy..."
    
    cd "$INSTALL_DIR/app/deploy"
    
    # Copy .env to deploy directory
    cp "$INSTALL_DIR/.env" .
    
    # Build and start (using new docker compose command for modern Docker)
    if command -v docker compose &> /dev/null; then
        docker compose --env-file .env build --no-cache
        docker compose --env-file .env up -d
    else
        docker-compose --env-file .env build --no-cache
        docker-compose --env-file .env up -d
    fi
    
    log_success "Deploy realizado com sucesso!"
}

# Wait for services
wait_for_services() {
    log_info "Aguardando serviços iniciarem..."
    
    echo -n "Verificando containers"
    for i in {1..30}; do
        echo -n "."
        sleep 2
        
        running=$(docker ps --filter "status=running" --format "{{.Names}}" | wc -l)
        if [ "$running" -ge 4 ]; then
            echo ""
            break
        fi
    done
    
    echo ""
}

# Health check
health_check() {
    log_info "Verificando saúde dos serviços..."
    echo ""
    
    services=("traefik" "portainer" "autoatas-frontend" "autoatas-backend")
    all_healthy=true
    
    for service in "${services[@]}"; do
        status=$(docker inspect --format='{{.State.Status}}' "$service" 2>/dev/null || echo "not found")
        if [ "$status" == "running" ]; then
            echo -e "  ✅ ${service}: ${GREEN}running${NC}"
        else
            echo -e "  ❌ ${service}: ${RED}${status}${NC}"
            all_healthy=false
        fi
    done
    
    echo ""
    
    if [ "$all_healthy" = true ]; then
        log_success "Todos os serviços estão funcionando!"
    else
        log_warning "Alguns serviços podem precisar de mais tempo para iniciar."
        log_info "Use 'docker compose logs -f' para verificar os logs."
    fi
}

# Print final instructions
print_final() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                  INSTALAÇÃO CONCLUÍDA COM SUCESSO!               ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${CYAN}📌 SEUS LINKS DE ACESSO:${NC}"
    echo ""
    echo -e "   🖥️  Frontend:   ${GREEN}https://${DOMAIN_APP}${NC}"
    echo -e "   🔌 API:        ${GREEN}https://${DOMAIN_API}${NC}"
    echo -e "   🐳 Portainer:  ${GREEN}https://${DOMAIN_PORTAINER}${NC}"
    if [ "$DOMAIN_TRAEFIK" != "traefik.localhost" ] && [ -n "$DOMAIN_TRAEFIK" ]; then
        echo -e "   🔀 Traefik:    ${GREEN}https://${DOMAIN_TRAEFIK}${NC}"
    fi
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
    echo -e "   • Os certificados SSL podem levar alguns minutos para serem gerados"
    echo -e "   • No primeiro acesso ao Portainer, crie a conta admin"
    echo -e "   • Suas credenciais estão salvas em: ${INSTALL_DIR}/credentials.txt"
    echo ""
    echo -e "${CYAN}📋 COMANDOS ÚTEIS:${NC}"
    echo -e "   Ver logs:      ${PURPLE}cd ${INSTALL_DIR}/app/deploy && docker compose logs -f${NC}"
    echo -e "   Reiniciar:     ${PURPLE}cd ${INSTALL_DIR}/app/deploy && docker compose restart${NC}"
    echo -e "   Parar:         ${PURPLE}cd ${INSTALL_DIR}/app/deploy && docker compose down${NC}"
    echo -e "   Atualizar:     ${PURPLE}cd ${INSTALL_DIR}/app && git pull && cd deploy && docker compose up -d --build${NC}"
    echo ""
    echo -e "${GREEN}Obrigado por usar o AutoATAS! 🚀${NC}"
    echo ""
}

# Main execution
main() {
    print_banner
    check_root
    check_os
    collect_inputs
    install_dependencies
    setup_directories
    clone_repository
    create_network
    create_env_file
    create_acme_file
    save_credentials
    deploy_stack
    wait_for_services
    health_check
    print_final
}

# Run
main "$@"
