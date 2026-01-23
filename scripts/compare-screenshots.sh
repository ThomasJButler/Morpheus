#!/usr/bin/env bash
#
# Screenshot Comparison Utility
# Compares before/after screenshots and generates a visual diff report
#
# Usage:
#   ./scripts/compare-screenshots.sh before/ after/
#   ./scripts/compare-screenshots.sh  # Uses default directories
#

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

BEFORE_DIR="${1:-$PROJECT_ROOT/frontend/screenshots/before}"
AFTER_DIR="${2:-$PROJECT_ROOT/frontend/screenshots/after}"
DIFF_DIR="$PROJECT_ROOT/frontend/screenshots/diff"
REPORT_FILE="$PROJECT_ROOT/frontend/screenshots/comparison-report.md"

log() {
    echo -e "${CYAN}[$(date '+%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if ImageMagick is installed
check_dependencies() {
    if ! command -v compare &> /dev/null; then
        error "ImageMagick is required but not installed."
        echo "Install with: brew install imagemagick (macOS) or apt install imagemagick (Ubuntu)"
        exit 1
    fi
}

# Create diff images
create_diff() {
    local before="$1"
    local after="$2"
    local filename=$(basename "$before")
    local diff_file="$DIFF_DIR/${filename%.png}-diff.png"

    if [[ -f "$after" ]]; then
        # Create diff image (red highlights differences)
        compare -fuzz 5% -compose src -highlight-color red -lowlight-color none \
            "$before" "$after" "$diff_file" 2>/dev/null || true

        # Get pixel difference count
        local diff_pixels=$(compare -metric AE "$before" "$after" null: 2>&1 || echo "0")

        echo "$filename|$diff_pixels"
    else
        echo "$filename|MISSING"
    fi
}

# Generate markdown report
generate_report() {
    cat > "$REPORT_FILE" << 'EOF'
# Screenshot Comparison Report

Generated: $(date)

## Summary

| Screenshot | Status | Diff Pixels |
|------------|--------|-------------|
EOF

    local total=0
    local changed=0
    local missing=0

    for before_file in "$BEFORE_DIR"/*.png; do
        if [[ -f "$before_file" ]]; then
            local result=$(create_diff "$before_file" "$AFTER_DIR/$(basename "$before_file")")
            local filename=$(echo "$result" | cut -d'|' -f1)
            local diff=$(echo "$result" | cut -d'|' -f2)

            total=$((total + 1))

            if [[ "$diff" == "MISSING" ]]; then
                echo "| $filename | ⚠️ Missing | - |" >> "$REPORT_FILE"
                missing=$((missing + 1))
            elif [[ "$diff" -gt 100 ]]; then
                echo "| $filename | ❌ Changed | $diff |" >> "$REPORT_FILE"
                changed=$((changed + 1))
            else
                echo "| $filename | ✅ OK | $diff |" >> "$REPORT_FILE"
            fi
        fi
    done

    cat >> "$REPORT_FILE" << EOF

## Statistics

- **Total screenshots**: $total
- **Changed**: $changed
- **Missing**: $missing
- **Unchanged**: $((total - changed - missing))

## Diff Images

Diff images are saved in \`frontend/screenshots/diff/\`
Red highlights show areas that changed.
EOF

    log "Report generated: $REPORT_FILE"
    log "Changed: $changed / $total screenshots"
}

main() {
    check_dependencies

    log "Comparing screenshots..."
    log "Before: $BEFORE_DIR"
    log "After: $AFTER_DIR"

    # Create diff directory
    mkdir -p "$DIFF_DIR"

    if [[ ! -d "$BEFORE_DIR" ]]; then
        error "Before directory not found: $BEFORE_DIR"
        exit 1
    fi

    if [[ ! -d "$AFTER_DIR" ]]; then
        error "After directory not found: $AFTER_DIR"
        exit 1
    fi

    generate_report

    log "Done! Check the report at: $REPORT_FILE"
}

main
