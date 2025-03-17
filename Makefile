# ----------------------------------------------------------------------------
# AMUREX Makefile (Clone a Second Copy of the Frontend)
# ----------------------------------------------------------------------------
# GOAL:
#  - Never move or delete your current local folder.
#  - Instead, create amurex-hosting/ in the parent directory.
#  - Clone a fresh copy of the same frontend remote into amurex-hosting/amurex.
#  - Also clone amurex-backend + amurex-web, side by side.
#  - Provide 'configure' etc. that operate on the new copy.
#
# RESULT:
#   <parentFolder>/
#       [Your original local folder, unchanged]
#       amurex-hosting/
#          ├── amurex         (new clone of the same front-end repo)
#          ├── amurex-backend (cloned)
#          └── amurex-web     (cloned)
# ----------------------------------------------------------------------------

# ----------------------------------------------------------------------------
# Git Repos
# ----------------------------------------------------------------------------

# The same remote you used originally for the front-end
FRONTEND_REPO := git@github.com:thepersonalaicompany/amurex.git

# The backend and web repos
BACKEND_REPO  := https://github.com/thepersonalaicompany/amurex-backend.git
WEB_REPO      := git@github.com:thepersonalaicompany/amurex-web.git

# ----------------------------------------------------------------------------
# Where to place them
# ----------------------------------------------------------------------------

# The absolute path to your current directory
CURRENT_DIR   := $(abspath $(CURDIR))

# Parent directory of your current folder
PARENT_DIR    := $(dir $(CURRENT_DIR:%/=%))

# We'll create (or reuse) amurex-hosting in that parent
HOSTING_DIR   := $(abspath $(PARENT_DIR)/amurex-hosting)

# The three subfolders inside amurex-hosting
FRONTEND_DIR  := $(abspath $(HOSTING_DIR)/amurex)
BACKEND_DIR   := $(abspath $(HOSTING_DIR)/amurex-backend)
WEB_DIR       := $(abspath $(HOSTING_DIR)/amurex-web)

# ----------------------------------------------------------------------------
# Frontend Configuration Variables
# (Override at the command line: e.g. `make configure BACKEND_URL=...`)
# ----------------------------------------------------------------------------
BACKEND_URL   ?= http://localhost:8080
WEB_URL       ?= http://localhost:3000
ANALYTICS     ?= true

# ----------------------------------------------------------------------------
# Phony Targets
# ----------------------------------------------------------------------------
.PHONY: all setup clone-frontend clone-backend clone-web \
        update-backend update-web update-frontend configure \
        create-project-makefile help

# Default
all: setup configure

# ----------------------------------------------------------------------------
# Setup: create amurex-hosting & clone all three repos if missing
# ----------------------------------------------------------------------------
setup: clone-frontend clone-backend clone-web
	@echo "---------------------------------------------------------"
	@echo "[setup] Done. Repos now in $(HOSTING_DIR):"
	@echo "  - amurex         (frontend)"
	@echo "  - amurex-backend"
	@echo "  - amurex-web"
	@echo ""
	@echo "[setup] Original folder is still at:"
	@echo "  $(CURRENT_DIR)"
	@echo "No changes were made to it. You now have two copies of the frontend."
	@echo "---------------------------------------------------------"

# Clone the frontend from FRONTEND_REPO to amurex-hosting/amurex
clone-frontend:
	@mkdir -p "$(HOSTING_DIR)"
	@if [ ! -d "$(FRONTEND_DIR)" ]; then \
	  echo "[clone-frontend] Cloning from $(FRONTEND_REPO) into $(FRONTEND_DIR)..."; \
	  git clone "$(FRONTEND_REPO)" "$(FRONTEND_DIR)"; \
	else \
	  echo "[clone-frontend] Already exists: $(FRONTEND_DIR). Nothing to do."; \
	fi

# Clone the backend
clone-backend:
	@mkdir -p "$(HOSTING_DIR)"
	@if [ ! -d "$(BACKEND_DIR)" ]; then \
	  echo "[clone-backend] Cloning from $(BACKEND_REPO) into $(BACKEND_DIR)..."; \
	  git clone "$(BACKEND_REPO)" "$(BACKEND_DIR)"; \
	else \
	  echo "[clone-backend] Already exists: $(BACKEND_DIR). Nothing to do."; \
	fi

# Clone the web repo
clone-web:
	@mkdir -p "$(HOSTING_DIR)"
	@if [ ! -d "$(WEB_DIR)" ]; then \
	  echo "[clone-web] Cloning from $(WEB_REPO) into $(WEB_DIR)..."; \
	  git clone "$(WEB_REPO)" "$(WEB_DIR)"; \
	else \
	  echo "[clone-web] Already exists: $(WEB_DIR). Nothing to do."; \
	fi

# ----------------------------------------------------------------------------
# Update Targets
# ----------------------------------------------------------------------------
update-frontend:
	@if [ -d "$(FRONTEND_DIR)" ]; then \
	  echo "[update-frontend] Pulling latest in $(FRONTEND_DIR)..."; \
	  cd "$(FRONTEND_DIR)" && git pull; \
	else \
	  echo "[update-frontend] The fresh clone doesn't exist. Try 'make setup' first."; \
	fi

update-backend:
	@if [ -d "$(BACKEND_DIR)" ]; then \
	  echo "[update-backend] Pulling latest in $(BACKEND_DIR)..."; \
	  cd "$(BACKEND_DIR)" && git pull; \
	else \
	  echo "[update-backend] Not found. Try 'make setup' first."; \
	fi

update-web:
	@if [ -d "$(WEB_DIR)" ]; then \
	  echo "[update-web] Pulling latest in $(WEB_DIR)..."; \
	  cd "$(WEB_DIR)" && git pull; \
	else \
	  echo "[update-web] Not found. Try 'make setup' first."; \
	fi

# ----------------------------------------------------------------------------
# Configure the "fresh-clone" Frontend
# ----------------------------------------------------------------------------
configure:
	@echo "[configure] Generating extension/config.js in $(FRONTEND_DIR)/extension..."
	@if [ ! -d "$(FRONTEND_DIR)" ]; then \
	  echo "[configure] The fresh clone doesn't exist. Did you run 'make setup' yet?"; \
	  exit 1; \
	fi
	@mkdir -p "$(FRONTEND_DIR)/extension"
	@echo "const AMUREX_CONFIG = {" > "$(FRONTEND_DIR)/extension/config.js"
	@echo "  BASE_URL_BACKEND: \"$(BACKEND_URL)\"," >> "$(FRONTEND_DIR)/extension/config.js"
	@echo "  BASE_URL_WEB: \"$(WEB_URL)\"," >> "$(FRONTEND_DIR)/extension/config.js"
	@echo "  ANALYTICS_ENABLED: $(ANALYTICS)" >> "$(FRONTEND_DIR)/extension/config.js"
	@echo "};" >> "$(FRONTEND_DIR)/extension/config.js"
	@echo "window.AMUREX_CONFIG = AMUREX_CONFIG;" >> "$(FRONTEND_DIR)/extension/config.js"
	@echo "[configure] config.js created at $(FRONTEND_DIR)/extension/config.js."

	@if [ -f "$(FRONTEND_DIR)/extension/background.js" ]; then \
	  echo "[configure] Updating background.js..."; \
	  sed -i'.bak' '1,5s|BASE_URL_BACKEND:.*|BASE_URL_BACKEND: "$(BACKEND_URL)",|' \
	    "$(FRONTEND_DIR)/extension/background.js"; \
	  sed -i'.bak' '1,5s|BASE_URL_WEB:.*|BASE_URL_WEB: "$(WEB_URL)",|' \
	    "$(FRONTEND_DIR)/extension/background.js"; \
	  sed -i'.bak' '1,5s|ANALYTICS_ENABLED:.*|ANALYTICS_ENABLED: $(ANALYTICS)|' \
	    "$(FRONTEND_DIR)/extension/background.js"; \
	  rm -f "$(FRONTEND_DIR)/extension/background.js.bak"; \
	  echo "[configure] background.js updated."; \
	else \
	  echo "[configure] No background.js found in $(FRONTEND_DIR)/extension/."; \
	fi
	@echo "[configure] Done configuring the fresh clone of the frontend."

# ----------------------------------------------------------------------------
# Create a Parent-Level Makefile (Optional)
# ----------------------------------------------------------------------------
create-project-makefile:
	@echo "[create-project-makefile] Creating top-level Makefile in $(HOSTING_DIR)..."
	@echo "# Top-level Makefile to manage amurex (fresh clone), amurex-backend, amurex-web" \
	  > "$(HOSTING_DIR)/Makefile"
	@echo ".PHONY: all update start stop configure" >> "$(HOSTING_DIR)/Makefile"
	@echo "" >> "$(HOSTING_DIR)/Makefile"
	@echo "all: update" >> "$(HOSTING_DIR)/Makefile"
	@echo "" >> "$(HOSTING_DIR)/Makefile"
	@echo "# Update all repos" >> "$(HOSTING_DIR)/Makefile"
	@echo "update:" >> "$(HOSTING_DIR)/Makefile"
	@echo "	@echo \"Updating amurex (fresh clone)...\"" >> "$(HOSTING_DIR)/Makefile"
	@echo "	cd amurex && git pull || echo \"[!] amurex update failed\"" >> "$(HOSTING_DIR)/Makefile"
	@echo "	@echo \"Updating amurex-backend...\"" >> "$(HOSTING_DIR)/Makefile"
	@echo "	cd amurex-backend && git pull || echo \"[!] amurex-backend update failed\"" >> "$(HOSTING_DIR)/Makefile"
	@echo "	@echo \"Updating amurex-web...\"" >> "$(HOSTING_DIR)/Makefile"
	@echo "	cd amurex-web && git pull || echo \"[!] amurex-web update failed\"" >> "$(HOSTING_DIR)/Makefile"
	@echo "" >> "$(HOSTING_DIR)/Makefile"
	@echo "# Start both (customize commands as needed)" >> "$(HOSTING_DIR)/Makefile"
	@echo "start:" >> "$(HOSTING_DIR)/Makefile"
	@echo "	@echo \"Starting amurex-backend...\"" >> "$(HOSTING_DIR)/Makefile"
	@echo "	cd amurex-backend && make start || echo \"[!] amurex-backend start failed\"" >> "$(HOSTING_DIR)/Makefile"
	@echo "	@echo \"Starting amurex frontend...\"" >> "$(HOSTING_DIR)/Makefile"
	@echo "	cd amurex && make start || echo \"[!] amurex start failed\"" >> "$(HOSTING_DIR)/Makefile"
	@echo "	@echo \"Starting amurex-web...\"" >> "$(HOSTING_DIR)/Makefile"
	@echo "	cd amurex-web && make start || echo \"[!] amurex-web start failed\"" >> "$(HOSTING_DIR)/Makefile"
	@echo "" >> "$(HOSTING_DIR)/Makefile"
	@echo "# Stop both (customize commands as needed)" >> "$(HOSTING_DIR)/Makefile"
	@echo "stop:" >> "$(HOSTING_DIR)/Makefile"
	@echo "	@echo \"Stopping amurex frontend...\"" >> "$(HOSTING_DIR)/Makefile"
	@echo "	cd amurex && make stop || echo \"[!] amurex stop failed\"" >> "$(HOSTING_DIR)/Makefile"
	@echo "	@echo \"Stopping amurex-backend...\"" >> "$(HOSTING_DIR)/Makefile"
	@echo "	cd amurex-backend && make stop || echo \"[!] amurex-backend stop failed\"" >> "$(HOSTING_DIR)/Makefile"
	@echo "	@echo \"Stopping amurex-web...\"" >> "$(HOSTING_DIR)/Makefile"
	@echo "	cd amurex-web && make stop || echo \"[!] amurex-web stop failed\"" >> "$(HOSTING_DIR)/Makefile"
	@echo "" >> "$(HOSTING_DIR)/Makefile"
	@echo "# Configure the fresh-clone frontend" >> "$(HOSTING_DIR)/Makefile"
	@echo "configure:" >> "$(HOSTING_DIR)/Makefile"
	@echo "	cd amurex && make configure" >> "$(HOSTING_DIR)/Makefile"

	@echo "[create-project-makefile] Done! The parent Makefile is at: $(HOSTING_DIR)/Makefile"

# ----------------------------------------------------------------------------
# Help
# ----------------------------------------------------------------------------
help:
	@echo "--------------------------------------------------------------------"
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  setup        - Creates amurex-hosting if missing, clones a fresh copy of the"
	@echo "                 frontend into amurex-hosting/amurex, plus amurex-backend,"
	@echo "                 and amurex-web. Leaves your existing folder untouched."
	@echo ""
	@echo "  update-frontend, update-backend, update-web  - Pull latest changes"
	@echo "  configure    - Generate extension/config.js & update background.js in the"
	@echo "                 freshly cloned amurex-hosting/amurex"
	@echo "  create-project-makefile - Creates a top-level Makefile in amurex-hosting"
	@echo ""
	@echo "After 'make setup', the final structure is exactly:"
	@echo "  $(HOSTING_DIR)/"
	@echo "    amurex/         (fresh clone of your front-end repo)"
	@echo "    amurex-backend/ (cloned backend)"
	@echo "    amurex-web/     (cloned web/integrations)"
	@echo ""
	@echo "Meanwhile, your original local folder remains at:"
	@echo "  $(CURRENT_DIR)"
	@echo "You can continue using it, or switch to the new copy."
	@echo ""
	@echo "Config variables for 'make configure':"
	@echo "  BACKEND_URL   (default: http://localhost:8080)"
	@echo "  WEB_URL       (default: http://localhost:3000)"
	@echo "  ANALYTICS     (default: true)"
	@echo ""
	@echo "Example: make configure BACKEND_URL=https://api.example.com WEB_URL=https://myapp.example.com ANALYTICS=false"
	@echo "--------------------------------------------------------------------"
