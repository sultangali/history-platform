#!/bin/bash

# ============================================================
# History Platform - Исправление проблемы с основным доменом
# ============================================================
# Исправляет проблему когда www работает, а основной домен нет
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
DOMAIN_NAME="karagandymemory.kz"
WWW_DOMAIN="www.karagandymemory.kz"

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

# Проверка текущей конфигурации
check_current_config() {
    log_info "Проверка текущей конфигурации Nginx..."
    
    if [ ! -f "/etc/nginx/sites-available/$APP_NAME" ]; then
        log_error "Конфигурация Nginx не найдена!"
        exit 1
    fi
    
    log_info "Текущая конфигурация:"
    grep -E "server_name|listen" /etc/nginx/sites-available/$APP_NAME | head -20
}

# Проверка SSL сертификатов
check_ssl_certificates() {
    log_info "Проверка SSL сертификатов..."
    
    if command -v certbot &> /dev/null; then
        certbot certificates
    else
        log_warning "Certbot не установлен"
    fi
}

# Исправление конфигурации Nginx
fix_nginx_config() {
    log_info "Исправление конфигурации Nginx..."
    
    # Создаём резервную копию
    cp /etc/nginx/sites-available/$APP_NAME /etc/nginx/sites-available/$APP_NAME.backup.$(date +%Y%m%d_%H%M%S)
    
    # Проверяем, есть ли оба домена в server_name
    if grep -q "server_name.*$DOMAIN_NAME.*$WWW_DOMAIN\|server_name.*$WWW_DOMAIN.*$DOMAIN_NAME" /etc/nginx/sites-available/$APP_NAME; then
        log_info "Оба домена уже указаны в конфигурации"
    else
        log_warning "Основной домен не найден в server_name, исправляем..."
        
        # Обновляем server_name для HTTP блока
        sed -i "s|server_name.*www\.karagandymemory\.kz;|server_name $DOMAIN_NAME $WWW_DOMAIN;|g" /etc/nginx/sites-available/$APP_NAME
        sed -i "s|server_name.*karagandymemory\.kz;|server_name $DOMAIN_NAME $WWW_DOMAIN;|g" /etc/nginx/sites-available/$APP_NAME
        
        # Обновляем server_name для HTTPS блока
        sed -i "/listen 443/,/server_name/ s|server_name.*www\.karagandymemory\.kz;|server_name $DOMAIN_NAME $WWW_DOMAIN;|g" /etc/nginx/sites-available/$APP_NAME
        sed -i "/listen 443/,/server_name/ s|server_name.*karagandymemory\.kz;|server_name $DOMAIN_NAME $WWW_DOMAIN;|g" /etc/nginx/sites-available/$APP_NAME
        
        log_success "Конфигурация обновлена"
    fi
    
    # Проверяем конфигурацию
    if nginx -t; then
        systemctl reload nginx
        log_success "Nginx перезагружен"
    else
        log_error "Ошибка в конфигурации Nginx"
        exit 1
    fi
}

# Получение/обновление SSL сертификата
fix_ssl_certificate() {
    log_info "Проверка и обновление SSL сертификата..."
    
    if ! command -v certbot &> /dev/null; then
        log_error "Certbot не установлен"
        return
    fi
    
    # Проверяем, есть ли сертификат для основного домена
    CERT_INFO=$(certbot certificates 2>/dev/null | grep -A 5 "$DOMAIN_NAME" || echo "")
    
    if echo "$CERT_INFO" | grep -q "$DOMAIN_NAME"; then
        log_info "Сертификат для $DOMAIN_NAME найден"
    else
        log_warning "Сертификат для $DOMAIN_NAME не найден, получаем..."
        
        read -p "Введите email для Let's Encrypt: " CERT_EMAIL
        if [ -z "$CERT_EMAIL" ]; then
            log_error "Email обязателен"
            return
        fi
        
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
            log_success "SSL сертификат получен"
        else
            log_error "Ошибка при получении сертификата"
        fi
    fi
}

# Проверка DNS
check_dns() {
    log_info "Проверка DNS записей..."
    
    if ! command -v dig &> /dev/null; then
        log_warning "dig не установлен, пропускаем проверку DNS"
        return
    fi
    
    DOMAIN_IP=$(dig +short $DOMAIN_NAME | head -n 1)
    WWW_IP=$(dig +short $WWW_DOMAIN | head -n 1)
    
    log_info "$DOMAIN_NAME -> $DOMAIN_IP"
    log_info "$WWW_DOMAIN -> $WWW_IP"
    
    if [ -z "$DOMAIN_IP" ]; then
        log_warning "DNS запись для $DOMAIN_NAME не найдена!"
    fi
    
    if [ -z "$WWW_IP" ]; then
        log_warning "DNS запись для $WWW_DOMAIN не найдена!"
    fi
}

# Тестирование доступности
test_accessibility() {
    log_info "Тестирование доступности доменов..."
    
    echo ""
    echo "Проверка HTTP:"
    curl -I http://$DOMAIN_NAME 2>&1 | head -5 || log_warning "HTTP для $DOMAIN_NAME не доступен"
    curl -I http://$WWW_DOMAIN 2>&1 | head -5 || log_warning "HTTP для $WWW_DOMAIN не доступен"
    
    echo ""
    echo "Проверка HTTPS:"
    curl -I https://$DOMAIN_NAME 2>&1 | head -5 || log_warning "HTTPS для $DOMAIN_NAME не доступен"
    curl -I https://$WWW_DOMAIN 2>&1 | head -5 || log_warning "HTTPS для $WWW_DOMAIN не доступен"
}

# Главная функция
main() {
    echo "============================================================"
    echo "History Platform - Исправление проблемы с доменом"
    echo "============================================================"
    echo ""
    
    check_root
    check_dns
    check_current_config
    check_ssl_certificates
    fix_nginx_config
    fix_ssl_certificate
    test_accessibility
    
    echo ""
    echo "============================================================"
    echo -e "${GREEN}Проверка завершена!${NC}"
    echo "============================================================"
    echo ""
    echo "Если проблема сохраняется, проверьте:"
    echo "1. DNS записи для $DOMAIN_NAME"
    echo "2. Логи Nginx: tail -f /var/log/nginx/${APP_NAME}_error.log"
    echo "3. Конфигурацию: cat /etc/nginx/sites-available/$APP_NAME"
    echo ""
}

# Запуск
main "$@"
