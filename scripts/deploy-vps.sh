#!/usr/bin/env bash
# Run this FROM YOUR MAC (in Cursor terminal). It SSHs to the VPS and deploys.
# Usage: ./scripts/deploy-vps.sh   or   bash scripts/deploy-vps.sh
# Set VPS_HOST if different: VPS_HOST=1.2.3.4 ./scripts/deploy-vps.sh

set -e
VPS_HOST="${VPS_HOST:-5.161.211.16}"

echo "Deploying to $VPS_HOST (run from Mac; will ask for SSH password if needed)..."
ssh "root@$VPS_HOST" 'cd ~/deep-summarizer && git pull && npm run build && pm2 delete reno-times 2>/dev/null || true && pm2 start ecosystem.config.cjs && pm2 save && sleep 5 && curl -s -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:3000/'
echo ""
echo "If you saw HTTP 200 or 304 above, open: http://$VPS_HOST:3000"
