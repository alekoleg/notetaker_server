#!/bin/bash

# Определение пути к директории скрипта
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARENT_DIR="$(dirname "$SCRIPT_DIR")"

# Проверка наличия файла .env в родительской директории
if [ ! -f "$PARENT_DIR/.env" ]; then
  echo "Файл .env не найден в директории $PARENT_DIR!"
  exit 1
fi

# Чтение переменных из файла .env с учётом пробелов вокруг '='
while IFS='=' read -r key value; do
  # Пропуск комментариев и пустых строк
  if [[ -n "$key" && ! "$key" =~ ^# ]]; then
    # Удаление пробелов вокруг ключа и значения
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)
    export "$key"="$value"
  fi
done < "$PARENT_DIR/.env"

# Проверка наличия необходимых переменных
if [ -z "$APPLICATION_ID" ] || [ -z "$MASTER_KEY" ] || [ -z "$SERVER_URL" ]; then
  echo "Необходимые переменные не найдены в .env файле!"
  exit 1
fi

# Запуск команды parse-dashboard с использованием переменных из .env
parse-dashboard --dev --appId "$APPLICATION_ID" --masterKey "$MASTER_KEY" --serverURL "$SERVER_URL" --appName NoteTaker