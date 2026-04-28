#!/usr/bin/env bash
input=$(cat)

# Git branch
branch=$(git -C "$(echo "$input" | jq -r '.workspace.project_dir')" --no-optional-locks symbolic-ref --short HEAD 2>/dev/null)
[ -z "$branch" ] && branch="detached"

# Model
model=$(echo "$input" | jq -r '.model.display_name // "unknown"')

# Context usage
used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
remaining_pct=$(echo "$input" | jq -r '.context_window.remaining_percentage // empty')

# Token counts
input_tokens=$(echo "$input" | jq -r '.context_window.current_usage.input_tokens // empty')
output_tokens=$(echo "$input" | jq -r '.context_window.current_usage.output_tokens // empty')

# Build output
parts=()

# Git branch segment
parts+=("$(printf '\033[0;36m\xee\x82\xa0 %s\033[0m' "$branch")")

# Model segment
parts+=("$(printf '\033[0;35m◆ %s\033[0m' "$model")")

# Context usage segment
if [ -n "$used_pct" ] && [ -n "$remaining_pct" ]; then
  used_int=$(printf '%.0f' "$used_pct")
  remaining_int=$(printf '%.0f' "$remaining_pct")
  if [ "$used_int" -ge 80 ]; then
    color='\033[0;31m'
  elif [ "$used_int" -ge 50 ]; then
    color='\033[0;33m'
  else
    color='\033[0;32m'
  fi
  parts+=("$(printf "${color}ctx: %s%% used / %s%% left\033[0m" "$used_int" "$remaining_int")")
fi

# Token usage segment
if [ -n "$input_tokens" ] && [ -n "$output_tokens" ]; then
  parts+=("$(printf '\033[0;34mtokens: in=%s out=%s\033[0m' "$input_tokens" "$output_tokens")")
fi

# Join with separator
printf '%s' "${parts[0]}"
for part in "${parts[@]:1}"; do
  printf '  |  %s' "$part"
done
printf '\n'
