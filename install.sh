#!/bin/sh
# Installs the executable of exspec's latest release for this machine.
#   curl -fsSL https://raw.githubusercontent.com/defsquare/exspec/main/install.sh | sh
# EXSPEC_INSTALL  where it goes         ~/.local/bin when not given
# EXSPEC_RELEASE  where it comes from   the latest release when not given
set -eu

release="${EXSPEC_RELEASE:-https://github.com/defsquare/exspec/releases/latest/download}"
into="${EXSPEC_INSTALL:-$HOME/.local/bin}"

case "$(uname -s)" in
  Darwin) os=darwin ;;
  Linux) os=linux ;;
  *) echo "exspec: no executable for $(uname -s)" >&2; exit 1 ;;
esac
case "$(uname -m)" in
  arm64 | aarch64) arch=arm64 ;;
  x86_64 | amd64) arch=x64 ;;
  *) echo "exspec: no executable for $(uname -m)" >&2; exit 1 ;;
esac
name="exspec-$os-$arch"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
curl -fsSL "$release/$name" -o "$tmp/$name"
curl -fsSL "$release/checksums.txt" -o "$tmp/checksums.txt"

# the executable is the one the release was made with, or nothing is installed
sum() { if command -v sha256sum >/dev/null; then sha256sum "$1"; else shasum -a 256 "$1"; fi | cut -d' ' -f1; }
expected="$(grep " $name\$" "$tmp/checksums.txt" | cut -d' ' -f1)"
if [ -z "$expected" ] || [ "$(sum "$tmp/$name")" != "$expected" ]; then
  echo "exspec: $name does not match its checksum, nothing installed" >&2
  exit 1
fi

# an executable that does not start here (a musl system, an old processor) is not installed
chmod +x "$tmp/$name"
if ! said="$("$tmp/$name" --version)"; then
  echo "exspec: $name does not start on this machine, nothing installed" >&2
  exit 1
fi

mkdir -p "$into"
mv "$tmp/$name" "$into/exspec"
echo "$(echo "$said" | head -1) installed: $into/exspec"

case ":$PATH:" in
  *":$into:"*) ;;
  *) echo "$into is not on the PATH: add it to run \`exspec\`" ;;
esac
command -v claude >/dev/null || echo "exspec extract needs Claude Code: no \`claude\` on the PATH (https://claude.com/claude-code)"
