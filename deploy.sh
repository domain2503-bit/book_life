#!/bin/bash

KEY="$HOME/Desktop/project/book_life/book_life.key"
SERVER="ubuntu@168.107.63.231"
LOCAL="$HOME/Desktop/project/book_life"

echo "📦 서버에 업로드 중..."

rsync -avz --delete \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  --exclude='venv' \
  --exclude='data.db' \
  -e "ssh -i $KEY" \
  "$LOCAL/backend/" "$SERVER:~/book_life/backend/"

echo "🔄 서버 재시작 중..."
ssh -i "$KEY" "$SERVER" "sudo systemctl restart booklife"

echo "✅ 배포 완료!"
