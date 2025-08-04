#!/bin/bash

# Create simple SVG icons and convert to PNG using ImageMagick or similar
# For now, let's create simple colored squares as placeholders

# Create 16x16 icon
echo '<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg">
  <rect width="16" height="16" rx="3" fill="#4285f4"/>
  <circle cx="8" cy="8" r="3" fill="white"/>
  <circle cx="8" cy="6" r="1" fill="#34a853"/>
  <circle cx="6" cy="9" r="1" fill="#34a853"/>
  <circle cx="10" cy="9" r="1" fill="#34a853"/>
</svg>' > public/icons/icon16.svg

# Create 48x48 icon
echo '<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="8" fill="#4285f4"/>
  <rect x="12" y="12" width="24" height="24" rx="4" fill="white"/>
  <circle cx="24" cy="18" r="2" fill="#34a853"/>
  <circle cx="18" cy="26" r="2" fill="#34a853"/>
  <circle cx="30" cy="26" r="2" fill="#34a853"/>
  <line x1="24" y1="20" x2="18" y2="24" stroke="#34a853" stroke-width="1"/>
  <line x1="24" y1="20" x2="30" y2="24" stroke="#34a853" stroke-width="1"/>
  <line x1="18" y1="24" x2="30" y2="24" stroke="#34a853" stroke-width="1"/>
</svg>' > public/icons/icon48.svg

# Create 128x128 icon
echo '<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" rx="20" fill="#4285f4"/>
  <rect x="32" y="32" width="64" height="64" rx="8" fill="white"/>
  <circle cx="64" cy="48" r="4" fill="#34a853"/>
  <circle cx="48" cy="72" r="4" fill="#34a853"/>
  <circle cx="80" cy="72" r="4" fill="#34a853"/>
  <line x1="64" y1="52" x2="48" y2="68" stroke="#34a853" stroke-width="2"/>
  <line x1="64" y1="52" x2="80" y2="68" stroke="#34a853" stroke-width="2"/>
  <line x1="48" y1="68" x2="80" y2="68" stroke="#34a853" stroke-width="2"/>
</svg>' > public/icons/icon128.svg

echo "SVG icons created successfully!"
