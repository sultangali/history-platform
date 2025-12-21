#!/bin/bash

# ============================================================
# History Platform - Настройка SSL
# ============================================================
# Этот скрипт настраивает SSL сертификаты:
# - Самоподписанный сертификат (для IP)
# - Let's Encrypt (для домена)
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
SSL_DIR="/etc/ssl"
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

# Выбор типа SSL
select_ssl_type() {
    echo ""
    echo "Выберите тип SSL сертификата:"
    echo "1) Самоподписанный (для IP адреса)"
    echo "2) Let's Encrypt (для домена)"
    echo ""
    read -p "Ваш выбор (1 или 2): " SSL_CHOICE
}

# Создание самоподписанного сертификата
create_self_signed_cert() {
    log_info "Создание самоподписанного SSL сертификата..."
    
    # Создаём директории
    mkdir -p $SSL_DIR/certs
    mkdir -p $SSL_DIR/private
    
    # Создаём конфигурацию OpenSSL с Subject Alternative Names
    OPENSSL_CNF="/tmp/${APP_NAME}_openssl.cnf"
    cat > $OPENSSL_CNF << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_req

[dn]
C = KZ
ST = Almaty
L = Almaty
O = History Platform
OU = IT Department
CN = $SERVER_IP

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
IP.1 = $SERVER_IP
DNS.1 = localhost
EOF
    
    # Генерируем приватный ключ и сертификат
    openssl req -x509 -nodes -days 365 \
        -newkey rsa:2048 \
        -keyout $SSL_DIR/private/${APP_NAME}.key \
        -out $SSL_DIR/certs/${APP_NAME}.crt \
        -config $OPENSSL_CNF
    
    # Устанавливаем права
    chmod 600 $SSL_DIR/private/${APP_NAME}.key
    chmod 644 $SSL_DIR/certs/${APP_NAME}.crt
    
    # Генерируем DH параметры (если еще не существуют)
    if [ ! -f $SSL_DIR/certs/${APP_NAME}_dhparam.pem ]; then
        log_info "Генерация DH параметров (это может занять время)..."
        openssl dhparam -out $SSL_DIR/certs/${APP_NAME}_dhparam.pem 2048
        log_success "DH параметры созданы"
    else
        log_info "DH параметры уже существуют"
    fi
    
    # Удаляем временный файл
    rm -f $OPENSSL_CNF
    
    log_success "Самоподписанный сертификат создан"
    
    # Активируем SSL конфигурацию
    activate_ssl_config_self_signed
}

# Получение Let's Encrypt сертификата
get_letsencrypt_cert() {
    read -p "Введите доменное имя: " DOMAIN_NAME
    read -p "Введите email для уведомлений: " CERT_EMAIL
    
    if [ -z "$DOMAIN_NAME" ] || [ -z "$CERT_EMAIL" ]; then
        log_error "Домен и email обязательны"
        exit 1
    fi
    
    log_info "Получение сертификата Let's Encrypt для $DOMAIN_NAME..."
    
    # Проверяем что домен указывает на этот сервер
    if command -v dig &> /dev/null; then
        DOMAIN_IP=$(dig +short $DOMAIN_NAME | tail -n1)
        
        if [ "$DOMAIN_IP" != "$SERVER_IP" ]; then
            log_warning "DNS записи могут быть не настроены!"
            log_warning "Домен $DOMAIN_NAME -> $DOMAIN_IP"
            log_warning "Сервер IP: $SERVER_IP"
            read -p "Продолжить? (y/n): " CONTINUE
            if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
                exit 1
            fi
        fi
    else
        log_warning "dig не установлен, пропускаем проверку DNS"
    fi
    
    # Проверяем что certbot установлен
    if ! command -v certbot &> /dev/null; then
        log_error "Certbot не установлен. Установите его: apt-get install certbot python3-certbot-nginx"
        exit 1
    fi
    
    # Получаем сертификат
    certbot --nginx -d $DOMAIN_NAME --email $CERT_EMAIL --agree-tos --non-interactive --redirect
    
    # Обновляем конфигурацию сервера
    update_server_config $DOMAIN_NAME
    
    log_success "Let's Encrypt сертификат получен"
    
    # Настраиваем автообновление
    setup_cert_renewal
}

# Активация SSL конфигурации для самоподписанного сертификата
activate_ssl_config_self_signed() {
    log_info "Активация SSL конфигурации..."
    
    # Обновляем существующую конфигурацию или используем SSL шаблон
    if [ -f "$NGINX_AVAILABLE/${APP_NAME}-ssl" ]; then
        # Используем готовый SSL шаблон
        cp $NGINX_AVAILABLE/${APP_NAME}-ssl $NGINX_AVAILABLE/${APP_NAME}
        
        # Обновляем пути к сертификатам
        sed -i "s|ssl_certificate /etc/ssl/certs/${APP_NAME}.crt;|ssl_certificate $SSL_DIR/certs/${APP_NAME}.crt;|g" $NGINX_AVAILABLE/${APP_NAME}
        sed -i "s|ssl_certificate_key /etc/ssl/private/${APP_NAME}.key;|ssl_certificate_key $SSL_DIR/private/${APP_NAME}.key;|g" $NGINX_AVAILABLE/${APP_NAME}
        
        # Добавляем dhparam если существует
        if [ -f "$SSL_DIR/certs/${APP_NAME}_dhparam.pem" ]; then
            if ! grep -q "ssl_dhparam" $NGINX_AVAILABLE/${APP_NAME}; then
                sed -i "/ssl_certificate_key/a\    ssl_dhparam $SSL_DIR/certs/${APP_NAME}_dhparam.pem;" $NGINX_AVAILABLE/${APP_NAME}
            fi
        fi
    else
        # Создаём новую конфигурацию с SSL
        create_nginx_ssl_config
    fi
    
    # Заменяем server_name на IP в HTTP блоке
    sed -i "s|server_name .*;|server_name $SERVER_IP;|g" $NGINX_AVAILABLE/${APP_NAME}
    
    # В HTTPS блоке также обновляем server_name
    sed -i "/listen 443/,/server_name/ s|server_name .*;|server_name $SERVER_IP;|" $NGINX_AVAILABLE/${APP_NAME}
    
    # Деактивируем старую конфигурацию если есть
    rm -f $NGINX_ENABLED/$APP_NAME
    rm -f $NGINX_ENABLED/${APP_NAME}-ssl
    
    # Активируем новую конфигурацию
    ln -sf $NGINX_AVAILABLE/${APP_NAME} $NGINX_ENABLED/${APP_NAME}
    
    # Проверяем и перезапускаем
    if nginx -t; then
        systemctl reload nginx
        log_success "SSL конфигурация активирована"
    else
        log_error "Ошибка в конфигурации Nginx"
        exit 1
    fi
}

# Создание Nginx конфигурации с SSL
create_nginx_ssl_config() {
    log_info "Создание Nginx конфигурации с SSL..."
    
    cat > $NGINX_AVAILABLE/${APP_NAME} << EOF
# History Platform - Nginx Configuration with SSL
# Server IP: $SERVER_IP

# Rate limiting zone для API
limit_req_zone \$binary_remote_addr zone=api_limit:10m rate=10r/s;

# Upstream для Node.js бэкенда
upstream history_platform_backend {
    server 127.0.0.1:5000;
    keepalive 64;
}

# HTTP Server - Редирект на HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name $SERVER_IP;

    # Редирект всех HTTP запросов на HTTPS
    return 301 https://\$host\$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $SERVER_IP;

    # SSL Configuration
    ssl_certificate $SSL_DIR/certs/${APP_NAME}.crt;
    ssl_certificate_key $SSL_DIR/private/${APP_NAME}.key;
    ssl_dhparam $SSL_DIR/certs/${APP_NAME}_dhparam.pem;

    # SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_session_cache shared:SSL:50m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # HSTS отключен для самоподписанного сертификата
    # add_header Strict-Transport-Security "max-age=63072000" always;

    # Корневая директория
    root $STATIC_DIR;
    index index.html;

    # Логи
    access_log /var/log/nginx/${APP_NAME}_access.log;
    error_log /var/log/nginx/${APP_NAME}_error.log;

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

    # Максимальный размер тела запроса
    client_max_body_size 10M;

    # API
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
        proxy_pass http://history_platform_backend/api/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }
}
EOF
}

# Обновление конфигурации сервера
update_server_config() {
    local DOMAIN=$1
    
    log_info "Обновление конфигурации приложения..."
    
    # Обновляем CORS_ORIGIN в .env
    ENV_FILE="$APP_DIR/server/.env"
    if [ -f "$ENV_FILE" ]; then
        sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=https://$DOMAIN|g" $ENV_FILE
        log_success "Server .env обновлён"
    fi
    
    # Обновляем VITE_API_URL в client/.env.production
    CLIENT_ENV_FILE="$APP_DIR/client/.env.production"
    if [ -f "$CLIENT_ENV_FILE" ]; then
        sed -i "s|VITE_API_URL=.*|VITE_API_URL=https://$DOMAIN/api|g" $CLIENT_ENV_FILE
        
        # Пересобираем клиент
        log_info "Пересборка клиента с HTTPS конфигурацией..."
        cd "$APP_DIR/client"
        npm run build
        cp -r dist/* $STATIC_DIR/
        log_success "Клиент пересобран"
    fi
    
    # Перезапускаем приложение
    if command -v pm2 &> /dev/null; then
        pm2 restart history-platform-api 2>/dev/null || pm2 restart all
        log_success "PM2 процессы перезапущены"
    fi
}

# Обновление конфигурации для самоподписанного сертификата
update_server_config_self_signed() {
    log_info "Обновление конфигурации приложения для HTTPS..."
    
    # Обновляем CORS_ORIGIN в .env
    ENV_FILE="$APP_DIR/server/.env"
    if [ -f "$ENV_FILE" ]; then
        sed -i "s|CORS_ORIGIN=http://|CORS_ORIGIN=https://|g" $ENV_FILE
        log_success "Server .env обновлён"
    fi
    
    # Обновляем VITE_API_URL в client/.env.production
    CLIENT_ENV_FILE="$APP_DIR/client/.env.production"
    if [ -f "$CLIENT_ENV_FILE" ]; then
        sed -i "s|VITE_API_URL=http://|VITE_API_URL=https://|g" $CLIENT_ENV_FILE
        
        # Пересобираем клиент
        log_info "Пересборка клиента с HTTPS конфигурацией..."
        cd "$APP_DIR/client"
        npm run build
        cp -r dist/* $STATIC_DIR/
        log_success "Клиент пересобран"
    fi
    
    # Перезапускаем приложение
    if command -v pm2 &> /dev/null; then
        pm2 restart history-platform-api 2>/dev/null || pm2 restart all
        log_success "PM2 процессы перезапущены"
    fi
}

# Настройка автообновления сертификата
setup_cert_renewal() {
    log_info "Настройка автообновления сертификата..."
    
    # Проверяем что cron задача существует
    if ! crontab -l 2>/dev/null | grep -q "certbot renew"; then
        # Добавляем cron задачу
        (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet && systemctl reload nginx") | crontab -
        log_success "Автообновление настроено (каждый день в 12:00)"
    else
        log_info "Автообновление уже настроено"
    fi
}

# Проверка SSL
test_ssl() {
    log_info "Проверка SSL..."
    
    if [ "$SSL_CHOICE" = "1" ]; then
        # Самоподписанный
        if curl -k -s https://$SERVER_IP/api/health > /dev/null 2>&1; then
            log_success "SSL работает (самоподписанный)"
        else
            log_warning "Не удалось подключиться по HTTPS"
        fi
    else
        # Let's Encrypt
        if curl -s https://$DOMAIN_NAME/api/health > /dev/null 2>&1; then
            log_success "SSL работает (Let's Encrypt)"
        else
            log_warning "Не удалось подключиться по HTTPS"
        fi
    fi
}

# Вывод информации
print_info() {
    echo ""
    echo "============================================================"
    echo -e "${GREEN}SSL настроен успешно!${NC}"
    echo "============================================================"
    echo ""
    
    if [ "$SSL_CHOICE" = "1" ]; then
        echo "Тип: Самоподписанный сертификат"
        echo "Адрес: https://$SERVER_IP"
        echo ""
        echo -e "${YELLOW}ВНИМАНИЕ: Браузер покажет предупреждение о небезопасном сертификате.${NC}"
        echo "Это нормально для самоподписанных сертификатов."
        echo ""
        echo "Файлы сертификата:"
        echo "  Сертификат: $SSL_DIR/certs/${APP_NAME}.crt"
        echo "  Ключ:       $SSL_DIR/private/${APP_NAME}.key"
        echo "  DH параметры: $SSL_DIR/certs/${APP_NAME}_dhparam.pem"
        echo ""
        echo "Информация о сертификате:"
        openssl x509 -in $SSL_DIR/certs/${APP_NAME}.crt -noout -dates 2>/dev/null || true
    else
        echo "Тип: Let's Encrypt"
        echo "Домен: $DOMAIN_NAME"
        echo "Адрес: https://$DOMAIN_NAME"
        echo ""
        echo "Сертификат будет автоматически обновляться."
        echo ""
        echo "Для ручного обновления:"
        echo "  sudo certbot renew"
    fi
    echo ""
    echo "Тестирование API:"
    if [ "$SSL_CHOICE" = "1" ]; then
        echo "  curl -k https://$SERVER_IP/api/health"
    else
        echo "  curl https://$DOMAIN_NAME/api/health"
    fi
    echo ""
    echo "============================================================"
}

# Главная функция
main() {
    echo "============================================================"
    echo "History Platform - Настройка SSL"
    echo "============================================================"
    echo ""
    
    check_root
    get_server_ip
    select_ssl_type
    
    case $SSL_CHOICE in
        1)
            create_self_signed_cert
            update_server_config_self_signed
            ;;
        2)
            get_letsencrypt_cert
            ;;
        *)
            log_error "Неверный выбор"
            exit 1
            ;;
    esac
    
    test_ssl
    print_info
}

# Запуск
main "$@"