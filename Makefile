# My Pet Care - Makefile
# Quick commands for common tasks

.PHONY: help dev staging prod clean preview build deploy test analyze format

# Default target
help:
	@echo "My Pet Care - Available Commands:"
	@echo ""
	@echo "  make dev        - Build and deploy for development"
	@echo "  make staging    - Build and deploy for staging"
	@echo "  make prod       - Build and deploy for production"
	@echo "  make build      - Build only (no deploy)"
	@echo "  make preview    - Start local preview server"
	@echo "  make clean      - Clean build artifacts"
	@echo "  make test       - Run tests"
	@echo "  make analyze    - Run flutter analyze"
	@echo "  make format     - Format code"
	@echo "  make deploy     - Deploy to Firebase (requires build first)"
	@echo ""

# Development build + deploy
dev:
	@echo "🚀 Building for development..."
	@./build_and_deploy.sh dev

# Staging build + deploy
staging:
	@echo "🚀 Building for staging..."
	@./build_and_deploy.sh staging

# Production build + deploy
prod:
	@echo "🚀 Building for production..."
	@./build_and_deploy.sh production

# Build only (no deploy)
build:
	@echo "🏗️  Building web app..."
	@flutter clean
	@flutter pub get
	@flutter build web --release \
		--dart-define=API_BASE_URL=$${API_BASE_URL:-http://localhost:8080} \
		--dart-define=MAPS_API_KEY=$${MAPS_API_KEY:-} \
		--dart-define=STRIPE_PUBLISHABLE_KEY=$${STRIPE_PUBLISHABLE_KEY:-} \
		--dart-define=PAYPAL_CLIENT_ID=$${PAYPAL_CLIENT_ID:-}
	@echo "✅ Build completed"

# Start local preview server
preview:
	@echo "🌐 Starting preview server on http://localhost:5060..."
	@lsof -ti:5060 | xargs -r kill -9 2>/dev/null || true
	@sleep 2
	@cd build/web && python3 -m http.server 5060 --bind 0.0.0.0 &
	@sleep 2
	@echo "✅ Preview server running at http://localhost:5060"

# Clean build artifacts
clean:
	@echo "🧹 Cleaning project..."
	@flutter clean
	@rm -rf build/
	@echo "✅ Clean completed"

# Run tests
test:
	@echo "🧪 Running tests..."
	@flutter test

# Run flutter analyze
analyze:
	@echo "🔍 Running flutter analyze..."
	@flutter analyze

# Format code
format:
	@echo "✨ Formatting code..."
	@dart format lib/

# Deploy to Firebase (requires existing build)
deploy:
	@echo "🚀 Deploying to Firebase..."
	@if [ ! -d "build/web" ]; then \
		echo "❌ Error: No build found. Run 'make build' first"; \
		exit 1; \
	fi
	@firebase deploy --only hosting
	@echo "✅ Deploy completed"

# Quick rebuild and restart local server
restart:
	@echo "🔄 Restarting local preview..."
	@lsof -ti:5060 | xargs -r kill -9 2>/dev/null || true
	@flutter build web --release
	@cd build/web && python3 -m http.server 5060 --bind 0.0.0.0 &
	@sleep 2
	@echo "✅ Preview server restarted at http://localhost:5060"
