#!/bin/bash
# Script to create placeholder icon files for the Thunderbird Jira Connector
# Run this script to generate simple colored squares as placeholder icons

# Create icon directory if it doesn't exist
mkdir -p icons

# Create placeholder files (you should replace these with actual icon images)
echo "Creating placeholder icon files..."

# Create empty PNG files as placeholders
touch icons/icon-16.png
touch icons/icon-32.png  
touch icons/icon-48.png
touch icons/icon-96.png

echo "Placeholder icon files created in icons/ directory"
echo "Please replace these with actual PNG icon files of the appropriate sizes:"
echo "  - icon-16.png  (16x16 pixels)"
echo "  - icon-32.png  (32x32 pixels)" 
echo "  - icon-48.png  (48x48 pixels)"
echo "  - icon-96.png  (96x96 pixels)"
echo ""
echo "Recommended: Create simple blue icons with a Jira 'J' or connector symbol"
