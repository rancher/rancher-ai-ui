#!/bin/sh

# Screenshot collection script - moves all png files from source directory to output directory
# Usage: sh scripts/collect-screenshots.sh [sourceDir] [outputDir]
# Example: sh scripts/collect-screenshots.sh cypress/e2e/tests/global-ui/screenshots cypress/collected-screenshots

SOURCE_DIR="$1"
OUTPUT_DIR="$2"

[ -z "$SOURCE_DIR" ] && { echo "Usage: sh $0 [sourceDir] [outputDir]"; exit 1; }
[ -z "$OUTPUT_DIR" ] && { echo "Usage: sh $0 [sourceDir] [outputDir]"; exit 1; }

# Create or empty output directory
rm -rf "$OUTPUT_DIR"/* 2>/dev/null
mkdir -p "$OUTPUT_DIR" || { echo "❌ Failed to create output directory"; exit 1; }

# Move all png files from all source directories to output directory, exclude files with "fail" in the name
find "$SOURCE_DIR" -type f -name "*.png" ! -name "*fail*" -exec mv {} "$OUTPUT_DIR"/ \; || { echo "❌ Failed to move screenshots"; exit 1; }

# Print number of screenshots moved and size
count=$(ls -1 "$OUTPUT_DIR"/*.png 2>/dev/null | wc -l)
size=$(du -sh "$OUTPUT_DIR" 2>/dev/null | cut -f1)

echo ""
echo "✅ Collected $count screenshots ($size) to './$OUTPUT_DIR'"
echo ""
