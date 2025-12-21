#!/bin/bash

# ============================================================
# History Platform - Скрипт деплоя приложения
# ============================================================
# Этот скрипт:
# - Клонирует/обновляет репозиторий
# - Устанавливает зависимости
# - Собирает фронтенд
# - Настраивает переменные окружения
# - Запускает приложение через PM2
# ============================================================

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Конфигурация
APP_NAME="history-platform"
APP_DIR="/var/www/history-platform"
GIT_REPO="git@github.com:sultangali/history-platform.git"
GIT_BRANCH="main"
NODE_ENV="production"
DEFAULT_SERVER_IP="34.51.218.216"

# Функции логирования
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Проверка root прав
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Этот скрипт должен быть запущен с правами root (sudo)"
        exit 1
    fi
}

# Проверка SSH ключа для GitHub
check_ssh_key() {
    log_info "Проверка SSH ключа для GitHub..."
    
    # Создаём директорию .ssh если её нет
    mkdir -p /root/.ssh
    chmod 700 /root/.ssh
    
    if [ ! -f /root/.ssh/id_rsa ] && [ ! -f /root/.ssh/id_ed25519 ]; then
        log_warning "SSH ключ не найден. Создаём новый..."
        
        read -p "Введите ваш email для SSH ключа: " SSH_EMAIL
        ssh-keygen -t ed25519 -C "$SSH_EMAIL" -f /root/.ssh/id_ed25519 -N ""
        
        echo ""
        echo "============================================================"
        echo -e "${YELLOW}ВАЖНО: Добавьте этот SSH ключ в GitHub!${NC}"
        echo "============================================================"
        echo ""
        cat /root/.ssh/id_ed25519.pub
        echo ""
        echo "1. Скопируйте ключ выше"
        echo "2. Перейдите на https://github.com/settings/keys"
        echo "3. Нажмите 'New SSH key' и вставьте ключ"
        echo ""
        read -p "Нажмите Enter после добавления ключа в GitHub..."
    fi
    
    # Добавляем GitHub в known_hosts
    ssh-keyscan -t rsa github.com >> /root/.ssh/known_hosts 2>/dev/null || true
    
    log_success "SSH ключ настроен"
}

# Клонирование или обновление репозитория
clone_or_update_repo() {
    log_info "Работа с репозиторием..."
    
    if [ -d "$APP_DIR/.git" ]; then
        log_info "Репозиторий существует, обновляем..."
        cd $APP_DIR
        git fetch origin
        git reset --hard origin/$GIT_BRANCH
        git pull origin $GIT_BRANCH
    else
        log_info "Клонирование репозитория..."
        mkdir -p $(dirname $APP_DIR)
        git clone -b $GIT_BRANCH $GIT_REPO $APP_DIR
    fi
    
    cd $APP_DIR
    log_success "Репозиторий обновлён"
}

# Установка зависимостей сервера
install_server_deps() {
    log_info "Установка зависимостей сервера..."
    
    cd $APP_DIR/server
    
    # Используем npm ci для чистой установки
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    log_success "Зависимости сервера установлены"
}

# Установка зависимостей клиента и сборка
build_client() {
    log_info "Установка зависимостей клиента..."
    
    cd $APP_DIR/client
    
    # Используем npm ci для чистой установки
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    log_info "Сборка клиента для production..."
    npm run build
    
    log_success "Клиент собран"
    
    # Копирование собранного клиента в директорию nginx
    log_info "Копирование клиента в директорию nginx..."
    
    NGINX_DIR="/var/www/html/history-platform"
    if [ -d "$NGINX_DIR" ]; then
        rm -rf $NGINX_DIR
    fi
    
    mkdir -p $NGINX_DIR
    cp -r $APP_DIR/client/dist/* $NGINX_DIR/
    
    log_success "Клиент скопирован в $NGINX_DIR"
}

# Настройка переменных окружения
setup_env() {
    log_info "Настройка переменных окружения..."
    
    ENV_FILE="$APP_DIR/server/.env"
    
    if [ -f "$ENV_FILE" ]; then
        log_info "Файл .env уже существует"
        read -p "Перезаписать? (y/n): " OVERWRITE
        if [ "$OVERWRITE" != "y" ] && [ "$OVERWRITE" != "Y" ]; then
            log_info "Пропускаем настройку переменных окружения"
            return
        fi
    fi
    
    # Получаем IP адрес сервера
    log_info "Определение IP адреса сервера..."
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "$DEFAULT_SERVER_IP")
    
    # Если автоматическое определение не удалось, используем дефолтный IP
    if [ -z "$SERVER_IP" ] || [ "$SERVER_IP" = "" ]; then
        SERVER_IP="$DEFAULT_SERVER_IP"
    fi
    
    log_info "Используется IP адрес: $SERVER_IP"
    
    # Генерируем безопасный JWT секрет
    JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
    
    # Создаём файл .env для сервера
    cat > $ENV_FILE << EOF
# ==================== ОСНОВНЫЕ НАСТРОЙКИ ====================
NODE_ENV=production
PORT=5000

# ==================== БАЗА ДАННЫХ ====================
MONGODB_URI=mongodb://127.0.0.1:27017/repression-archive

# ==================== JWT ====================
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d

# ==================== CORS ====================
# Замените на ваш домен после настройки SSL
CORS_ORIGIN=http://$SERVER_IP

# ==================== СЕРВЕР ====================
SERVER_IP=$SERVER_IP
EOF

    chmod 600 $ENV_FILE
    
    # Создаём .env.production для клиента
    CLIENT_ENV_FILE="$APP_DIR/client/.env.production"
    cat > $CLIENT_ENV_FILE << EOF
VITE_API_URL=http://$SERVER_IP/api
EOF
    
    log_success "Переменные окружения настроены"
    log_info "JWT секрет сгенерирован автоматически"
    log_info "Server IP: $SERVER_IP"
}

# Инициализация базы данных
seed_database() {
    log_info "Инициализация базы данных..."
    
    cd $APP_DIR/server
    
    if npm run seed 2>/dev/null; then
        log_success "База данных инициализирована"
    else
        log_warning "Скрипт seed не найден или выполнение завершилось с ошибкой"
    fi
}

# Настройка PM2
setup_pm2() {
    log_info "Настройка PM2..."
    
    cd $APP_DIR
    
    # Создаём ecosystem файл если его нет
    if [ ! -f "ecosystem.config.cjs" ]; then
        log_info "Создание ecosystem.config.cjs..."
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
    
    # Останавливаем существующий процесс если есть
    pm2 delete $APP_NAME-api 2>/dev/null || true
    
    # Запускаем через PM2
    pm2 start ecosystem.config.cjs --env production
    
    # Сохраняем конфигурацию PM2
    pm2 save
    
    log_success "PM2 настроен и приложение запущено"
}

# Вывод статуса
print_status() {
    echo ""
    echo "============================================================"
    echo -e "${GREEN}Деплой завершён успешно!${NC}"
    echo "============================================================"
    echo ""
    echo "Статус приложения:"
    pm2 status
    echo ""
    echo "Информация о приложении:"
    echo "  - Директория: $APP_DIR"
    echo "  - Порт: 5000"
    echo "  - Клиент: /var/www/html/history-platform"
    echo ""
    echo "Тестирование API:"
    echo "  curl http://127.0.0.1:5000/api/health"
    echo ""
    echo "Следующие шаги:"
    echo "1. Запустите 03-setup-nginx.sh для настройки Nginx"
    echo "2. Запустите 04-setup-ssl.sh для настройки SSL"
    echo ""
    echo "Полезные команды:"
    echo "  pm2 logs history-platform-api     - просмотр логов"
    echo "  pm2 restart history-platform-api  - перезапуск"
    echo "  pm2 stop history-platform-api     - остановка"
    echo "  pm2 monit                         - мониторинг"
    echo "============================================================"
}

# Главная функция
main() {
    echo "============================================================"
    echo "History Platform - Деплой приложения"
    echo "============================================================"
    echo ""
    
    check_root
    check_ssh_key
    clone_or_update_repo
    install_server_deps
    build_client
    setup_env
    seed_database
    setup_pm2
    
    print_status
}

# Запуск
main "$@"