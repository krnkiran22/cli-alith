#!/bin/bash

# Publish script for create-alith-app

echo "🚀 Publishing create-alith-app to npm..."

# Check if logged into npm
if ! npm whoami > /dev/null 2>&1; then
    echo "❌ You're not logged into npm. Please run 'npm login' first."
    exit 1
fi

echo "📋 Current npm user: $(npm whoami)"

# Build and test the package
echo "🔍 Testing package..."
npm test

# Check if package name is available
echo "🔍 Checking if package name is available..."
if npm view create-alith-app > /dev/null 2>&1; then
    echo "⚠️  Package 'create-alith-app' already exists. You may need to use a different name."
    echo "Suggested alternatives:"
    echo "  - @your-username/create-alith-app"
    echo "  - create-alith-ai-app"
    echo "  - create-alith-chat"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Publish to npm
echo "📦 Publishing to npm..."
npm publish

if [ $? -eq 0 ]; then
    echo "✅ Successfully published create-alith-app!"
    echo ""
    echo "🎉 Users can now create Alith apps with:"
    echo "   npx create-alith-app my-app"
    echo ""
    echo "🔗 View on npm: https://www.npmjs.com/package/create-alith-app"
else
    echo "❌ Failed to publish package"
    exit 1
fi
