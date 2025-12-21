#!/bin/bash

# ============================================================
# History Platform - Скрипт установки зависимостей для VPS
# ============================================================
# Этот скрипт устанавливает все необходимые компоненты:
# - MongoDB
# - Node.js (LTS)
# - Nginx
# - PM2
# - Certbot (Let's Encrypt)
# - Git, Nano, и другие утилиты
# ============================================================

set -e  # Остановка при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка root прав
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Этот скрипт должен быть запущен с правами root (sudo)"
        exit 1
    fi
}

# Определение ОС
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        VERSION=$VERSION_ID
    else
        log_error "Не удалось определить ОС"
        exit 1
    fi
    log_info "Обнаружена ОС: $OS $VERSION"
}

# Обновление системы
update_system() {
    log_info "Обновление системы..."
    
    case $OS in
        ubuntu|debian)
            apt-get update -y
            apt-get upgrade -y
            ;;
        centos|rhel|fedora)
            yum update -y
            ;;
        *)
            log_warning "Неизвестная ОС, пропуск обновления"
            ;;
    esac
    
    log_success "Система обновлена"
}

# Установка базовых утилит
install_base_utils() {
    log_info "Установка базовых утилит..."
    
    case $OS in
        ubuntu|debian)
            apt-get install -y \
                curl \
                wget \
                nano \
                vim \
                git \
                htop \
                ufw \
                gnupg \
                lsb-release \
                ca-certificates \
                apt-transport-https \
                software-properties-common \
                build-essential
            ;;
        centos|rhel|fedora)
            yum install -y \
                curl \
                wget \
                nano \
                vim \
                git \
                htop \
                firewalld \
                gnupg2 \
                ca-certificates
            ;;
    esac
    
    log_success "Базовые утилиты установлены"
}

# Проверка и установка MongoDB
install_mongodb() {
    log_info "Проверка MongoDB..."
    
    if command -v mongod &> /dev/null; then
        MONGO_VERSION=$(mongod --version | head -n 1)
        log_success "MongoDB уже установлен: $MONGO_VERSION"
        return
    fi
    
    log_info "Установка MongoDB..."
    
    case $OS in
        ubuntu|debian)
            # Импорт GPG ключа MongoDB
            if [ -f /usr/share/keyrings/mongodb-server-7.0.gpg ]; then
                log_warning "GPG ключ MongoDB уже существует, перезаписываем..."
            fi
            curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
                gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg
            
            # Определяем коднейм для репозитория MongoDB
            # MongoDB поддерживает только LTS версии Ubuntu, используем jammy (22.04) для новых версий
            UBUNTU_CODENAME=$(lsb_release -cs)
            case $UBUNTU_CODENAME in
                jammy|focal|bionic)
                    # Эти версии поддерживаются MongoDB
                    MONGO_CODENAME=$UBUNTU_CODENAME
                    ;;
                *)
                    # Для новых версий используем jammy (последняя LTS)
                    log_warning "Ubuntu $UBUNTU_CODENAME не поддерживается MongoDB официально"
                    log_info "Используем репозиторий для jammy (Ubuntu 22.04 LTS)"
                    MONGO_CODENAME="jammy"
                    ;;
            esac
            
            # Добавление репозитория
            echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu $MONGO_CODENAME/mongodb-org/7.0 multiverse" | \
                tee /etc/apt/sources.list.d/mongodb-org-7.0.list
            
            apt-get update
            apt-get install -y mongodb-org
            ;;
        centos|rhel|fedora)
            cat > /etc/yum.repos.d/mongodb-org-7.0.repo << EOF
[mongodb-org-7.0]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/\$releasever/mongodb-org/7.0/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-7.0.asc
EOF
            yum install -y mongodb-org
            ;;
    esac
    
    # Запуск и автозапуск MongoDB
    systemctl start mongod
    systemctl enable mongod
    
    log_success "MongoDB установлен и запущен"
}

# Проверка и установка Node.js
install_nodejs() {
    log_info "Проверка Node.js..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log_success "Node.js уже установлен: $NODE_VERSION"
        
        # Проверяем версию (нужна 18+)
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | tr -d 'v')
        if [ "$NODE_MAJOR" -lt 18 ]; then
            log_warning "Версия Node.js слишком старая, обновляем..."
        else
            return
        fi
    fi
    
    log_info "Установка Node.js 20 LTS..."
    
    case $OS in
        ubuntu|debian)
            # Установка через NodeSource
            curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
            apt-get install -y nodejs
            ;;
        centos|rhel|fedora)
            curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
            yum install -y nodejs
            ;;
    esac
    
    # Проверка установки
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    
    log_success "Node.js установлен: $NODE_VERSION"
    log_success "npm установлен: $NPM_VERSION"
}

# Проверка и установка PM2
install_pm2() {
    log_info "Проверка PM2..."
    
    if command -v pm2 &> /dev/null; then
        PM2_VERSION=$(pm2 --version)
        log_success "PM2 уже установлен: $PM2_VERSION"
        return
    fi
    
    log_info "Установка PM2..."
    npm install -g pm2
    
    # Настройка автозапуска PM2
    if [ -n "$SUDO_USER" ]; then
        pm2 startup systemd -u $SUDO_USER --hp /home/$SUDO_USER
    else
        pm2 startup systemd -u root --hp /root
    fi
    
    log_success "PM2 установлен"
}

# Проверка и установка Nginx
install_nginx() {
    log_info "Проверка Nginx..."
    
    if command -v nginx &> /dev/null; then
        NGINX_VERSION=$(nginx -v 2>&1)
        log_success "Nginx уже установлен: $NGINX_VERSION"
        return
    fi
    
    log_info "Установка Nginx..."
    
    case $OS in
        ubuntu|debian)
            apt-get install -y nginx
            ;;
        centos|rhel|fedora)
            yum install -y nginx
            ;;
    esac
    
    # Запуск и автозапуск Nginx
    systemctl start nginx
    systemctl enable nginx
    
    log_success "Nginx установлен и запущен"
}

# Проверка и установка Certbot
install_certbot() {
    log_info "Проверка Certbot..."
    
    if command -v certbot &> /dev/null; then
        CERTBOT_VERSION=$(certbot --version 2>&1)
        log_success "Certbot уже установлен: $CERTBOT_VERSION"
        return
    fi
    
    log_info "Установка Certbot..."
    
    case $OS in
        ubuntu|debian)
            apt-get install -y certbot python3-certbot-nginx
            ;;
        centos|rhel|fedora)
            yum install -y certbot python3-certbot-nginx
            ;;
    esac
    
    log_success "Certbot установлен"
}

# Настройка файрвола
configure_firewall() {
    log_info "Настройка файрвола..."
    
    case $OS in
        ubuntu|debian)
            # UFW
            ufw --force reset
            ufw default deny incoming
            ufw default allow outgoing
            ufw allow ssh
            ufw allow 'Nginx Full'
            ufw allow 80/tcp
            ufw allow 443/tcp
            # MongoDB только локально
            # ufw allow 27017/tcp  # Раскомментируйте при необходимости внешнего доступа
            ufw --force enable
            ;;
        centos|rhel|fedora)
            # Firewalld
            systemctl start firewalld
            systemctl enable firewalld
            firewall-cmd --permanent --add-service=ssh
            firewall-cmd --permanent --add-service=http
            firewall-cmd --permanent --add-service=https
            firewall-cmd --reload
            ;;
    esac
    
    log_success "Файрвол настроен"
}

# Создание пользователя для приложения (опционально)
create_app_user() {
    APP_USER="historyplatform"
    
    if id "$APP_USER" &>/dev/null; then
        log_info "Пользователь $APP_USER уже существует"
        return
    fi
    
    log_info "Создание пользователя $APP_USER..."
    useradd -m -s /bin/bash $APP_USER
    usermod -aG sudo $APP_USER
    
    log_success "Пользователь $APP_USER создан"
}

# Создание директории для приложения
create_app_directory() {
    APP_DIR="/var/www/history-platform"
    
    log_info "Создание директории приложения: $APP_DIR"
    
    if [ ! -d "$APP_DIR" ]; then
        mkdir -p $APP_DIR
        if [ -n "$SUDO_USER" ]; then
            chown -R $SUDO_USER:$SUDO_USER $APP_DIR
        fi
        chmod -R 755 $APP_DIR
        log_success "Директория создана: $APP_DIR"
    else
        log_warning "Директория уже существует: $APP_DIR"
    fi
}

# Вывод итоговой информации
print_summary() {
    echo ""
    echo "============================================================"
    echo -e "${GREEN}Установка завершена успешно!${NC}"
    echo "============================================================"
    echo ""
    echo "Установленные компоненты:"
    echo "  - MongoDB:  $(mongod --version 2>/dev/null | head -n 1 || echo 'не установлен')"
    echo "  - Node.js:  $(node --version 2>/dev/null || echo 'не установлен')"
    echo "  - npm:      $(npm --version 2>/dev/null || echo 'не установлен')"
    echo "  - PM2:      $(pm2 --version 2>/dev/null || echo 'не установлен')"
    echo "  - Nginx:    $(nginx -v 2>&1 | cut -d'/' -f2 || echo 'не установлен')"
    echo "  - Certbot:  $(certbot --version 2>&1 | cut -d' ' -f2 || echo 'не установлен')"
    echo "  - Git:      $(git --version 2>/dev/null || echo 'не установлен')"
    echo ""
    echo "Директория приложения: /var/www/history-platform"
    echo ""
    echo "Статус файрвола:"
    case $OS in
        ubuntu|debian)
            ufw status
            ;;
        centos|rhel|fedora)
            firewall-cmd --list-all
            ;;
    esac
    echo ""
    echo "Статус MongoDB:"
    systemctl status mongod --no-pager | head -n 5
    echo ""
    echo "Статус Nginx:"
    systemctl status nginx --no-pager | head -n 5
    echo ""
    echo "Следующий шаг: запустите скрипт 02-deploy-app.sh"
    echo "============================================================"
}

# Главная функция
main() {
    echo "============================================================"
    echo "History Platform - Установка зависимостей для VPS"
    echo "============================================================"
    echo ""
    
    check_root
    detect_os
    update_system
    install_base_utils
    install_mongodb
    install_nodejs
    install_pm2
    install_nginx
    install_certbot
    configure_firewall
    create_app_directory
    
    print_summary
}

# Запуск
main "$@"