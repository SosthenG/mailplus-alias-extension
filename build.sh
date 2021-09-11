#!/bin/bash

# Create build directory
rm -rf ./build 2> /dev/null
mkdir ./build

# Copy
cp ./background.* ./build/
cp ./client.js ./build/client.js
cp ./icon.png ./build/icon.png
cp ./manifest.json ./build/manifest.json
cp -R ./popup ./build/popup

# Minify js & css
./minify.sh ./build/popup/init/init.js
./minify.sh ./build/popup/main/main.js
./minify.sh ./build/popup/popup.js
./minify.sh ./build/client.js
./minify.sh ./build/background.js
./minify.sh ./build/popup/pico.css
./minify.sh ./build/popup/popup.css

# Zip the build
rm ./build.zip 2> /dev/null
cd ./build
zip -r ../build.zip ./*

# Delete build directory
cd ../
rm -rf ./build 2> /dev/null

# Zip the source (for Firefox extension validation)
rm ./source.zip 2> /dev/null
zip -r ./source.zip ./* -x .idea -x .gitignore -x .git -x build.zip