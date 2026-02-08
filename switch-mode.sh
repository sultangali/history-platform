#!/bin/bash

# ===========================================
# Скрипт переключения между dev и prod режимами
# Использование: ./switch-mode.sh dev|prod
# ===========================================

MODE=$1

if [ -z "$MODE" ]; then
  echo "❌ Ошибка: укажите режим (dev или prod)"
  echo "Использование: ./switch-mode.sh dev|prod"
  echo ""
  echo "Примеры:"
  echo "  ./switch-mode.sh dev   # Переключить в development режим"
  echo "  ./switch-mode.sh prod  # Переключить в production режим"
  exit 1
fi

if [ "$MODE" != "dev" ] && [ "$MODE" != "prod" ]; then
  echo "❌ Ошибка: режим должен быть 'dev' или 'prod'"
  exit 1
fi

echo "🔄 Переключение в режим: $MODE"
echo ""

# Функция для копирования .env файлов
copy_env_file() {
  local dir=$1
  local source_file=""
  
  if [ "$MODE" == "dev" ]; then
    source_file="$dir/.env.development.example"
  else
    source_file="$dir/.env.production.example"
  fi
  
  if [ -f "$source_file" ]; then
    cp "$source_file" "$dir/.env"
    echo "✅ Скопирован: $source_file -> $dir/.env"
  else
    echo "⚠️  Файл не найден: $source_file"
  fi
}

# Копируем .env файлы
copy_env_file "server"
copy_env_file "client"

echo ""
echo "✅ Режим успешно переключен на: $MODE"
echo ""

if [ "$MODE" == "dev" ]; then
  echo "📝 Development режим активирован!"
  echo "   Backend:  http://localhost:5000"
  echo "   Frontend: http://localhost:3000"
  echo "   MongoDB:  mongodb://localhost:27017/repression-archive-dev"
  echo ""
  echo "Запустите проект:"
  echo "   Terminal 1: cd server && npm run dev"
  echo "   Terminal 2: cd client && npm run dev"
else
  echo "🚀 Production режим активирован!"
  echo "   ⚠️  ВНИМАНИЕ: Убедитесь, что вы обновили следующие параметры в .env файлах:"
  echo ""
  echo "   server/.env:"
  echo "     - JWT_SECRET (сгенерируйте надежный ключ!)"
  echo "     - MONGODB_URI (ваша production база)"
  echo "     - CORS_ORIGIN (ваш домен)"
  echo ""
  echo "   client/.env:"
  echo "     - VITE_API_URL (ваш API URL)"
  echo ""
  echo "   Для сборки и деплоя:"
  echo "     cd client && npm run build"
  echo "     cd server && npm start"
fi

echo ""
