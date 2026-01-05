#!/bin/bash

# ============================================================
# History Platform - Настройка домена karagandymemory.kz
# ============================================================
# Автоматическая настройка домена karagandymemory.kz
# с поддержкой www поддомена и Let's Encrypt SSL
# ============================================================

set -e

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Конфигурация
APP_NAME="history-platform"
APP_DIR="/var/www/history-platform"
STATIC_DIR="/var/www/html/history-platform"
DOMAIN_NAME="karagandymemory.kz"
WWW_DOMAIN="www.karagandymemory.kz"
DEFAULT_SERVER_IP="34.51.218.216"

# Функции логирования
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Проверка root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Этот скрипт должен быть запущен с правами root (sudo)"
        exit 1
    fi
}

# Получение IP адреса
get_server_ip() {
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "$DEFAULT_SERVER_IP")
    
    if [ -z "$SERVER_IP" ] || [ "$SERVER_IP" = "" ]; then
        SERVER_IP="$DEFAULT_SERVER_IP"
    fi
    
    log_info "IP адрес сервера: $SERVER_IP"
}

# Запрос email для SSL
get_email() {
    if [ -z "$CERT_EMAIL" ]; then
        echo ""
        read -p "Введите email для Let's Encrypt сертификата: " CERT_EMAIL
        
        if [ -z "$CERT_EMAIL" ]; then
            log_error "Email обязателен для получения SSL сертификата"
            exit 1
        fi
    fi
    
    log_info "Email для SSL: $CERT_EMAIL"
}

# Проверка DNS
check_dns() {
    log_info "Проверка DNS записей..."
    
    if ! command -v dig &> /dev/null; then
        log_warning "dig не установлен, пропускаем проверку DNS"
        log_info "Установите: apt-get install dnsutils"
        return
    fi
    
    DOMAIN_IP=$(dig +short $DOMAIN_NAME | head -n 1)
    WWW_IP=$(dig +short $WWW_DOMAIN | head -n 1)
    
    if [ "$DOMAIN_IP" = "$SERVER_IP" ] && [ "$WWW_IP" = "$SERVER_IP" ]; then
        log_success "DNS записи корректно настроены"
        log_info "$DOMAIN_NAME -> $DOMAIN_IP"
        log_info "$WWW_DOMAIN -> $WWW_IP"
    else
        log_warning "DNS записи могут быть не настроены полностью!"
        log_warning "$DOMAIN_NAME -> $DOMAIN_IP (ожидается: $SERVER_IP)"
        log_warning "$WWW_DOMAIN -> $WWW_IP (ожидается: $SERVER_IP)"
        echo ""
        echo "Убедитесь что DNS записи настроены:"
        echo "  A    @    $SERVER_IP"
        echo "  A    www  $SERVER_IP"
        echo ""
        read -p "Продолжить? (y/n): " CONTINUE
        if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
            exit 1
        fi
    fi
}

# Обновление конфигурации Nginx
update_nginx_config() {
    log_info "Обновление конфигурации Nginx..."
    
    # Создаём резервную копию
    if [ -f "/etc/nginx/sites-available/$APP_NAME" ]; then
        cp /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-available/$APP_NAME.backup.$(date +%Y%m%d_%H%M%S)
    fi
    
    cat > /etc/nginx/sites-available/$APP_NAME << EOF
# History Platform - Nginx Configuration
# Domain: $DOMAIN_NAME, $WWW_DOMAIN
# Server IP: $SERVER_IP

# Rate limiting zone для API
limit_req_zone \$binary_remote_addr zone=api_limit:10m rate=10r/s;

# Upstream для Node.js бэкенда
upstream history_platform_backend {
    server 127.0.0.1:5000;
    keepalive 64;
}

# Редирект IP на домен
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_IP;
    return 301 http://$DOMAIN_NAME\$request_uri;
}

# HTTP Server (будет обновлён Certbot для HTTPS)
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN_NAME $WWW_DOMAIN;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Безопасность
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Максимальный размер тела запроса
    client_max_body_size 10M;

    # Gzip сжатие
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss;
    gzip_comp_level 6;

    # Корневая директория
    root $STATIC_DIR;
    index index.html;

    # API proxy
    location /api {
        limit_req zone=api_limit burst=20 nodelay;
        
        proxy_pass http://history_platform_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Статические файлы
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    # Assets директория
    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    # Favicon
    location = /favicon.ico {
        log_not_found off;
        access_log off;
    }

    # Robots.txt
    location = /robots.txt {
        log_not_found off;
        access_log off;
    }

    # SPA fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Запрет доступа к скрытым файлам
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Логи
    access_log /var/log/nginx/${APP_NAME}_access.log;
    error_log /var/log/nginx/${APP_NAME}_error.log;
}
EOF

    # Проверка и перезагрузка
    if nginx -t; then
        systemctl reload nginx
        log_success "Конфигурация Nginx обновлена"
    else
        log_error "Ошибка в конфигурации Nginx"
        exit 1
    fi
}

# Получение SSL сертификата
get_ssl_certificate() {
    log_info "Получение Let's Encrypt сертификата для $DOMAIN_NAME и $WWW_DOMAIN..."
    
    # Проверяем что certbot установлен
    if ! command -v certbot &> /dev/null; then
        log_error "Certbot не установлен. Установите: apt-get install certbot python3-certbot-nginx"
        exit 1
    fi
    
    # Создаём директорию для certbot если её нет
    mkdir -p /var/www/certbot
    chown -R www-data:www-data /var/www/certbot
    
    # Получаем сертификат для обоих доменов
    certbot --nginx \
        -d $DOMAIN_NAME \
        -d $WWW_DOMAIN \
        --email $CERT_EMAIL \
        --agree-tos \
        --no-eff-email \
        --redirect \
        --non-interactive
    
    if [ $? -eq 0 ]; then
        log_success "Let's Encrypt сертификат установлен"
    else
        log_error "Ошибка при получении сертификата"
        exit 1
    fi
}

# Обновление конфигурации приложения
update_app_config() {
    log_info "Обновление конфигурации приложения..."
    
    # Обновляем server .env
    if [ -f "$APP_DIR/server/.env" ]; then
        # Обновляем CORS_ORIGIN
        sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=https://$DOMAIN_NAME|g" "$APP_DIR/server/.env"
        
        # Добавляем домен в env если его нет
        if grep -q "DOMAIN=" "$APP_DIR/server/.env"; then
            sed -i "s|DOMAIN=.*|DOMAIN=$DOMAIN_NAME|g" "$APP_DIR/server/.env"
        else
            echo "DOMAIN=$DOMAIN_NAME" >> "$APP_DIR/server/.env"
        fi
        
        log_success "Server .env обновлён"
    else
        log_warning "Файл $APP_DIR/server/.env не найден"
    fi
    
    # Обновляем client .env.production
    if [ -f "$APP_DIR/client/.env.production" ]; then
        sed -i "s|VITE_API_URL=.*|VITE_API_URL=https://$DOMAIN_NAME/api|g" "$APP_DIR/client/.env.production"
        log_success "Client .env.production обновлён"
    else
        log_warning "Файл $APP_DIR/client/.env.production не найден"
    fi
}

# Пересборка клиента
rebuild_client() {
    log_info "Пересборка клиента с новой конфигурацией..."
    
    if [ ! -d "$APP_DIR/client" ]; then
        log_warning "Директория клиента не найдена, пропускаем пересборку"
        return
    fi
    
    cd "$APP_DIR/client"
    npm run build
    
    # Копируем собранные файлы
    mkdir -p $STATIC_DIR
    cp -r dist/* $STATIC_DIR/
    
    log_success "Клиент пересобран"
}

# Перезапуск приложения
restart_app() {
    log_info "Перезапуск приложения..."
    
    if command -v pm2 &> /dev/null; then
        pm2 restart history-platform-api 2>/dev/null || pm2 restart all
        log_success "Приложение перезапущено"
    else
        log_warning "PM2 не найден, пропускаем перезапуск"
    fi
}

# Настройка автообновления сертификата
setup_cert_renewal() {
    log_info "Настройка автообновления сертификата..."
    
    # Тестовый запуск обновления
    certbot renew --dry-run 2>/dev/null || log_warning "Тестовый запуск обновления завершился с ошибкой"
    
    # Добавляем cron задачу если её нет
    if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
        (crontab -l 2>/dev/null; echo "0 3 * * * /usr/bin/certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -
        log_success "Автообновление настроено (каждый день в 3:00)"
    else
        log_info "Автообновление уже настроено"
    fi
}

# Очистка старых самоподписанных сертификатов
cleanup_old_certs() {
    if [ -d "/etc/ssl/history-platform" ]; then
        log_info "Очистка старых самоподписанных сертификатов..."
        rm -rf /etc/ssl/history-platform
        log_success "Старые сертификаты удалены"
    fi
}

# Вывод итоговой информации
print_summary() {
    echo ""
    echo "============================================================"
    echo -e "${GREEN}Домен настроен успешно!${NC}"
    echo "============================================================"
    echo ""
    echo "🌐 Основной домен: https://$DOMAIN_NAME"
    echo "🌐 С www:         https://$WWW_DOMAIN"
    echo "🔌 API:           https://$DOMAIN_NAME/api"
    echo ""
    echo "SSL сертификат будет автоматически обновляться."
    echo ""
    echo "Полезные команды:"
    echo "  certbot certificates          - просмотр сертификатов"
    echo "  certbot renew                 - обновление сертификатов"
    echo "  certbot renew --dry-run       - тестовое обновление"
    echo ""
    echo "Тестирование:"
    echo "  curl https://$DOMAIN_NAME/api/health"
    echo ""
    echo "============================================================"
}

# Главная функция
main() {
    echo "============================================================"
    echo "History Platform - Настройка домена karagandymemory.kz"
    echo "============================================================"
    echo ""
    
    check_root
    get_server_ip
    
    # Проверяем передан ли email через переменную окружения
    if [ -z "$CERT_EMAIL" ]; then
        get_email
    else
        log_info "Email для SSL: $CERT_EMAIL (из переменной окружения)"
    fi
    
    check_dns
    update_nginx_config
    get_ssl_certificate
    update_app_config
    rebuild_client
    restart_app
    setup_cert_renewal
    cleanup_old_certs
    
    print_summary
}

# Запуск
main "$@"
