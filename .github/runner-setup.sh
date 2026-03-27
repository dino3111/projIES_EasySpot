#!/bin/bash
# Self-hosted GitHub Actions Runner Setup for Raspberry Pi
# This script configures the runner user to avoid sudo password prompts

set -euo pipefail

echo "GitHub Actions Self-Hosted Runner Setup"
echo ""
echo "This script configures a self-hosted runner on Raspberry Pi."
echo "Run this with: sudo bash .github/runner-setup.sh"
echo ""

if [ "$EUID" -ne 0 ]; then
   echo "❌ This script must be run as root (use: sudo bash)"
   exit 1
fi

# Get the runner user (usually the user who installed the runner)
RUNNER_USER="${SUDO_USER:-$(whoami)}"
if [ "$RUNNER_USER" = "root" ]; then
  echo "❌ Please run with sudo as the runner user:"
  echo "   sudo bash .github/runner-setup.sh"
  exit 1
fi

echo "✓ Configuring for user: $RUNNER_USER"
echo ""

# 1. Add Docker socket access
echo "1️⃣  Configuring Docker socket access..."
if command -v docker &> /dev/null; then
  usermod -aG docker "$RUNNER_USER" 2>/dev/null || true
  echo "   ✓ Added $RUNNER_USER to docker group"
else
  echo "   ⚠️  Docker not installed"
fi

# 2. Configure sudoers for NOPASSWD (only for specific commands needed by CI)
echo ""
echo "2️⃣  Configuring sudoers for passwordless commands..."

SUDOERS_SNIPPET="
# GitHub Actions Self-Hosted Runner - Passwordless commands
$RUNNER_USER ALL=(ALL) NOPASSWD: /usr/bin/apt-get update
$RUNNER_USER ALL=(ALL) NOPASSWD: /usr/bin/apt-get install -y --no-install-recommends unzip
$RUNNER_USER ALL=(ALL) NOPASSWD: /sbin/usermod -aG docker *
$RUNNER_USER ALL=(ALL) NOPASSWD: /bin/chmod 666 /var/run/docker.sock
"

echo "$SUDOERS_SNIPPET" | sudo tee /etc/sudoers.d/github-actions-runner > /dev/null

# Verify sudoers syntax
if sudo -l -U "$RUNNER_USER" &> /dev/null; then
  echo "   ✓ sudoers configured successfully"
else
  echo "   ⚠️  sudoers may have issues, check manually"
fi

# 3. Optimize OS settings for CI workflows
echo ""
echo "3️⃣  Optimizing system settings..."

# Increase file descriptors for builds
if ! grep -q "fs.file-max" /etc/sysctl.conf; then
  echo "fs.file-max=2097152" >> /etc/sysctl.conf
  sysctl -p > /dev/null
  echo "   ✓ Increased file descriptors"
fi

# 4. Pre-pull common images to cache
echo ""
echo "4️⃣  Pre-caching Docker images..."
sudo -u "$RUNNER_USER" docker pull node:18 2>/dev/null &
sudo -u "$RUNNER_USER" docker pull openjdk:21 2>/dev/null &
wait 2>/dev/null || true
echo "   ✓ Docker images cached in background"

# 5. Create cache directories with proper permissions
echo ""
echo "5️⃣  Creating cache directories..."
mkdir -p /home/$RUNNER_USER/.m2/repository
mkdir -p /home/$RUNNER_USER/.cache/pip
mkdir -p /home/$RUNNER_USER/.cache/pre-commit
mkdir -p /home/$RUNNER_USER/.sonar

chown -R "$RUNNER_USER:$RUNNER_USER" /home/$RUNNER_USER/.m2
chown -R "$RUNNER_USER:$RUNNER_USER" /home/$RUNNER_USER/.cache
chown -R "$RUNNER_USER:$RUNNER_USER" /home/$RUNNER_USER/.sonar

echo "   ✓ Cache directories created"
echo "Setup Complete"

