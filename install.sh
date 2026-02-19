#!/usr/bin/env bash
# =============================================================================
# install.sh — Intelligent installer for OpenCode Template Agents
#
# Installs OpenCode agents into an existing or new OpenCode configuration
# without overwriting the user's existing setup.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/dmicheneau/opencode-template-agent/main/install.sh | bash
#   # or
#   ./install.sh [OPTIONS]
#
# Options:
#   --copy        Copy files instead of creating symlinks
#   --dir PATH    Target directory (default: current directory)
#   --global      Install into ~/.config/opencode/ instead of project
#   --uninstall   Remove installed agents (symlinks or copies)
#   --force       Skip interactive confirmations
#   --dry-run     Show what would be done without executing
#   --help        Show this help message
#
# Copyright (c) 2026 — MIT License
# =============================================================================
set -euo pipefail

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
readonly VERSION="6.0.0"
readonly REPO_URL="https://github.com/dmicheneau/opencode-template-agent.git"
readonly REPO_INSTALL_DIR="${HOME}/.local/share/opencode-agents"
readonly LOG_FILE="${REPO_INSTALL_DIR}/install.log"
readonly MARKER_FILE=".opencode-agents-installed"

# Agent subdirectories (categories containing .md agent files)
readonly AGENT_SUBDIRS=(ai business data-api devops devtools docs languages mcp security web)
# Root-level agent files (agents not in a subdirectory)
readonly AGENT_ROOT_FILES=(cloud-architect.md devops-engineer.md episode-orchestrator.md fullstack-developer.md)
# Skills subdirectories
readonly SKILL_SUBDIRS=(brainstormai browser-mcp memory sequential-thinking)

# ---------------------------------------------------------------------------
# Color support
# ---------------------------------------------------------------------------
setup_colors() {
    if [[ -t 1 ]] && [[ -z "${NO_COLOR:-}" ]]; then
        RED='\033[0;31m'
        GREEN='\033[0;32m'
        YELLOW='\033[1;33m'
        BLUE='\033[0;34m'
        CYAN='\033[0;36m'
        BOLD='\033[1m'
        DIM='\033[2m'
        RESET='\033[0m'
    else
        RED='' GREEN='' YELLOW='' BLUE='' CYAN='' BOLD='' DIM='' RESET=''
    fi
}

# ---------------------------------------------------------------------------
# Logging helpers
# ---------------------------------------------------------------------------
log_info()    { printf '%sℹ%s  %s\n' "${BLUE}" "${RESET}" "$1"; }
log_success() { printf '%s✓%s  %s\n' "${GREEN}" "${RESET}" "$1"; }
log_warn()    { printf '%s⚠%s  %s\n' "${YELLOW}" "${RESET}" "$1"; }
log_error()   { printf '%s✗%s  %s\n' "${RED}" "${RESET}" "$1" >&2; }
log_step()    { printf '%s→%s  %s\n' "${CYAN}" "${RESET}" "$1"; }
log_dry()     { printf '%s[dry-run]%s %s\n' "${DIM}" "${RESET}" "$1"; }
log_header()  { printf '\n%s%s%s\n' "${BOLD}" "$1" "${RESET}"; printf '%*s\n' "${#1}" '' | tr ' ' '─'; }

# Write to log file (always, regardless of dry-run)
log_to_file() {
    local log_dir
    log_dir="$(dirname "${LOG_FILE}")"
    if [[ -d "${log_dir}" ]] || mkdir -p "${log_dir}" 2>/dev/null; then
        printf "[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$1" >> "${LOG_FILE}" 2>/dev/null || true
    fi
}

# ---------------------------------------------------------------------------
# CLI argument parsing
# ---------------------------------------------------------------------------
OPT_COPY=false
OPT_DIR=""
OPT_GLOBAL=false
OPT_UNINSTALL=false
OPT_FORCE=false
OPT_DRY_RUN=false

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --copy)
                OPT_COPY=true
                shift
                ;;
            --dir)
                if [[ -z "${2:-}" ]]; then
                    log_error "--dir requires a path argument"
                    exit 1
                fi
                OPT_DIR="$2"
                shift 2
                ;;
            --global)
                OPT_GLOBAL=true
                shift
                ;;
            --uninstall)
                OPT_UNINSTALL=true
                shift
                ;;
            --force)
                OPT_FORCE=true
                shift
                ;;
            --dry-run)
                OPT_DRY_RUN=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            --version|-v)
                printf "opencode-agents installer v%s\n" "${VERSION}"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                printf "Run '%s --help' for usage information.\n" "$0" >&2
                exit 1
                ;;
        esac
    done
}

show_help() {
    cat << 'HELP'
OpenCode Template Agents — Intelligent Installer

USAGE
    ./install.sh [OPTIONS]

OPTIONS
    --copy        Copy agent files instead of creating symlinks
    --dir PATH    Target directory (default: current project directory)
    --global      Install into ~/.config/opencode/ (global config)
    --uninstall   Remove previously installed agents
    --force       Skip all interactive confirmations
    --dry-run     Preview actions without executing them
    --help, -h    Show this help message
    --version     Show version

EXAMPLES
    # Merge agents into current project's .opencode/
    ./install.sh

    # Install globally (no existing config)
    ./install.sh --global

    # Copy instead of symlink, into a specific project
    ./install.sh --copy --dir ~/my-project

    # Preview what would happen
    ./install.sh --dry-run

    # Remove previously installed agents
    ./install.sh --uninstall

    # Non-interactive install
    ./install.sh --force --global
HELP
}

# ---------------------------------------------------------------------------
# Confirmation prompt
# ---------------------------------------------------------------------------
confirm() {
    local prompt="$1"
    local default="${2:-y}"

    if [[ "${OPT_FORCE}" == true ]]; then
        return 0
    fi

    local yn_hint
    if [[ "${default}" == "y" ]]; then
        yn_hint="[Y/n]"
    else
        yn_hint="[y/N]"
    fi

    printf '%s?%s  %s %s ' "${BOLD}" "${RESET}" "${prompt}" "${yn_hint}"
    read -r answer </dev/tty 2>/dev/null || answer=""
    answer="${answer:-${default}}"

    case "${answer}" in
        [Yy]|[Yy][Ee][Ss]) return 0 ;;
        *) return 1 ;;
    esac
}

# ---------------------------------------------------------------------------
# Progress indicator
# ---------------------------------------------------------------------------
progress_bar() {
    local current="$1"
    local total="$2"
    local label="${3:-}"
    local width=30
    local pct=0

    if [[ "${total}" -gt 0 ]]; then
        pct=$(( current * 100 / total ))
    fi

    local filled=$(( current * width / total ))
    local empty=$(( width - filled ))

    printf '\r  %s[%s' "${DIM}" "${RESET}"
    printf '%s%s%s' "${GREEN}" "$(printf '%*s' "${filled}" '' | tr ' ' '█')" "${RESET}"
    printf '%s%s%s' "${DIM}" "$(printf '%*s' "${empty}" '' | tr ' ' '░')" "${RESET}"
    printf '%s]%s %3d%% %s' "${DIM}" "${RESET}" "${pct}" "${label}"

    if [[ "${current}" -eq "${total}" ]]; then
        printf "\n"
    fi
}

# ---------------------------------------------------------------------------
# Detect existing OpenCode configuration
# ---------------------------------------------------------------------------
detect_config() {
    local target_dir="$1"
    local config_type="none"
    local config_path=""

    # Priority 1: --global flag
    if [[ "${OPT_GLOBAL}" == true ]]; then
        config_path="${HOME}/.config/opencode"
        if [[ -d "${config_path}" ]]; then
            config_type="global_existing"
        else
            config_type="global_fresh"
        fi
        printf "%s|%s" "${config_type}" "${config_path}"
        return
    fi

    # Priority 2: .opencode/ in target directory
    if [[ -d "${target_dir}/.opencode" ]]; then
        config_type="local_existing"
        config_path="${target_dir}/.opencode"
        printf "%s|%s" "${config_type}" "${config_path}"
        return
    fi

    # Priority 3: global config at ~/.config/opencode/
    if [[ -d "${HOME}/.config/opencode" ]]; then
        config_type="global_existing"
        config_path="${HOME}/.config/opencode"
        printf "%s|%s" "${config_type}" "${config_path}"
        return
    fi

    # No config found
    printf "none|"
}

# ---------------------------------------------------------------------------
# Ensure the source repo is cloned/updated locally
# ---------------------------------------------------------------------------
ensure_repo() {
    if [[ -d "${REPO_INSTALL_DIR}/.git" ]]; then
        log_info "Updating agent repository..."
        if [[ "${OPT_DRY_RUN}" == true ]]; then
            log_dry "Would run: git -C ${REPO_INSTALL_DIR} pull --ff-only"
        else
            if git -C "${REPO_INSTALL_DIR}" pull --ff-only --quiet 2>/dev/null; then
                log_success "Repository updated"
            else
                log_warn "Could not update repository (offline?). Using existing version."
            fi
            log_to_file "Repository updated at ${REPO_INSTALL_DIR}"
        fi
    else
        log_info "Cloning agent repository..."
        if [[ "${OPT_DRY_RUN}" == true ]]; then
            log_dry "Would run: git clone ${REPO_URL} ${REPO_INSTALL_DIR}"
        else
            mkdir -p "$(dirname "${REPO_INSTALL_DIR}")"
            git clone --quiet "${REPO_URL}" "${REPO_INSTALL_DIR}"
            log_success "Repository cloned to ${REPO_INSTALL_DIR}"
            log_to_file "Repository cloned to ${REPO_INSTALL_DIR}"
        fi
    fi
}

# ---------------------------------------------------------------------------
# Determine the source directory (repo or local script location)
# ---------------------------------------------------------------------------
get_source_dir() {
    # If running from within the repo itself, use it directly
    local script_dir
    script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

    if [[ -d "${script_dir}/.opencode/agents" ]]; then
        printf "%s" "${script_dir}"
        return
    fi

    # Otherwise clone/update the repo
    ensure_repo

    if [[ "${OPT_DRY_RUN}" == true ]] && [[ ! -d "${REPO_INSTALL_DIR}" ]]; then
        # In dry-run, repo may not exist yet; use script dir as fallback
        printf "%s" "${script_dir}"
        return
    fi

    printf "%s" "${REPO_INSTALL_DIR}"
}

# ---------------------------------------------------------------------------
# Install: Fresh mode (no existing config)
# ---------------------------------------------------------------------------
install_fresh() {
    local source_dir="$1"

    log_header "Fresh Installation"
    log_info "No existing OpenCode configuration detected."
    log_info "The agents will be available via OPENCODE_CONFIG_DIR."

    ensure_repo

    # Detect shell and RC file
    local shell_name rc_file
    shell_name="$(basename "${SHELL:-/bin/bash}")"
    case "${shell_name}" in
        zsh)  rc_file="${HOME}/.zshrc" ;;
        fish) rc_file="${HOME}/.config/fish/config.fish" ;;
        *)    rc_file="${HOME}/.bashrc" ;;
    esac

    local export_line="export OPENCODE_CONFIG_DIR=\"${REPO_INSTALL_DIR}/.opencode\""
    local fish_line="set -gx OPENCODE_CONFIG_DIR \"${REPO_INSTALL_DIR}/.opencode\""

    log_info "Detected shell: ${BOLD}${shell_name}${RESET}"
    log_info "RC file: ${BOLD}${rc_file}${RESET}"

    if [[ "${OPT_DRY_RUN}" == true ]]; then
        if [[ "${shell_name}" == "fish" ]]; then
            log_dry "Would add to ${rc_file}: ${fish_line}"
        else
            log_dry "Would add to ${rc_file}: ${export_line}"
        fi
        return
    fi

    if confirm "Add OPENCODE_CONFIG_DIR to ${rc_file}?"; then
        local line_to_add
        if [[ "${shell_name}" == "fish" ]]; then
            line_to_add="${fish_line}"
        else
            line_to_add="${export_line}"
        fi

        # Check if already present
        if [[ -f "${rc_file}" ]] && grep -qF "OPENCODE_CONFIG_DIR" "${rc_file}"; then
            log_warn "OPENCODE_CONFIG_DIR already set in ${rc_file}. Skipping."
        else
            printf '\n# OpenCode Template Agents\n%s\n' "${line_to_add}" >> "${rc_file}"
            log_success "Added to ${rc_file}"
            log_to_file "Added OPENCODE_CONFIG_DIR to ${rc_file}"
        fi

        log_info "Run ${BOLD}source ${rc_file}${RESET} or restart your terminal to activate."
    else
        log_info "You can manually add this to your shell config:"
        if [[ "${shell_name}" == "fish" ]]; then
            printf "  %s\n" "${fish_line}"
        else
            printf "  %s\n" "${export_line}"
        fi
    fi
}

# ---------------------------------------------------------------------------
# Install: Merge mode (existing config detected)
# ---------------------------------------------------------------------------
install_merge() {
    local source_dir="$1"
    local target_opencode="$2"

    log_header "Merge Installation"
    log_info "Existing configuration detected at: ${BOLD}${target_opencode}${RESET}"
    log_info "Your ${BOLD}opencode.json${RESET} and existing agents will NOT be modified."

    local source_agents="${source_dir}/.opencode/agents"
    local target_agents="${target_opencode}/agents"
    local source_skills="${source_dir}/.opencode/skills"
    local target_skills="${target_opencode}/skills"

    # Validate source
    if [[ ! -d "${source_agents}" ]]; then
        log_error "Source agents directory not found: ${source_agents}"
        exit 1
    fi

    # Show action plan
    log_header "Action Plan"

    local method="symlink"
    if [[ "${OPT_COPY}" == true ]]; then
        method="copy"
    fi
    log_info "Method: ${BOLD}${method}${RESET}"

    # Count what will be installed
    local total_agents=0
    local total_new=0
    local total_skip=0
    local total_items=0

    # Count subdirectory agents
    for subdir in "${AGENT_SUBDIRS[@]}"; do
        if [[ -d "${source_agents}/${subdir}" ]]; then
            local file_count
            file_count=$(find "${source_agents}/${subdir}" -maxdepth 1 -name '*.md' 2>/dev/null | wc -l | tr -d ' ')
            total_agents=$(( total_agents + file_count ))
        fi
    done

    # Count root-level agents
    for root_file in "${AGENT_ROOT_FILES[@]}"; do
        if [[ -f "${source_agents}/${root_file}" ]]; then
            total_agents=$(( total_agents + 1 ))
        fi
    done

    # Count skills
    local total_skills=0
    for skill in "${SKILL_SUBDIRS[@]}"; do
        if [[ -d "${source_skills}/${skill}" ]]; then
            total_skills=$(( total_skills + 1 ))
        fi
    done

    log_info "Agents to install: ${BOLD}${total_agents}${RESET} across ${BOLD}${#AGENT_SUBDIRS[@]}${RESET} categories + ${BOLD}${#AGENT_ROOT_FILES[@]}${RESET} root agents"
    log_info "Skills to install: ${BOLD}${total_skills}${RESET}"

    # Show details of what will happen
    printf "\n"
    log_step "Agent categories:"
    for subdir in "${AGENT_SUBDIRS[@]}"; do
        if [[ -d "${source_agents}/${subdir}" ]]; then
            local count
            count=$(find "${source_agents}/${subdir}" -maxdepth 1 -name '*.md' 2>/dev/null | wc -l | tr -d ' ')
            local status_icon="${GREEN}+${RESET}"
            local status_text="new"
            if [[ -d "${target_agents}/${subdir}" ]] || [[ -L "${target_agents}/${subdir}" ]]; then
                status_icon="${YELLOW}~${RESET}"
                status_text="exists"
                total_skip=$(( total_skip + 1 ))
            else
                total_new=$(( total_new + 1 ))
            fi
            printf '    %s %s%-12s%s %2d agents  (%s)\n' "${status_icon}" "${BOLD}" "${subdir}/" "${RESET}" "${count}" "${status_text}"
        fi
    done

    log_step "Root-level agents:"
    for root_file in "${AGENT_ROOT_FILES[@]}"; do
        local status_icon="${GREEN}+${RESET}"
        local status_text="new"
        if [[ -f "${target_agents}/${root_file}" ]] || [[ -L "${target_agents}/${root_file}" ]]; then
            status_icon="${YELLOW}~${RESET}"
            status_text="exists"
        fi
        printf '    %s %-30s (%s)\n' "${status_icon}" "${root_file}" "${status_text}"
    done

    log_step "Skills:"
    for skill in "${SKILL_SUBDIRS[@]}"; do
        if [[ -d "${source_skills}/${skill}" ]]; then
            local status_icon="${GREEN}+${RESET}"
            local status_text="new"
            if [[ -d "${target_skills}/${skill}" ]] || [[ -L "${target_skills}/${skill}" ]]; then
                status_icon="${YELLOW}~${RESET}"
                status_text="exists"
            fi
            printf '    %s %-20s (%s)\n' "${status_icon}" "${skill}/" "${status_text}"
        fi
    done

    # Also handle manifest.json
    printf "\n"
    log_step "Metadata:"
    local manifest_status="new"
    if [[ -f "${target_agents}/manifest.json" ]]; then
        manifest_status="will update"
    fi
    printf '    %s•%s manifest.json  (%s)\n' "${CYAN}" "${RESET}" "${manifest_status}"

    printf "\n"

    if [[ "${OPT_DRY_RUN}" == true ]]; then
        log_dry "No changes made (dry-run mode)"
        return
    fi

    # Confirm before proceeding
    if ! confirm "Proceed with installation?"; then
        log_info "Installation cancelled."
        exit 0
    fi

    # Create target directories
    mkdir -p "${target_agents}"
    mkdir -p "${target_skills}"

    # Progress tracking
    total_items=$(( ${#AGENT_SUBDIRS[@]} + ${#AGENT_ROOT_FILES[@]} + ${#SKILL_SUBDIRS[@]} + 1 ))
    local current_item=0
    local installed_count=0
    local skipped_count=0

    # Install agent subdirectories
    for subdir in "${AGENT_SUBDIRS[@]}"; do
        current_item=$(( current_item + 1 ))
        progress_bar "${current_item}" "${total_items}" "${subdir}/"

        if [[ ! -d "${source_agents}/${subdir}" ]]; then
            continue
        fi

        local target_path="${target_agents}/${subdir}"

        if [[ -d "${target_path}" ]] && [[ ! -L "${target_path}" ]]; then
            # Directory exists and is NOT a symlink — user's own agents
            # Merge individual files without overwriting
            while IFS= read -r agent_file; do
                local filename
                filename="$(basename "${agent_file}")"
                local dest="${target_path}/${filename}"

                if [[ -f "${dest}" ]] && [[ ! -L "${dest}" ]]; then
                    skipped_count=$(( skipped_count + 1 ))
                    log_to_file "SKIP (exists): ${dest}"
                else
                    if [[ "${OPT_COPY}" == true ]]; then
                        cp "${agent_file}" "${dest}"
                    else
                        ln -sf "${agent_file}" "${dest}"
                    fi
                    installed_count=$(( installed_count + 1 ))
                    log_to_file "INSTALL: ${dest}"
                fi
            done < <(find "${source_agents}/${subdir}" -maxdepth 1 -name '*.md' -type f 2>/dev/null)
        elif [[ -L "${target_path}" ]]; then
            # Already a symlink from us — update it
            rm -f "${target_path}"
            if [[ "${OPT_COPY}" == true ]]; then
                cp -R "${source_agents}/${subdir}" "${target_path}"
            else
                ln -sf "${source_agents}/${subdir}" "${target_path}"
            fi
            installed_count=$(( installed_count + 1 ))
            log_to_file "UPDATE: ${target_path}"
        else
            # Does not exist — create
            if [[ "${OPT_COPY}" == true ]]; then
                cp -R "${source_agents}/${subdir}" "${target_path}"
            else
                ln -sf "${source_agents}/${subdir}" "${target_path}"
            fi
            installed_count=$(( installed_count + 1 ))
            log_to_file "INSTALL: ${target_path}"
        fi
    done

    # Install root-level agent files
    for root_file in "${AGENT_ROOT_FILES[@]}"; do
        current_item=$(( current_item + 1 ))
        progress_bar "${current_item}" "${total_items}" "${root_file}"

        local source_path="${source_agents}/${root_file}"
        local target_path="${target_agents}/${root_file}"

        if [[ ! -f "${source_path}" ]]; then
            continue
        fi

        if [[ -f "${target_path}" ]] && [[ ! -L "${target_path}" ]]; then
            skipped_count=$(( skipped_count + 1 ))
            log_to_file "SKIP (exists): ${target_path}"
        else
            if [[ "${OPT_COPY}" == true ]]; then
                cp "${source_path}" "${target_path}"
            else
                ln -sf "${source_path}" "${target_path}"
            fi
            installed_count=$(( installed_count + 1 ))
            log_to_file "INSTALL: ${target_path}"
        fi
    done

    # Install skills
    for skill in "${SKILL_SUBDIRS[@]}"; do
        current_item=$(( current_item + 1 ))
        progress_bar "${current_item}" "${total_items}" "skill:${skill}"

        local source_path="${source_skills}/${skill}"
        local target_path="${target_skills}/${skill}"

        if [[ ! -d "${source_path}" ]]; then
            continue
        fi

        if [[ -d "${target_path}" ]] && [[ ! -L "${target_path}" ]]; then
            skipped_count=$(( skipped_count + 1 ))
            log_to_file "SKIP (exists): ${target_path}"
        else
            if [[ -L "${target_path}" ]]; then
                rm -f "${target_path}"
            fi
            if [[ "${OPT_COPY}" == true ]]; then
                cp -R "${source_path}" "${target_path}"
            else
                ln -sf "${source_path}" "${target_path}"
            fi
            installed_count=$(( installed_count + 1 ))
            log_to_file "INSTALL: ${target_path}"
        fi
    done

    # Install manifest.json
    current_item=$(( current_item + 1 ))
    progress_bar "${current_item}" "${total_items}" "manifest.json"

    local manifest_src="${source_agents}/manifest.json"
    local manifest_dst="${target_agents}/manifest.json"
    if [[ -f "${manifest_src}" ]]; then
        if [[ "${OPT_COPY}" == true ]]; then
            cp "${manifest_src}" "${manifest_dst}"
        else
            ln -sf "${manifest_src}" "${manifest_dst}"
        fi
        log_to_file "INSTALL: ${manifest_dst}"
    fi

    # Write marker file for uninstall
    local marker_path="${target_opencode}/${MARKER_FILE}"
    {
        printf "installed_at=%s\n" "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
        printf "method=%s\n" "${method}"
        printf "source=%s\n" "${source_dir}"
        printf "version=%s\n" "${VERSION}"
    } > "${marker_path}"
    log_to_file "Wrote marker file: ${marker_path}"

    # Summary
    printf "\n"
    log_header "Installation Complete"
    log_success "Installed: ${BOLD}${installed_count}${RESET} items"
    if [[ "${skipped_count}" -gt 0 ]]; then
        log_warn "Skipped:   ${BOLD}${skipped_count}${RESET} items (already existed — your files are safe)"
    fi
    log_info "Method:    ${BOLD}${method}${RESET}"
    log_info "Target:    ${BOLD}${target_opencode}${RESET}"
    log_info "Log file:  ${DIM}${LOG_FILE}${RESET}"
    printf "\n"
    log_info "Your agents are now available in OpenCode. Use them with:"
    printf '    %sopencode%s → then type %s/agent <name>%s\n' "${BOLD}" "${RESET}" "${BOLD}" "${RESET}"
    printf "\n"
    log_info "Available agent categories:"
    for subdir in "${AGENT_SUBDIRS[@]}"; do
        printf '    %s•%s %s\n' "${CYAN}" "${RESET}" "${subdir}"
    done
}

# ---------------------------------------------------------------------------
# Uninstall: Remove previously installed agents
# ---------------------------------------------------------------------------
do_uninstall() {
    local target_opencode="$1"

    log_header "Uninstall"

    local marker_path="${target_opencode}/${MARKER_FILE}"
    if [[ ! -f "${marker_path}" ]]; then
        log_error "No installation marker found at ${target_opencode}"
        log_info "This directory was not installed by this script."
        exit 1
    fi

    # Read marker
    local install_method
    install_method="$(grep '^method=' "${marker_path}" | cut -d= -f2)"
    log_info "Detected installation method: ${BOLD}${install_method}${RESET}"

    local target_agents="${target_opencode}/agents"
    local target_skills="${target_opencode}/skills"

    # Build list of items to remove
    local items_to_remove=()

    for subdir in "${AGENT_SUBDIRS[@]}"; do
        local path="${target_agents}/${subdir}"
        if [[ "${install_method}" == "symlink" ]]; then
            if [[ -L "${path}" ]]; then
                items_to_remove+=("${path}")
            fi
        else
            # For copy mode, we only remove if it looks like ours
            if [[ -d "${path}" ]]; then
                items_to_remove+=("${path}")
            fi
        fi
    done

    for root_file in "${AGENT_ROOT_FILES[@]}"; do
        local path="${target_agents}/${root_file}"
        if [[ -L "${path}" ]] || [[ -f "${path}" ]]; then
            items_to_remove+=("${path}")
        fi
    done

    for skill in "${SKILL_SUBDIRS[@]}"; do
        local path="${target_skills}/${skill}"
        if [[ -L "${path}" ]] || [[ -d "${path}" ]]; then
            items_to_remove+=("${path}")
        fi
    done

    # Manifest
    local manifest_path="${target_agents}/manifest.json"
    if [[ -L "${manifest_path}" ]] || [[ -f "${manifest_path}" ]]; then
        items_to_remove+=("${manifest_path}")
    fi

    if [[ ${#items_to_remove[@]} -eq 0 ]]; then
        log_info "Nothing to remove."
        rm -f "${marker_path}"
        return
    fi

    log_info "Items to remove (${#items_to_remove[@]}):"
    for item in "${items_to_remove[@]}"; do
        if [[ -L "${item}" ]]; then
            printf '    %s✗%s %s %s(symlink)%s\n' "${RED}" "${RESET}" "${item}" "${DIM}" "${RESET}"
        else
            printf '    %s✗%s %s %s(%s)%s\n' "${RED}" "${RESET}" "${item}" "${DIM}" "${install_method}" "${RESET}"
        fi
    done

    if [[ "${OPT_DRY_RUN}" == true ]]; then
        log_dry "No changes made (dry-run mode)"
        return
    fi

    if ! confirm "Remove these items?" "n"; then
        log_info "Uninstall cancelled."
        exit 0
    fi

    local removed_count=0
    for item in "${items_to_remove[@]}"; do
        if [[ -L "${item}" ]]; then
            rm -f "${item}"
        elif [[ -d "${item}" ]]; then
            rm -rf "${item}"
        elif [[ -f "${item}" ]]; then
            rm -f "${item}"
        fi
        removed_count=$(( removed_count + 1 ))
        log_to_file "REMOVE: ${item}"
    done

    rm -f "${marker_path}"
    log_to_file "REMOVE: ${marker_path}"

    printf "\n"
    log_success "Removed ${BOLD}${removed_count}${RESET} items."
    log_info "Your opencode.json and personal agents were preserved."
}

# ---------------------------------------------------------------------------
# Configure shell profile for global/fresh install
# ---------------------------------------------------------------------------
configure_shell_profile() {
    local config_path="$1"
    local shell_name rc_file

    shell_name="$(basename "${SHELL:-/bin/bash}")"
    case "${shell_name}" in
        zsh)  rc_file="${HOME}/.zshrc" ;;
        fish) rc_file="${HOME}/.config/fish/config.fish" ;;
        *)    rc_file="${HOME}/.bashrc" ;;
    esac

    log_info "Detected shell: ${BOLD}${shell_name}${RESET} → ${rc_file}"

    local line_to_add
    if [[ "${shell_name}" == "fish" ]]; then
        line_to_add="set -gx OPENCODE_CONFIG_DIR \"${config_path}\""
    else
        line_to_add="export OPENCODE_CONFIG_DIR=\"${config_path}\""
    fi

    if [[ "${OPT_DRY_RUN}" == true ]]; then
        log_dry "Would add to ${rc_file}: ${line_to_add}"
        return
    fi

    if confirm "Add OPENCODE_CONFIG_DIR to ${rc_file}?"; then
        if [[ -f "${rc_file}" ]] && grep -qF "OPENCODE_CONFIG_DIR" "${rc_file}"; then
            log_warn "OPENCODE_CONFIG_DIR already present in ${rc_file}. Skipping."
        else
            mkdir -p "$(dirname "${rc_file}")"
            printf '\n# OpenCode Template Agents\n%s\n' "${line_to_add}" >> "${rc_file}"
            log_success "Added to ${rc_file}"
            log_to_file "Added OPENCODE_CONFIG_DIR to ${rc_file}"
        fi
        log_info "Run ${BOLD}source ${rc_file}${RESET} or restart your terminal to activate."
    else
        log_info "You can manually add this to your shell config:"
        printf "  %s\n" "${line_to_add}"
    fi
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
    setup_colors
    parse_args "$@"

    printf '\n'
    printf '  %sOpenCode Template Agents%s — Installer v%s\n' "${BOLD}" "${RESET}" "${VERSION}"
    printf '  %sSpecialized AI agents for OpenCode%s\n' "${DIM}" "${RESET}"
    printf '\n'

    if [[ "${OPT_DRY_RUN}" == true ]]; then
        log_warn "DRY-RUN mode — no changes will be made"
        printf "\n"
    fi

    # Determine target directory
    local target_dir
    if [[ -n "${OPT_DIR}" ]]; then
        target_dir="${OPT_DIR}"
    else
        target_dir="$(pwd)"
    fi

    # Resolve to absolute path
    if [[ -d "${target_dir}" ]]; then
        target_dir="$(cd "${target_dir}" && pwd)"
    else
        log_error "Target directory does not exist: ${target_dir}"
        exit 1
    fi

    # Get source directory (repo location)
    local source_dir
    source_dir="$(get_source_dir)"

    # Detect configuration
    local detection
    detection="$(detect_config "${target_dir}")"
    local config_type="${detection%%|*}"
    local config_path="${detection#*|}"

    log_info "Configuration: ${BOLD}${config_type}${RESET}"
    if [[ -n "${config_path}" ]]; then
        log_info "Config path:   ${BOLD}${config_path}${RESET}"
    fi

    # Route to appropriate handler
    case "${config_type}" in
        none)
            if [[ "${OPT_UNINSTALL}" == true ]]; then
                log_error "No OpenCode configuration found. Nothing to uninstall."
                exit 1
            fi
            install_fresh "${source_dir}"
            ;;
        local_existing)
            if [[ "${OPT_UNINSTALL}" == true ]]; then
                do_uninstall "${config_path}"
            else
                install_merge "${source_dir}" "${config_path}"
            fi
            ;;
        global_existing)
            if [[ "${OPT_UNINSTALL}" == true ]]; then
                do_uninstall "${config_path}"
            else
                install_merge "${source_dir}" "${config_path}"
            fi
            ;;
        global_fresh)
            if [[ "${OPT_UNINSTALL}" == true ]]; then
                log_error "No existing installation found. Nothing to uninstall."
                exit 1
            fi
            # Create the directory structure and merge into it
            if [[ "${OPT_DRY_RUN}" == true ]]; then
                log_dry "Would create: ${config_path}"
            else
                mkdir -p "${config_path}"
            fi
            install_merge "${source_dir}" "${config_path}"
            configure_shell_profile "${config_path}"
            ;;
    esac

    log_to_file "Install completed. Type=${config_type}, Target=${config_path:-none}"
    printf "\n"
}

main "$@"
