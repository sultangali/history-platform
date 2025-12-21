#!/bin/bash

# ============================================================
# History Platform - Полный скрипт деплоя
# ============================================================
# Этот скрипт выполняет полную установку и деплой:
# 1. Установка зависимостей
# 2. Клонирование и сборка приложения
# 3. Настройка Nginx
# 4. Настройка SSL
# ============================================================

set -e

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Конфигурация
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_NAME="history-platform"
APP_DIR="/var/www/history-platform"
STATIC_DIR="/var/www/html/history-platform"
GIT_REPO="git@github.com:sultangali/history-platform.git"
GIT_BRANCH="main"
DEFAULT_SERVER_IP="34.51.218.216"

# Функции логирования
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "\n${CYAN}========== $1 ==========${NC}\n"; }

# Проверка root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Этот скрипт должен быть запущен с правами root (sudo)"
        exit 1
    fi
}

# Приветствие
show_welcome() {
    clear
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║         🚀 HISTORY PLATFORM DEPLOYMENT 🚀                   ║"
    echo "║                                                              ║"
    echo "║          Автоматический деплой на VPS сервер                 ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo "Этот скрипт выполнит:"
    echo "  ✓ Установку MongoDB, Node.js, Nginx, PM2, Certbot"
    echo "  ✓ Клонирование репозитория из GitHub"
    echo "  ✓ Сборку фронтенда и настройку бэкенда"
    echo "  ✓ Настройку Nginx как reverse proxy"
    echo "  ✓ Настройку SSL сертификата"
    echo ""
    read -p "Продолжить? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
        log_info "Отменено пользователем"
        exit 0
    fi
}

# Сбор информации
collect_info() {
    echo ""
    log_step "СБОР ИНФОРМАЦИИ"
    
    # Получаем IP
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "$DEFAULT_SERVER_IP")
    
    # Если автоматическое определение не удалось, используем дефолтный IP
    if [ -z "$SERVER_IP" ] || [ "$SERVER_IP" = "" ]; then
        SERVER_IP="$DEFAULT_SERVER_IP"
    fi
    
    log_info "IP адрес сервера: $SERVER_IP"
    
    # Домен
    echo ""
    echo "Выберите режим работы:"
    echo "1) Только по IP (без домена) - самоподписанный SSL"
    echo "2) С доменом - Let's Encrypt SSL"
    echo ""
    read -p "Ваш выбор (1 или 2): " DOMAIN_CHOICE
    
    if [ "$DOMAIN_CHOICE" = "2" ]; then
        read -p "Введите доменное имя: " DOMAIN_NAME
        read -p "Введите email для SSL сертификата: " CERT_EMAIL
        
        if [ -z "$DOMAIN_NAME" ] || [ -z "$CERT_EMAIL" ]; then
            log_error "Домен и email обязательны"
            exit 1
        fi
        
        USE_DOMAIN=true
        SERVER_NAME=$DOMAIN_NAME
    else
        USE_DOMAIN=false
        SERVER_NAME=$SERVER_IP
    fi
    
    echo ""
    log_success "Информация собрана"
}

# Шаг 1: Установка зависимостей
step_install_deps() {
    log_step "ШАГ 1: УСТАНОВКА ЗАВИСИМОСТЕЙ"
    
    # Используем скрипт установки зависимостей если он существует
    if [ -f "$SCRIPT_DIR/01-install-dependencies.sh" ]; then
        log_info "Запуск скрипта установки зависимостей..."
        chmod +x "$SCRIPT_DIR/01-install-dependencies.sh"
        bash "$SCRIPT_DIR/01-install-dependencies.sh"
        log_success "Зависимости установлены"
        return
    fi
    
    # Если скрипт не найден, устанавливаем вручную
    log_info "Скрипт не найден, устанавливаем вручную..."
    
    # Определяем ОС
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
    fi
    
    log_info "Обновление системы..."
    apt-get update -y && apt-get upgrade -y
    
    log_info "Установка базовых утилит..."
    apt-get install -y curl wget nano vim git htop ufw gnupg lsb-release ca-certificates apt-transport-https software-properties-common build-essential
    
    # MongoDB
    if ! command -v mongod &> /dev/null; then
        log_info "Установка MongoDB..."
        curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
        echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
        apt-get update && apt-get install -y mongodb-org
        systemctl start mongod && systemctl enable mongod
    else
        log_info "MongoDB уже установлен"
    fi
    
    # Node.js
    if ! command -v node &> /dev/null; then
        log_info "Установка Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    else
        log_info "Node.js уже установлен: $(node --version)"
    fi
    
    # PM2
    if ! command -v pm2 &> /dev/null; then
        log_info "Установка PM2..."
        npm install -g pm2
    else
        log_info "PM2 уже установлен"
    fi
    
    # Nginx
    if ! command -v nginx &> /dev/null; then
        log_info "Установка Nginx..."
        apt-get install -y nginx
        systemctl start nginx && systemctl enable nginx
    else
        log_info "Nginx уже установлен"
    fi
    
    # Certbot
    if ! command -v certbot &> /dev/null; then
        log_info "Установка Certbot..."
        apt-get install -y certbot python3-certbot-nginx
    else
        log_info "Certbot уже установлен"
    fi
    
    # Firewall
    log_info "Настройка файрвола..."
    ufw allow ssh
    ufw allow 'Nginx Full'
    ufw --force enable
    
    # Создание директорий
    mkdir -p $APP_DIR
    mkdir -p /var/log/pm2
    mkdir -p /var/www/certbot
    
    log_success "Зависимости установлены"
}

# Шаг 2: Деплой приложения
step_deploy_app() {
    log_step "ШАГ 2: ДЕПЛОЙ ПРИЛОЖЕНИЯ"
    
    # Используем скрипт деплоя если он существует
    if [ -f "$SCRIPT_DIR/02-deploy-app.sh" ]; then
        log_info "Запуск скрипта деплоя приложения..."
        chmod +x "$SCRIPT_DIR/02-deploy-app.sh"
        bash "$SCRIPT_DIR/02-deploy-app.sh"
        log_success "Приложение развёрнуто"
        return
    fi
    
    # Если скрипт не найден, деплоим вручную
    log_info "Скрипт не найден, деплоим вручную..."
    
    # SSH ключ
    if [ ! -f /root/.ssh/id_rsa ] && [ ! -f /root/.ssh/id_ed25519 ]; then
        log_info "Создание SSH ключа..."
        mkdir -p /root/.ssh
        chmod 700 /root/.ssh
        ssh-keygen -t ed25519 -C "deploy@history-platform" -f /root/.ssh/id_ed25519 -N ""
        
        echo ""
        echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
        echo -e "${YELLOW}ВАЖНО: Добавьте этот SSH ключ в GitHub!${NC}"
        echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
        echo ""
        cat /root/.ssh/id_ed25519.pub
        echo ""
        echo "1. Скопируйте ключ выше"
        echo "2. Перейдите на https://github.com/settings/keys"
        echo "3. Нажмите 'New SSH key' и вставьте ключ"
        echo ""
        read -p "Нажмите Enter после добавления ключа в GitHub..."
    fi
    
    ssh-keyscan -t rsa github.com >> /root/.ssh/known_hosts 2>/dev/null || true
    
    # Клонирование
    if [ -d "$APP_DIR/.git" ]; then
        log_info "Обновление репозитория..."
        cd $APP_DIR
        git fetch origin && git reset --hard origin/$GIT_BRANCH && git pull origin $GIT_BRANCH
    else
        log_info "Клонирование репозитория..."
        mkdir -p $(dirname $APP_DIR)
        git clone -b $GIT_BRANCH $GIT_REPO $APP_DIR
    fi
    
    # Сервер
    log_info "Установка зависимостей сервера..."
    cd $APP_DIR/server
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    # Клиент
    log_info "Сборка клиента..."
    cd $APP_DIR/client
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    npm run build
    
    # Копирование клиента
    mkdir -p $STATIC_DIR
    cp -r $APP_DIR/client/dist/* $STATIC_DIR/
    
    # Переменные окружения
    log_info "Настройка переменных окружения..."
    JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
    
    if [ "$USE_DOMAIN" = true ]; then
        CORS_ORIGIN="https://$DOMAIN_NAME"
        API_URL="https://$DOMAIN_NAME/api"
    else
        CORS_ORIGIN="https://$SERVER_IP"
        API_URL="https://$SERVER_IP/api"
    fi
    
    cat > $APP_DIR/server/.env << EOF
# ==================== ОСНОВНЫЕ НАСТРОЙКИ ====================
NODE_ENV=production
PORT=5000

# ==================== БАЗА ДАННЫХ ====================
MONGODB_URI=mongodb://127.0.0.1:27017/repression-archive

# ==================== JWT ====================
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

# ==================== CORS ====================
CORS_ORIGIN=$CORS_ORIGIN

# ==================== СЕРВЕР ====================
SERVER_IP=$SERVER_IP
EOF
    
    chmod 600 $APP_DIR/server/.env
    
    # Client env
    cat > $APP_DIR/client/.env.production << EOF
VITE_API_URL=$API_URL
EOF
    
    # Seed базы данных
    log_info "Инициализация базы данных..."
    cd $APP_DIR/server
    if npm run seed 2>/dev/null; then
        log_success "База данных инициализирована"
    else
        log_warning "Скрипт seed не найден или завершился с ошибкой"
    fi
    
    # PM2
    log_info "Запуск через PM2..."
    cd $APP_DIR
    
    # Создаём ecosystem файл если его нет
    if [ ! -f "ecosystem.config.cjs" ]; then
        cat > ecosystem.config.cjs << EOF
module.exports = {
  apps: [
    {
      name: 'history-platform-api',
      cwd: '$APP_DIR/server',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      }
    }
  ]
};
EOF
    fi
    
    pm2 delete history-platform-api 2>/dev/null || true
    pm2 start ecosystem.config.cjs --env production
    pm2 save
    pm2 startup systemd -u root --hp /root || true
    
    log_success "Приложение развёрнуто"
}

# Шаг 3: Настройка Nginx
step_setup_nginx() {
    log_step "ШАГ 3: НАСТРОЙКА NGINX"
    
    # Используем скрипт настройки Nginx если он существует
    if [ -f "$SCRIPT_DIR/03-setup-nginx.sh" ]; then
        log_info "Запуск скрипта настройки Nginx..."
        chmod +x "$SCRIPT_DIR/03-setup-nginx.sh"
        # Передаём параметры через переменные окружения
        export SERVER_NAME
        bash "$SCRIPT_DIR/03-setup-nginx.sh"
        log_success "Nginx настроен"
        return
    fi
    
    log_warning "Скрипт настройки Nginx не найден"
    log_success "Nginx настроен"
}

# Шаг 4: Настройка SSL
step_setup_ssl() {
    log_step "ШАГ 4: НАСТРОЙКА SSL"
    
    # Используем скрипт настройки SSL если он существует
    if [ -f "$SCRIPT_DIR/04-setup-ssl.sh" ]; then
        log_info "Запуск скрипта настройки SSL..."
        chmod +x "$SCRIPT_DIR/04-setup-ssl.sh"
        bash "$SCRIPT_DIR/04-setup-ssl.sh"
        log_success "SSL настроен"
        return
    fi
    
    log_warning "Скрипт настройки SSL не найден"
    log_success "SSL настроен"
}

# Финальный отчёт
show_final_report() {
    echo ""
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                                                              ║"
    echo "║           ✅ ДЕПЛОЙ ЗАВЕРШЁН УСПЕШНО! ✅                     ║"
    echo "║                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    
    if [ "$USE_DOMAIN" = true ]; then
        echo "🌐 Сайт доступен: https://$DOMAIN_NAME"
        echo "🔌 API доступен: https://$DOMAIN_NAME/api"
    else
        echo "🌐 Сайт доступен: https://$SERVER_IP"
        echo "🔌 API доступен: https://$SERVER_IP/api"
        echo ""
        echo -e "${YELLOW}⚠️  Браузер покажет предупреждение о сертификате - это нормально${NC}"
    fi
    
    echo ""
    echo "📊 Полезные команды:"
    echo "   pm2 status                      - статус приложения"
    echo "   pm2 logs history-platform-api   - логи"
    echo "   pm2 restart history-platform-api - перезапуск"
    echo "   pm2 monit                       - мониторинг"
    echo ""
    echo "📁 Файлы:"
    echo "   Приложение: $APP_DIR"
    echo "   Статика:    $STATIC_DIR"
    echo "   Логи PM2:   /var/log/pm2/"
    echo "   Логи Nginx: /var/log/nginx/"
    echo ""
    
    echo "🔍 Тестирование:"
    if [ "$USE_DOMAIN" = true ]; then
        echo "   curl https://$DOMAIN_NAME/api/health"
    else
        echo "   curl -k https://$SERVER_IP/api/health"
    fi
    echo ""
    
    if [ "$USE_DOMAIN" = false ]; then
        echo "🔄 Для настройки домена позже:"
        echo "   1. Направьте DNS A-запись домена на $SERVER_IP"
        echo "   2. Запустите: sudo certbot --nginx -d your-domain.com"
        echo ""
    fi
    
    echo "============================================================"
}

# Главная функция
main() {
    check_root
    show_welcome
    collect_info
    step_install_deps
    step_deploy_app
    step_setup_nginx
    step_setup_ssl
    show_final_report
}

# Запуск
main "$@"