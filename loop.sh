#!/usr/bin/env bash
#
# Morpheus UX Loop - The Ralph Wiggum Technique
# An agentic loop for continuous UX/frontend improvements with visual testing
#
# Usage:
#   ./loop.sh              # Run in build mode (default)
#   ./loop.sh plan         # Run in planning mode
#   ./loop.sh build        # Run in build mode
#   ./loop.sh visual       # Run visual regression tests only
#   ./loop.sh --max 5      # Run max 5 iterations
#
# Environment variables:
#   LOOP_MAX_ITERATIONS    - Maximum iterations (default: unlimited)
#   LOOP_AUTO_PUSH         - Auto push after each iteration (default: true)
#   LOOP_VISUAL_BASELINE   - Update visual baselines (default: false)
#   CLAUDE_FLAGS           - Additional flags for Claude CLI
#

set -euo pipefail

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly CYAN='\033[0;36m'
readonly MAGENTA='\033[0;35m'
readonly NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE="${1:-build}"
MAX_ITERATIONS="${LOOP_MAX_ITERATIONS:-0}"
AUTO_PUSH="${LOOP_AUTO_PUSH:-true}"
VISUAL_BASELINE="${LOOP_VISUAL_BASELINE:-false}"
ITERATION=0

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        plan|build|visual)
            MODE="$1"
            shift
            ;;
        --max)
            MAX_ITERATIONS="$2"
            shift 2
            ;;
        --no-push)
            AUTO_PUSH="false"
            shift
            ;;
        --update-baseline)
            VISUAL_BASELINE="true"
            shift
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Banner
print_banner() {
    echo -e "${GREEN}"
    cat << 'EOF'
    __  ___                 __                   __    __  _  __
   /  |/  /___  _________  / /_  ___  __  ______/ /   / / | |/ /
  / /|_/ / __ \/ ___/ __ \/ __ \/ _ \/ / / / __  /   / /  |   /
 / /  / / /_/ / /  / /_/ / / / /  __/ /_/ / /_/ /   / /___/   |
/_/  /_/\____/_/  / .___/_/ /_/\___/\__,_/\__,_/   /_____/_/|_|
                 /_/
                      UX IMPROVEMENT LOOP
EOF
    echo -e "${NC}"
    echo -e "${CYAN}Mode: ${MAGENTA}${MODE}${NC}"
    echo -e "${CYAN}Max iterations: ${MAGENTA}${MAX_ITERATIONS:-∞}${NC}"
    echo -e "${CYAN}Auto push: ${MAGENTA}${AUTO_PUSH}${NC}"
    echo ""
}

# Log with timestamp
log() {
    local level="$1"
    local message="$2"
    local color="${NC}"

    case "$level" in
        INFO) color="${GREEN}" ;;
        WARN) color="${YELLOW}" ;;
        ERROR) color="${RED}" ;;
        ACTION) color="${CYAN}" ;;
    esac

    echo -e "${color}[$(date '+%Y-%m-%d %H:%M:%S')] [${level}] ${message}${NC}"
}

# Run visual regression tests
run_visual_tests() {
    log "ACTION" "Running Playwright visual regression tests..."

    cd "$SCRIPT_DIR/frontend"

    if [[ "$VISUAL_BASELINE" == "true" ]]; then
        log "INFO" "Updating visual baselines..."
        npx playwright test --update-snapshots visual/ 2>&1 || true
    else
        if ! npx playwright test visual/ 2>&1; then
            log "WARN" "Visual tests found differences - check screenshots"
            return 1
        fi
    fi

    log "INFO" "Visual tests passed"
    return 0
}

# Take fresh screenshots for analysis
capture_screenshots() {
    log "ACTION" "Capturing fresh screenshots for analysis..."

    cd "$SCRIPT_DIR/frontend"

    # Run screenshot capture script
    npx playwright test e2e/capture-screenshots.spec.ts --reporter=list 2>&1 || true

    log "INFO" "Screenshots captured in frontend/screenshots/"
}

# Run the planning phase
run_plan() {
    log "ACTION" "Starting planning phase - analyzing UX gaps..."

    # Capture current state screenshots
    capture_screenshots

    cd "$SCRIPT_DIR"

    # Run Claude with planning prompt
    cat PROMPT_plan.md | claude -p \
        --dangerously-skip-permissions \
        --output-format=stream-json \
        ${CLAUDE_FLAGS:-}

    log "INFO" "Planning phase complete - check IMPLEMENTATION_PLAN.md"
}

# Run the build phase
run_build() {
    log "ACTION" "Starting build phase - implementing UX improvements..."

    cd "$SCRIPT_DIR"

    # Run Claude with build prompt
    cat PROMPT_build.md | claude -p \
        --dangerously-skip-permissions \
        --output-format=stream-json \
        ${CLAUDE_FLAGS:-}

    # Run visual tests to validate changes
    if run_visual_tests; then
        log "INFO" "Build phase complete - visual tests passed"

        # Auto push if enabled
        if [[ "$AUTO_PUSH" == "true" ]]; then
            log "ACTION" "Pushing changes..."
            git push origin HEAD 2>&1 || log "WARN" "Push failed - will retry next iteration"
        fi
    else
        log "WARN" "Build phase complete but visual tests found differences"
    fi
}

# Main loop
main() {
    print_banner

    # Check prerequisites
    if ! command -v claude &> /dev/null; then
        log "ERROR" "Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code"
        exit 1
    fi

    if ! command -v npx &> /dev/null; then
        log "ERROR" "npx not found. Please install Node.js"
        exit 1
    fi

    # Visual-only mode
    if [[ "$MODE" == "visual" ]]; then
        run_visual_tests
        exit $?
    fi

    # Main agentic loop
    log "INFO" "Starting Morpheus UX Loop..."

    while true; do
        ITERATION=$((ITERATION + 1))

        echo ""
        log "INFO" "═══════════════════════════════════════════════════════════"
        log "INFO" "                    ITERATION $ITERATION"
        log "INFO" "═══════════════════════════════════════════════════════════"
        echo ""

        case "$MODE" in
            plan)
                run_plan
                ;;
            build)
                run_build
                ;;
        esac

        # Check iteration limit
        if [[ "$MAX_ITERATIONS" -gt 0 && "$ITERATION" -ge "$MAX_ITERATIONS" ]]; then
            log "INFO" "Reached max iterations ($MAX_ITERATIONS). Stopping."
            break
        fi

        # Brief pause between iterations
        log "INFO" "Waiting 5 seconds before next iteration..."
        sleep 5
    done

    log "INFO" "Morpheus UX Loop complete. Total iterations: $ITERATION"
}

# Trap for clean exit
trap 'log "WARN" "Loop interrupted. Exiting..."; exit 130' INT TERM

main
