#!/bin/bash

# ============================================================
# History Platform - Настройка Nginx
# ============================================================
# Этот скрипт настраивает Nginx как reverse proxy
# для Node.js бэкенда и статического фронтенда
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
NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"
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
    
    # Если автоматическое определение не удалось, используем дефолтный IP
    if [ -z "$SERVER_IP" ] || [ "$SERVER_IP" = "" ]; then
        SERVER_IP="$DEFAULT_SERVER_IP"
    fi
    
    log_info "IP адрес сервера: $SERVER_IP"
}

# Запрос домена
get_domain() {
    echo ""
    echo "Выберите режим работы:"
    echo "1) Только по IP (без домена)"
    echo "2) С доменом"
    echo ""
    read -p "Ваш выбор (1 или 2): " DOMAIN_CHOICE
    
    if [ "$DOMAIN_CHOICE" = "2" ]; then
        read -p "Введите доменное имя (например: example.com): " DOMAIN_NAME
        if [ -z "$DOMAIN_NAME" ]; then
            log_warning "Домен не указан, используем IP"
            USE_DOMAIN=false
            SERVER_NAME=$SERVER_IP
        else
            USE_DOMAIN=true
            SERVER_NAME=$DOMAIN_NAME
        fi
    else
        USE_DOMAIN=false
        SERVER_NAME=$SERVER_IP
    fi
}

# Резервное копирование существующей конфигурации
backup_config() {
    if [ -f "$NGINX_AVAILABLE/$APP_NAME" ]; then
        cp "$NGINX_AVAILABLE/$APP_NAME" "$NGINX_AVAILABLE/$APP_NAME.backup.$(date +%Y%m%d_%H%M%S)"
        log_warning "Существующая конфигурация сохранена в резервную копию"
    fi
}

# Создание базовой конфигурации Nginx (HTTP)
create_nginx_config_http() {
    log_info "Создание конфигурации Nginx (HTTP)..."
    
    cat > $NGINX_AVAILABLE/$APP_NAME << EOF
# History Platform - Nginx Configuration
# Сгенерировано автоматически

# Rate limiting zone для API
limit_req_zone \$binary_remote_addr zone=api_limit:10m rate=10r/s;

# Upstream для Node.js бэкенда
upstream history_platform_backend {
    server 127.0.0.1:5000;
    keepalive 64;
}

# HTTP Server
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_NAME;

    # Корневая директория для статических файлов
    root $STATIC_DIR;
    index index.html;

    # Логи
    access_log /var/log/nginx/${APP_NAME}_access.log;
    error_log /var/log/nginx/${APP_NAME}_error.log;

    # Gzip сжатие
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss;
    gzip_comp_level 6;

    # Безопасность
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Максимальный размер тела запроса (для загрузки файлов)
    client_max_body_size 10M;

    # API запросы проксируем на бэкенд
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

    # Статические файлы с кэшированием
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    # Assets директория с кэшированием
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

    # SPA - все остальные запросы на index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Запрет доступа к скрытым файлам
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://history_platform_backend/api/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }
}
EOF

    log_success "Конфигурация HTTP создана"
}

# Создание конфигурации для SSL (подготовка)
create_nginx_config_ssl_ready() {
    log_info "Создание конфигурации для SSL..."
    
    cat > $NGINX_AVAILABLE/${APP_NAME}-ssl << EOF
# History Platform - Nginx Configuration with SSL
# Сгенерировано автоматически
# Активируйте после получения SSL сертификата

# Rate limiting zone для API
limit_req_zone \$binary_remote_addr zone=api_limit_ssl:10m rate=10r/s;

# Upstream для Node.js бэкенда
upstream history_platform_backend_ssl {
    server 127.0.0.1:5000;
    keepalive 64;
}

# Редирект HTTP -> HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_NAME;
    
    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://\$host\$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $SERVER_NAME;

    # SSL сертификаты (будут настроены certbot или вручную)
    ssl_certificate /etc/ssl/certs/${APP_NAME}.crt;
    ssl_certificate_key /etc/ssl/private/${APP_NAME}.key;

    # SSL настройки
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # Современные SSL протоколы
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Корневая директория
    root $STATIC_DIR;
    index index.html;

    # Логи
    access_log /var/log/nginx/${APP_NAME}_ssl_access.log;
    error_log /var/log/nginx/${APP_NAME}_ssl_error.log;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss;
    gzip_comp_level 6;

    # Безопасность
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' https:;" always;

    # Максимальный размер тела запроса
    client_max_body_size 10M;

    # API
    location /api {
        limit_req zone=api_limit_ssl burst=20 nodelay;
        
        proxy_pass http://history_platform_backend_ssl;
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

    # Статика
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

    # SPA
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Скрытые файлы
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Health check
    location /health {
        proxy_pass http://history_platform_backend_ssl/api/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }
}
EOF

    log_success "Конфигурация SSL создана (не активирована)"
}

# Активация конфигурации
enable_config() {
    log_info "Активация конфигурации..."
    
    # Удаляем дефолтный сайт если есть
    rm -f $NGINX_ENABLED/default
    
    # Удаляем старый симлинк если есть
    rm -f $NGINX_ENABLED/$APP_NAME
    
    # Создаём симлинк
    ln -sf $NGINX_AVAILABLE/$APP_NAME $NGINX_ENABLED/$APP_NAME
    
    log_success "Конфигурация активирована"
}

# Проверка конфигурации Nginx
test_nginx_config() {
    log_info "Проверка конфигурации Nginx..."
    
    if nginx -t; then
        log_success "Конфигурация корректна"
    else
        log_error "Ошибка в конфигурации Nginx"
        exit 1
    fi
}

# Перезапуск Nginx
restart_nginx() {
    log_info "Перезапуск Nginx..."
    
    systemctl reload nginx
    
    log_success "Nginx перезапущен"
}

# Создание директории для certbot
create_certbot_dir() {
    mkdir -p /var/www/certbot
    chown -R www-data:www-data /var/www/certbot
    log_success "Директория certbot создана"
}

# Вывод информации
print_info() {
    echo ""
    echo "============================================================"
    echo -e "${GREEN}Nginx настроен успешно!${NC}"
    echo "============================================================"
    echo ""
    echo "Сайт доступен по адресу:"
    echo "  http://$SERVER_NAME"
    echo ""
    if [ "$USE_DOMAIN" = true ]; then
        echo "Для настройки SSL выполните:"
        echo "  sudo ./04-setup-ssl.sh"
        echo ""
        echo "Или используйте certbot напрямую:"
        echo "  sudo certbot --nginx -d $SERVER_NAME"
    else
        echo "Для настройки SSL по IP выполните:"
        echo "  sudo ./04-setup-ssl.sh"
        echo ""
        echo "Будет создан самоподписанный сертификат."
    fi
    echo ""
    echo "Файлы конфигурации:"
    echo "  HTTP: $NGINX_AVAILABLE/$APP_NAME"
    echo "  SSL:  $NGINX_AVAILABLE/${APP_NAME}-ssl"
    echo ""
    echo "Логи:"
    echo "  Access: /var/log/nginx/${APP_NAME}_access.log"
    echo "  Error:  /var/log/nginx/${APP_NAME}_error.log"
    echo ""
    echo "Тестирование API:"
    echo "  curl http://$SERVER_NAME/api/health"
    echo ""
    echo "Статус Nginx:"
    systemctl status nginx --no-pager | head -n 5
    echo "============================================================"
}

# Главная функция
main() {
    echo "============================================================"
    echo "History Platform - Настройка Nginx"
    echo "============================================================"
    echo ""
    
    check_root
    get_server_ip
    get_domain
    backup_config
    create_nginx_config_http
    create_nginx_config_ssl_ready
    enable_config
    create_certbot_dir
    test_nginx_config
    restart_nginx
    
    print_info
}

# Запуск
main "$@"