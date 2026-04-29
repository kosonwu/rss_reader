#!/usr/bin/env bash
input=$(cat)

# Git branch
project_dir=$(printf '%s' "$input" | jq -r '.workspace.project_dir // empty')
if [ -n "$project_dir" ]; then
  branch=$(git -C "$project_dir" --no-optional-locks symbolic-ref --short HEAD 2>/dev/null)
fi
[ -z "$branch" ] && branch="detached"

# Model name — fallback to model.id if display_name is absent
model=$(printf '%s' "$input" | jq -r '.model.display_name // empty')
[ -z "$model" ] && model=$(printf '%s' "$input" | jq -r '.model.id // "unknown"')

# Context usage (null until first API call)
used_pct=$(printf '%s' "$input" | jq -r '.context_window.used_percentage // empty')
remaining_pct=$(printf '%s' "$input" | jq -r '.context_window.remaining_percentage // empty')

# Token counts
input_tokens=$(printf '%s' "$input" | jq -r '.context_window.current_usage.input_tokens // empty')
output_tokens=$(printf '%s' "$input" | jq -r '.context_window.current_usage.output_tokens // empty')

sep='  |  '
out=''

# Git branch — plain prefix, no Nerd Font glyph
out="${out}$(printf '\033[0;36mgit:%s\033[0m' "$branch")"

# Model segment
out="${out}${sep}$(printf '\033[0;35m◆ %s\033[0m' "$model")"

# Context usage (only shown after first API call)
if [ -n "$used_pct" ] && [ -n "$remaining_pct" ]; then
  used_int=$(printf '%.0f' "$used_pct")
  if [ "$used_int" -ge 80 ]; then
    ctx_color='\033[0;31m'
  elif [ "$used_int" -ge 50 ]; then
    ctx_color='\033[0;33m'
  else
    ctx_color='\033[0;32m'
  fi
  out="${out}${sep}$(printf "${ctx_color}ctx:%s%%\033[0m" "$used_int")"
fi

# Token counts (only shown after first API call)
if [ -n "$input_tokens" ] && [ -n "$output_tokens" ]; then
  out="${out}${sep}$(printf '\033[0;34min:%s out:%s\033[0m' "$input_tokens" "$output_tokens")"
fi

printf '%s\n' "$out"
